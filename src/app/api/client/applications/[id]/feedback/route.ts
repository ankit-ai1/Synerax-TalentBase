import { apiClientMember, rpcError } from "@/lib/client-api";
import { createAdminClient } from "@/lib/supabase/server";
import { jobPeople, notifyClientUsers } from "@/lib/client-team";
import { notify } from "@/lib/email/send";

export const runtime = "nodejs";

/** record interview feedback (rating + recommendation + comments) → the people involved + the Synerax recruiters */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await apiClientMember();
  if ("error" in c) return c.error;
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ error: "Invalid request" }, { status: 400 });
  const { data, error } = await c.sb.rpc("client_add_feedback", { p_application: id, p: body });
  if (error) return rpcError(error.message);

  const admin = createAdminClient();
  const { data: a } = await admin.from("applications").select("job_id, candidate:candidates(first_name, last_name)").eq("id", id).maybeSingle();
  const cand = a?.candidate as unknown as { first_name: string; last_name: string | null } | null;
  const who = [cand?.first_name, cand?.last_name].filter(Boolean).join(" ");
  if (a?.job_id) {
    const people = (await jobPeople(a.job_id)).filter((u) => u !== c.userId);
    await notifyClientUsers(people, {
      event: "client_feedback_added",
      title: `Feedback added for ${who}`,
      body: `${c.me.user.name}${body.rating ? ` rated ${body.rating}/5` : " added feedback"}${body.round ? ` · ${body.round}` : ""}.`,
      link: `/client/jobs/${a.job_id}/profiles/${id}`,
      cta: "Read the feedback",
      clientId: c.me.client.id,
      jobId: a.job_id,
    });
    const { data: staff } = await admin.from("job_assignees").select("user_id").eq("job_id", a.job_id);
    await notify((staff ?? []).map((s) => s.user_id), { type: "client_feedback_added", title: `${c.me.client.name} added interview feedback`, body: `${who}${body.rating ? ` · ${body.rating}/5` : ""}`, link: `/jobs/${a.job_id}` });
  }
  return Response.json({ ok: true, id: data });
}
