import type { BotChip, BotMode, BotReply, BotRequest, BotTurn } from "../types";
import type { BotCtx, ToolDef } from "./registry";
import { allowedTool, toolsFor } from "./tools";
import { fallbackUnderstand, strip, type Understood } from "./fallback";
import { extractEntities } from "./entities";
import { publicKnowledge } from "./knowledge";
import { redact } from "./redact";
import { pick } from "./text";
import { cacheGet, cacheKey, cacheSet, createPendingAction, logUnanswered, takePendingAction, usageHit, usageToday } from "./store";
import { GeminiUnavailable, geminiConfigured, geminiUnderstand } from "../providers/gemini";
import { friendlyError } from "@/lib/utils";

/** user-facing message: our own validation texts as-is, anything unexpected stays in the server log */
function userError(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  if (/VALIDATION:|DUPLICATE:|Not allowed|row-level security|couldn't|Please|already|no longer/i.test(msg)) return friendlyError(msg);
  console.error("bot tool error:", msg);
  return "Something went wrong on our side. Please try again in a moment.";
}

/* ------------------------------------------------------------------ welcome */
const CHIPS: Record<BotMode, BotChip[]> = {
  visitor: [
    { label: "Find jobs", tool: "search_public_jobs" },
    { label: "Hire talent", tool: "create_lead" },
    { label: "How does it work?", send: "How does hiring with Synerax work?" },
    { label: "Contact", tool: "company_info", params: { topic: "contact" } },
  ],
  candidate: [
    { label: "My applications", tool: "my_applications" },
    { label: "Upcoming interviews", tool: "my_interviews" },
    { label: "Jobs for me", tool: "recommended_jobs" },
    { label: "Profile tips", tool: "my_profile_missing_fields" },
    { label: "Update notice / CTC", tool: "update_my_preferences" },
    { label: "Talk to a recruiter", tool: "request_callback" },
  ],
  client: [
    { label: "Pending decisions", tool: "pending_decisions" },
    { label: "My jobs", tool: "my_company_jobs" },
    { label: "Upcoming interviews", tool: "upcoming_interviews" },
    { label: "Post a job", tool: "post_job" },
    { label: "Message Synerax", tool: "message_synerax" },
  ],
  hr: [
    { label: "My day", tool: "daily_summary" },
    { label: "Today's interviews", tool: "todays_interviews" },
    { label: "My tasks", tool: "overdue_tasks" },
    { label: "Pending review", tool: "jobs_pending_review" },
    { label: "Awaiting clients", tool: "awaiting_client_decision" },
    { label: "Unread chats", tool: "unread_messages" },
  ],
  admin: [
    { label: "My day", tool: "daily_summary" },
    { label: "Team overview", tool: "team_overview" },
    { label: "Activity this week", tool: "activity_summary", params: { range: "week" } },
    { label: "Email log", tool: "email_log_summary" },
    { label: "Today's interviews", tool: "todays_interviews" },
    { label: "Pending review", tool: "jobs_pending_review" },
  ],
};
const WELCOME: Record<BotMode, string> = {
  visitor: "I'm the Synerax assistant. Ask me about open jobs, hiring with us, fees or anything else.",
  candidate: "I can check your applications and interviews, find jobs that fit you, update your notice period or CTC, and more.",
  client: "I can show profiles waiting for your decision, your jobs and interviews, post or close a job, or pass a message to your Synerax team.",
  hr: "Ask me about candidates, jobs, today's interviews, your tasks or anything waiting on clients.",
  admin: "Ask me about candidates, jobs, the team, activity or the e-mail log.",
};
export const welcome = (ctx: BotCtx): BotReply => ({
  mode: ctx.mode,
  provider: "none",
  turns: [{ text: `Hi${ctx.firstName ? ` ${ctx.firstName}` : ""}! ${WELCOME[ctx.mode]} What would you like to do?`, chips: CHIPS[ctx.mode] }],
});

/* ------------------------------------------------------------------ understanding */
const DAILY_LIMIT = () => Number(process.env.BOT_GEMINI_DAILY_LIMIT || 900);

/** Gemini first (if enabled, under quota, fast); otherwise the free fallback. Never throws. */
async function understand(cleaned: string, recent: string[], ctx: BotCtx): Promise<{ u: Understood; provider: "gemini" | "fallback" }> {
  if (geminiConfigured()) {
    const key = cacheKey(ctx.mode, cleaned);
    try {
      const cached = await cacheGet<Understood>(key).catch(() => null);
      if (cached) return { u: cached, provider: "gemini" };
      if ((await usageToday().catch(() => 0)) < DAILY_LIMIT()) {
        await usageHit().catch(() => 0);
        const u = await geminiUnderstand({ question: cleaned, recent, mode: ctx.mode, tools: toolsFor(ctx.mode), knowledge: publicKnowledge(ctx.mode, ctx.faqs) });
        // only cache context-free decisions (no earlier messages influenced them)
        if (!recent.length && u.kind !== "none") cacheSet(key, u).catch(() => {});
        return { u, provider: "gemini" };
      }
    } catch (e) {
      if (!(e instanceof GeminiUnavailable)) console.error("gemini", e);
      else if (e.reason !== "off" && e.reason !== "no_key") console.warn("gemini fallback:", e.reason);
    }
  }
  return { u: await fallbackUnderstand(cleaned, ctx.mode, ctx.faqs), provider: "fallback" };
}

/* ------------------------------------------------------------------ dispatch */
async function dispatch(tool: ToolDef, rawParams: Record<string, unknown>, ctx: BotCtx, cleanedText?: string): Promise<BotTurn[]> {
  let parsed = tool.params.safeParse(rawParams);
  if (!parsed.success && cleanedText && tool.extract) parsed = tool.params.safeParse({ ...strip(tool.extract(cleanedText, extractEntities(cleanedText))), ...strip(rawParams) });
  if (!parsed.success) parsed = tool.params.safeParse({});
  if (!parsed.success) return [{ text: "I need a bit more detail for that — could you rephrase?", chips: CHIPS[ctx.mode] }];
  const params = parsed.data;
  try {
    if (tool.kind === "read") return await tool.run(params, ctx);
    const prep = await tool.prepare(params, ctx);
    if ("turns" in prep) return prep.turns;
    const { token, expiresAt } = await createPendingAction({ userId: ctx.userId, mode: ctx.mode, tool: tool.name, params: prep.params });
    return [{ text: pick(["Please confirm:", "Just to be sure:", "Here's what will happen:"], tool.name), confirm: { token, expiresAt, ...prep.confirm } }];
  } catch (e) {
    return [{ text: userError(e), tone: "error" }];
  }
}

async function handoff(ctx: BotCtx, recent: string[]): Promise<BotTurn[]> {
  switch (ctx.mode) {
    case "visitor": {
      const lead = await dispatch(allowedTool("visitor", "create_lead")!, {}, ctx);
      return [{ text: "Let me connect you with our team.", chips: [{ label: "Contact details", tool: "company_info", params: { topic: "contact" } }] }, ...lead];
    }
    case "candidate": {
      const { data: thread } = await ctx.sb.rpc("chat_my_thread", { p_create: false });
      return [{ text: "Let me connect you with our team.", chips: [thread ? { label: "Message my recruiter", href: `/portal/messages?c=${thread}`, tone: "primary" } : { label: "Request a call back", tool: "request_callback", tone: "primary" }, { label: "Main menu", send: "menu" }] }];
    }
    case "client":
      return [{ text: "Let me connect you with your Synerax team.", chips: [{ label: "Talk to our team", tool: "message_synerax", params: recent.length ? { text: `From the assistant chat: ${recent.slice(-2).join(" / ")}` } : {}, tone: "primary" }, { label: "Main menu", send: "menu" }] }];
    default:
      return [{ text: "For anything else, ask a colleague in Messages.", link: { label: "Open Messages", href: "/messages" } }];
  }
}

/* ------------------------------------------------------------------ main */
export type EngineRequest = BotRequest & { misses?: number };

export async function runBot(req: EngineRequest, ctx: BotCtx): Promise<BotReply & { missed?: boolean }> {
  if (req.kind === "start") return welcome(ctx);

  if (req.kind === "tool") {
    const tool = allowedTool(ctx.mode, req.tool);
    if (!tool) return { mode: ctx.mode, provider: "none", turns: [{ text: "That isn't available here.", tone: "error", chips: CHIPS[ctx.mode] }] };
    return { mode: ctx.mode, provider: "none", turns: await dispatch(tool, (req.params ?? {}) as Record<string, unknown>, ctx) };
  }

  const cleaned = redact(req.text);
  const recent = (req.recent ?? []).slice(-3).map(redact).filter(Boolean);
  if (!cleaned) return { mode: ctx.mode, provider: "none", turns: [] };

  const { u, provider } = await understand(cleaned, recent, ctx);
  const miss = async (unsureText?: string): Promise<BotReply & { missed: boolean }> => {
    await logUnanswered(cleaned, ctx.mode, ctx.userId).catch(() => {});
    const second = (req.misses ?? 0) >= 1;
    const turns = second ? await handoff(ctx, recent) : [{ text: unsureText ?? pick(["Sorry, I didn't catch that. Could you say it another way, or pick an option?", "I'm not sure I understood. Try rephrasing, or choose one of these:"], cleaned), chips: CHIPS[ctx.mode] }];
    return { mode: ctx.mode, provider, missed: true, turns };
  };

  switch (u.kind) {
    case "smalltalk":
      if (u.intent === "handoff") return { mode: ctx.mode, provider, turns: await handoff(ctx, recent) };
      return {
        mode: ctx.mode,
        provider,
        turns: [{ text: u.intent === "greet" ? `Hello${ctx.firstName ? `, ${ctx.firstName}` : ""}! How can I help?` : u.intent === "thanks" ? "You're welcome! Anything else?" : u.intent === "bye" ? "Bye! I'm here whenever you need me." : "Here's what I can help with:", chips: CHIPS[ctx.mode] }],
      };
    case "faq":
      return { mode: ctx.mode, provider, turns: [{ text: u.faq.a, link: u.faq.link, chips: [{ label: "Main menu", send: "menu" }] }] };
    case "answer":
      if (u.unsure) return miss("I'm not sure about that — let me connect you with our team.");
      return { mode: ctx.mode, provider, turns: [{ text: u.text, chips: [{ label: "Main menu", send: "menu" }] }] };
    case "tool": {
      // the model can only pick from the role's list; anything else is refused here
      const tool = allowedTool(ctx.mode, u.tool);
      if (!tool) return { mode: ctx.mode, provider, missed: true, turns: [{ text: "I can't help with that here.", tone: "error", chips: CHIPS[ctx.mode] }] };
      const turns = await dispatch(tool, u.params, ctx, cleaned);
      if (!turns.length) return miss(); // e.g. get_faq without an answer
      return { mode: ctx.mode, provider, turns };
    }
    default:
      return miss();
  }
}

/* ------------------------------------------------------------------ confirmations */
/** the ONLY way an action executes: the user's click with a valid one-time token */
export async function confirmAction(token: string, cancel: boolean, ctx: BotCtx): Promise<BotReply> {
  const row = await takePendingAction(token).catch(() => null);
  if (!row) return { mode: ctx.mode, turns: [{ text: "This confirmation has expired or was already used. Please ask again.", tone: "error" }] };
  if (cancel) return { mode: ctx.mode, turns: [{ text: "Cancelled — nothing was changed.", chips: CHIPS[ctx.mode] }] };
  // re-check who is clicking: same user, same role, tool still allowed for that role
  if ((row.user_id ?? null) !== (ctx.userId ?? null) || row.role !== ctx.mode) return { mode: ctx.mode, turns: [{ text: "This confirmation belongs to a different session.", tone: "error" }] };
  const tool = allowedTool(ctx.mode, row.tool);
  if (!tool || tool.kind !== "action") return { mode: ctx.mode, turns: [{ text: "That action isn't available here.", tone: "error" }] };
  const parsed = tool.params.safeParse(row.params);
  if (!parsed.success) return { mode: ctx.mode, turns: [{ text: "Something about this action changed. Please ask again.", tone: "error" }] };
  try {
    return { mode: ctx.mode, turns: await tool.execute(parsed.data, ctx) };
  } catch (e) {
    return { mode: ctx.mode, turns: [{ text: userError(e), tone: "error", chips: CHIPS[ctx.mode] }] };
  }
}
