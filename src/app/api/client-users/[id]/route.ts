import { apiStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { tempPassword } from "@/lib/passwords";
import { after } from "next/server";
import { onClientLogin } from "@/lib/email/notify-events";
import { createClient } from "@/lib/supabase/server";
import { CLIENT_ROLES, notifyClientUsers, resendClientInvite, setClientLoginBlocked } from "@/lib/client-team";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Staff: edit name/phone/designation, change role, deactivate (handing jobs + open tasks to another member),
 * reactivate, resend the invite, or reset the password.
 */
export async function PATCH(req: Request, { params }: Ctx) {
  const a = await apiStaff();
  if ("error" in a) return a.error;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const admin = createAdminClient();

  const { data: cu } = await admin.from("client_users").select("id, user_id, client_id, role").eq("id", id).maybeSingle();
  if (!cu) return Response.json({ error: "Login not found" }, { status: 404 });

  if (body.action === "role") {
    if (!CLIENT_ROLES.includes(body.role)) return Response.json({ error: "Invalid role" }, { status: 400 });
    if (cu.role === "client_admin" && body.role !== "client_admin") {
      const { count } = await admin.from("client_users").select("id", { count: "exact", head: true }).eq("client_id", cu.client_id).eq("role", "client_admin").neq("status", "deactivated");
      if ((count ?? 0) <= 1) return Response.json({ error: "The company needs at least one active admin." }, { status: 400 });
    }
    await admin.from("client_users").update({ role: body.role }).eq("id", id);
    await admin.rpc("client_log_activity_as", { p_client: cu.client_id, p_actor: a.profile.id, p_action: "member_role_changed", p_details: { member: id, from: cu.role, to: body.role } });
    return Response.json({ ok: true });
  }
  if (body.action === "deactivate") {
    const { data, error } = await (await createClient()).rpc("client_member_deactivate", { p_member: id, p_transfer_to: body.transfer_to ?? null });
    if (error) return Response.json({ error: error.message.replace(/^VALIDATION:s*/, "") }, { status: 400 });
    await setClientLoginBlocked(id, true);
    const r = data as { jobs: number; tasks: number; to: { user_id: string } | null };
    if (r.to && (r.jobs || r.tasks)) {
      await notifyClientUsers([r.to.user_id], { event: "client_job_transferred", title: `${r.jobs} job${r.jobs === 1 ? "" : "s"} and ${r.tasks} task${r.tasks === 1 ? "" : "s"} were handed over to you`, body: "Synerax moved them to you when a team member left.", link: "/client/jobs", cta: "Open my jobs", clientId: cu.client_id });
    }
    return Response.json({ ok: true, ...r });
  }
  if (body.action === "reactivate") {
    const { error } = await (await createClient()).rpc("client_member_reactivate", { p_member: id });
    if (error) return Response.json({ error: error.message }, { status: 400 });
    await setClientLoginBlocked(id, false);
    return Response.json({ ok: true });
  }
  if (body.action === "resend") {
    try {
      return Response.json({ ok: true, ...(await resendClientInvite(id, a.profile.id)) });
    } catch (e) {
      return Response.json({ error: e instanceof Error ? e.message : "Could not resend" }, { status: 400 });
    }
  }

  const edits: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) edits.name = body.name.trim().slice(0, 120);
  if (typeof body.phone === "string") edits.phone = body.phone.trim().slice(0, 20) || null;
  if (typeof body.designation === "string") edits.designation = body.designation.trim().slice(0, 120) || null;
  if (typeof body.is_active === "boolean") edits.is_active = body.is_active;
  if (Object.keys(edits).length) {
    const { error } = await admin.from("client_users").update(edits).eq("id", id);
    if (error) return Response.json({ error: error.message }, { status: 400 });
  }
  if (typeof body.name === "string" && body.name.trim()) await admin.from("profiles").update({ full_name: body.name.trim() }).eq("id", cu.user_id);

  if (typeof body.is_active === "boolean") {
    await admin.from("profiles").update({ is_active: body.is_active }).eq("id", cu.user_id);
    const { error } = await admin.auth.admin.updateUserById(cu.user_id, { ban_duration: body.is_active ? "none" : "876000h" });
    if (error) return Response.json({ error: error.message }, { status: 400 });
  }

  if (body.reset_password === true) {
    const password = tempPassword();
    const { error } = await admin.auth.admin.updateUserById(cu.user_id, { password });
    if (error) return Response.json({ error: error.message }, { status: 400 });
    const { data: au } = await admin.auth.admin.getUserById(cu.user_id);
    if (au.user?.email) {
      const { data: row } = await admin.from("client_users").select("name").eq("id", id).maybeSingle();
      after(() => onClientLogin(cu.user_id, au.user!.email!, row?.name ?? "there", password, true));
    }
    return Response.json({ ok: true, password });
  }
  return Response.json({ ok: true });
}
