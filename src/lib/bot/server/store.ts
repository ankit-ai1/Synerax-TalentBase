import { createHash, randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { BotMode } from "../types";

/**
 * Server bookkeeping for the assistant: one-time action tokens, the public-answer cache, the daily
 * AI usage counter and unanswered questions. Uses the service role ONLY for these infra tables —
 * never to read user/business data (tools always use the user's own session).
 */
let admin: SupabaseClient | null = null;
const db = () =>
  (admin ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } }));

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
export const ACTION_TTL_MS = 10 * 60 * 1000;

export async function createPendingAction(a: { userId: string | null; mode: BotMode; tool: string; params: Record<string, unknown> }) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ACTION_TTL_MS).toISOString();
  const { error } = await db().from("bot_actions").insert({ token_hash: sha(token), user_id: a.userId, role: a.mode, tool: a.tool, params: a.params, expires_at: expiresAt });
  if (error) {
    console.error("bot_actions insert failed (has 006_bot.sql been run?):", error.message);
    throw new Error("VALIDATION: This action isn't available right now. Please try again later.");
  }
  return { token, expiresAt };
}

/** use a token once; returns the stored action or null (unknown / used / expired) */
export async function takePendingAction(token: string) {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  const { data, error } = await db().rpc("bot_action_take", { p_token_hash: sha(token) });
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as { user_id: string | null; role: BotMode; tool: string; params: Record<string, unknown> } | undefined;
  return row ?? null;
}

const CACHE_MS = 24 * 3600e3;
export const cacheKey = (mode: BotMode, question: string) => sha(`${mode}|${question.toLowerCase().replace(/\s+/g, " ").trim()}`);

export async function cacheGet<T>(key: string): Promise<T | null> {
  const { data } = await db().from("bot_cache").select("answer, created_at").eq("key", key).maybeSingle();
  if (!data || Date.now() - new Date(data.created_at).getTime() > CACHE_MS) return null;
  return data.answer as T;
}
export async function cacheSet(key: string, answer: unknown) {
  await db().from("bot_cache").upsert({ key, answer, created_at: new Date().toISOString() });
}

/** today's AI calls (IST day) */
export async function usageToday(provider = "gemini") {
  const day = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
  const { data } = await db().from("bot_usage").select("count").eq("day", day).eq("provider", provider).maybeSingle();
  return data?.count ?? 0;
}
export async function usageHit(provider = "gemini") {
  const { data } = await db().rpc("bot_usage_hit", { p_provider: provider });
  return typeof data === "number" ? data : 0;
}

export async function logUnanswered(question: string, mode: BotMode, userId: string | null) {
  const q = question.replace(/\s+/g, " ").trim().slice(0, 500);
  if (q.length < 2) return;
  const { error } = await db().from("bot_unanswered").insert({ question: q, audience: mode, user_id: userId });
  if (error) console.error("bot_unanswered insert failed", error.message);
}
