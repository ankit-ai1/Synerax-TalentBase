import { z } from "zod";
import { apiStaff } from "@/lib/auth";
import { inviteCandidates } from "@/lib/candidates/invite";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({ ids: z.array(z.string().uuid()).min(1).max(100) });

/** Admin / HR: send (or resend) portal invites to candidates staff added or imported. Returns a per-candidate summary. */
export async function POST(req: Request) {
  const a = await apiStaff();
  if ("error" in a) return a.error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Select up to 100 candidates" }, { status: 400 });
  const results = await inviteCandidates(parsed.data.ids, a.profile.id);
  return Response.json({
    results,
    invited: results.filter((r) => r.status === "invited").length,
    signin: results.filter((r) => r.status === "signin_link").length,
    skipped: results.filter((r) => r.status === "skipped").length,
  });
}
