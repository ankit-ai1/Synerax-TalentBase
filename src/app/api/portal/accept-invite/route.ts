import { apiRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Candidate finished /auth/set-password: record consent (if not given before) and log it */
export async function POST(req: Request) {
  const a = await apiRole("candidate");
  if ("error" in a) return a.error;
  const body = (await req.json().catch(() => ({}))) as { consent?: boolean };
  const admin = createAdminClient();
  const { data: c } = await admin.from("candidates").select("id, consent_at").eq("user_id", a.profile.id).maybeSingle();
  if (!c) return Response.json({ error: "No profile is linked to this account. Please contact Synerax." }, { status: 404 });
  if (!c.consent_at && body.consent !== true) return Response.json({ error: "Please accept the consent to continue" }, { status: 400 });
  if (!c.consent_at) await admin.from("candidates").update({ consent_at: new Date().toISOString() }).eq("id", c.id);
  await admin.from("activity_logs").insert({ actor_id: a.profile.id, action: "Portal invite accepted", entity: "candidate", entity_id: c.id, candidate_id: c.id, details: {} });
  return Response.json({ ok: true });
}
