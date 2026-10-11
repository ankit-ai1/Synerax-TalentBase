import "server-only";
import { after } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BOT_FAQ } from "@/data/bot-faq";
import type { BotAudience, BotFaq, BotMode } from "../types";
import type { BotCtx } from "./registry";

let faqCache: { at: number; list: BotFaq[] } | null = null;

/** built-in FAQs + admin-added ones (active only; cached 5 min) */
async function loadFaqs(sb: BotCtx["sb"]): Promise<BotFaq[]> {
  if (faqCache && Date.now() - faqCache.at < 5 * 60e3) return faqCache.list;
  const { data } = await sb.from("bot_faqs").select("id, question, answer, audience, keywords").eq("is_active", true).limit(300);
  const db: BotFaq[] = (data ?? []).map((f) => ({ id: `db-${f.id}`, q: f.question, a: f.answer, audience: (f.audience ?? []) as BotAudience[], keywords: f.keywords ?? [] }));
  faqCache = { at: Date.now(), list: [...db, ...BOT_FAQ] };
  return faqCache.list;
}

/** The bot MODE comes only from the server session — never from the URL, the client or the message. */
export async function botContext(): Promise<BotCtx> {
  const profile = await getCurrentProfile().catch(() => null);
  const role = profile?.is_active ? profile.role : null;
  const mode: BotMode = role === "admin" || role === "hr" || role === "candidate" || role === "client" ? role : "visitor";
  const sb = await createClient();
  return {
    mode,
    sb,
    userId: mode === "visitor" ? null : profile!.id,
    firstName: mode === "visitor" ? undefined : (profile?.full_name || "").split(" ")[0] || undefined,
    faqs: await loadFaqs(sb),
    defer: (fn) => after(async () => {
      try {
        await fn();
      } catch (e) {
        console.error("bot deferred task failed", e);
      }
    }),
  };
}
