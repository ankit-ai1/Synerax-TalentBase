import { createAdminClient } from "@/lib/supabase/server";

/** In-memory fallback (per server instance) — used only if the shared limiter is unreachable */
const buckets = new Map<string, number[]>();

function localLimited(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
  }
  return recent.length > max;
}

/**
 * Rate limit shared by every server instance (Supabase `rate_hit`, migration 020).
 * Falls back to the in-memory limiter if the database call fails, so a DB hiccup never blocks real users.
 */
export async function rateLimited(key: string, max: number, windowMs: number) {
  try {
    const { data, error } = await createAdminClient().rpc("rate_hit", { p_key: key, p_max: max, p_window_ms: windowMs });
    if (!error && typeof data === "boolean") return data;
  } catch {}
  return localLimited(key, max, windowMs);
}

export function clientIp(req: Request) {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}
