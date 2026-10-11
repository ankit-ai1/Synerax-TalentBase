import { z } from "zod";
import { botContext } from "@/lib/bot/server/context";
import { runBot } from "@/lib/bot/server/engine";
import { warmEmbeddings } from "@/lib/bot/server/embed";
import { MAX_CHARS } from "@/lib/bot/server/redact";
import { clientIp, rateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const body = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("start") }),
  z.object({ kind: z.literal("text"), text: z.string().max(MAX_CHARS * 2), recent: z.array(z.string().max(MAX_CHARS)).max(5).optional(), misses: z.number().int().min(0).max(10).optional() }),
  z.object({ kind: z.literal("tool"), tool: z.string().max(60), params: z.record(z.string(), z.unknown()).optional() }),
]);

/**
 * Role-aware assistant. Understanding: Gemini (free tier) or the free fallback.
 * Answers: our own templates over tools that run with the user's session (RLS). Never logs message text.
 */
export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Bad request" }, { status: 400 });
  const input = parsed.data;
  const ctx = await botContext();

  if (input.kind === "start") {
    warmEmbeddings();
  } else {
    const limited = ctx.userId ? rateLimited(`bot:u:${ctx.userId}`, 100, 3600e3) : rateLimited(`bot:ip:${clientIp(req)}`, 20, 3600e3);
    if (limited) return Response.json({ mode: ctx.mode, turns: [{ text: "You've sent a lot of messages — please try again in a little while.", tone: "error" }] });
    if (input.kind === "text" && input.text.length > MAX_CHARS) return Response.json({ mode: ctx.mode, turns: [{ text: `Please keep messages under ${MAX_CHARS} characters.`, tone: "error" }] });
  }

  const reply = await runBot(input, ctx);

  // keep the context for staff: store the exchange in the user's own chat thread (kind 'bot')
  if (input.kind === "text" && (ctx.mode === "candidate" || ctx.mode === "client")) {
    ctx.defer(async () => {
      const { data: thread } = await ctx.sb.rpc("chat_my_thread", { p_create: false });
      if (!thread) return;
      const items = [{ role: "user", body: input.text.slice(0, 1000) }, ...reply.turns.filter((t) => t.text).map((t) => ({ role: "bot", body: t.text }))];
      await ctx.sb.rpc("chat_log_bot", { p_conversation: thread, p_items: items });
    });
  }
  return Response.json(reply);
}
