import { cronAuthorized } from "@/lib/alerts";
import { getEmailSettings } from "@/lib/email/send";
import { processQueue } from "@/lib/email/queue";
import { checkBounces } from "@/lib/email/bounces";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Email worker — every 10 minutes from GitHub Actions (.github/workflows/email-cron.yml; Vercel Hobby cron is daily only).
 * Sends due queued emails (retries with backoff, never past the provider limit), sends quota alerts, reads bounces.
 * Protected by CRON_SECRET.
 */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return new Response("Unauthorized", { status: 401 });
  const settings = await getEmailSettings();
  const queue = await processQueue(50, settings.sender_name).catch((e) => ({ error: e instanceof Error ? e.message : String(e) }));
  const bounces = await checkBounces().catch((e) => ({ error: e instanceof Error ? e.message : String(e) }));
  return Response.json({ ok: true, queue, bounces });
}
export const POST = GET;
