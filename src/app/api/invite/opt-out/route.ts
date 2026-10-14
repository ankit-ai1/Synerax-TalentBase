import { createAdminClient } from "@/lib/supabase/server";
import { validOptOut } from "@/lib/candidates/invite";

export const runtime = "nodejs";

/** "I don't want an account" (confirmed on /invite/opt-out) → no more portal invites for this candidate */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const c = String(form?.get("c") ?? "");
  const s = String(form?.get("s") ?? "");
  const back = new URL("/invite/opt-out", req.url);
  if (!validOptOut(c, s)) {
    back.searchParams.set("error", "1");
    return Response.redirect(back, 303);
  }
  const admin = createAdminClient();
  await admin.from("candidates").update({ invite_opt_out: true }).eq("id", c);
  await admin.from("activity_logs").insert({ actor_id: null, action: "Opted out of portal invites", entity: "candidate", entity_id: c, candidate_id: c, details: {} });
  back.searchParams.set("done", "1");
  return Response.redirect(back, 303);
}
