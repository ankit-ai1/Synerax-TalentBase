import { apiAdmin } from "@/lib/auth";
import { refreshRates } from "@/lib/fx";

export const runtime = "nodejs";

/** Admin: fetch today's exchange rates now and recompute the INR equivalents (the daily cron does this too) */
export async function POST() {
  const a = await apiAdmin();
  if ("error" in a) return a.error;
  const out = await refreshRates();
  return Response.json(out, { status: out.updated || !out.errors.length ? 200 : 502 });
}
