import { z } from "zod";
import { apiStaff } from "@/lib/auth";
import { inviteCandidates, inviteQueueNote, type SkipCode } from "@/lib/candidates/invite";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  /** manual = profile / bulk button · import / add = automatic invite for candidates just created */
  mode: z.enum(["manual", "import", "add"]).default("manual"),
});

/**
 * Admin / HR: send (or resend) portal invites. Returns a per-candidate result and a summary by reason.
 * Bulk and import invites are queued for the worker (steady rate, within the email quota); a single one goes now.
 */
export async function POST(req: Request) {
  const a = await apiStaff();
  if ("error" in a) return a.error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Select up to 100 candidates" }, { status: 400 });
  const { ids, mode } = parsed.data;
  const results = await inviteCandidates(ids, a.profile.id, { queueOnly: mode === "import" || ids.length > 3 });
  const skipped: Partial<Record<SkipCode, number>> = {};
  for (const r of results) if (r.status === "skipped") skipped[r.code] = (skipped[r.code] ?? 0) + 1;
  const queued = results.filter((r) => r.status !== "skipped" && r.queued).length;
  return Response.json({
    results,
    invited: results.filter((r) => r.status === "invited").length,
    signin: results.filter((r) => r.status === "signin_link").length,
    queued,
    skipped,
    note: await inviteQueueNote(queued),
  });
}
