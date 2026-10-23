import { timingSafeEqual } from "node:crypto";
import { apiStaff } from "@/lib/auth";
import { revalidateCareers } from "@/lib/careers-revalidate";

export const runtime = "nodejs";

const bearerOk = (req: Request) => {
  const secret = process.env.CRON_SECRET;
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!secret || !got || got.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(secret));
};

/**
 * A job changed → refresh the public careers page, /jobs pages and the sitemap now.
 * Staff (the app calls this after saves) or a Bearer CRON_SECRET (automation / database webhooks).
 */
export async function POST(req: Request) {
  if (!bearerOk(req)) {
    const a = await apiStaff();
    if ("error" in a) return a.error;
  }
  revalidateCareers();
  return Response.json({ ok: true });
}
