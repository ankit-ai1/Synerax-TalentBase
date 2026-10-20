import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail, notify } from "@/lib/email/send";
import { siteUrl } from "@/lib/email/layout";
import { site } from "@/content/site";

/**
 * Client teams (server side). Access rules live in the database (client_can_view_job / client_can_act_job);
 * this module creates logins, sends invite / notification emails and talks to Supabase Auth.
 */

export const CLIENT_ROLES = ["client_admin", "hiring_manager", "recruiter", "ta_coordinator"] as const;
export type ClientRole = (typeof CLIENT_ROLES)[number];
export const ROLE_LABEL: Record<ClientRole, string> = {
  client_admin: "Admin",
  hiring_manager: "Hiring manager",
  recruiter: "Recruiter (HR)",
  ta_coordinator: "TA coordinator",
};

const SET_PASSWORD = "/auth/set-password?mode=client";
const linkFor = (hashedToken: string, type: "invite" | "recovery") =>
  `${siteUrl()}/auth/callback?token_hash=${encodeURIComponent(hashedToken)}&type=${type}&next=${encodeURIComponent(SET_PASSWORD)}`;

async function emailInvite(opts: { to: string; name: string; company: string; role: ClientRole; link: string; clientId: string; userId: string; resend?: boolean }) {
  return sendEmail({
    to: opts.to,
    event: "client_team_invite",
    force: true, // someone pressed "Add member" / "Resend invite"
    subject: `You've been added to ${opts.company} on Synerax TalentBase`,
    related: { client_id: opts.clientId, user_id: opts.userId },
    content: {
      preheader: "Set your password to see your jobs, shared profiles and tasks.",
      heading: `Hi ${opts.name.split(" ")[0]}, welcome to the ${opts.company} hiring workspace`,
      body: [
        `You've been added as ${ROLE_LABEL[opts.role]} for ${opts.company} on Synerax TalentBase — where your team works with Synerax on open roles.`,
        "Set your password to see your jobs, review shortlisted profiles, track interviews and pick up tasks assigned to you.",
      ],
      cta: { label: "Set my password", url: opts.link },
      note: `This link works once and expires for security. If it has expired, ask your company admin to resend it, or contact us at ${site.contact.email}.`,
    },
  });
}

/** Create a client login (role + status 'invited') and email a set-password link. Never creates a second login per email. */
export async function inviteClientMember(input: { clientId: string; name: string; email: string; phone?: string; designation?: string; role: ClientRole; invitedBy: string }) {
  const admin = createAdminClient();
  const email = input.email.trim().toLowerCase();
  const { data: client } = await admin.from("clients").select("id, name").eq("id", input.clientId).maybeSingle();
  if (!client) throw new Error("Client not found");
  const { data: existing } = await admin.from("profiles").select("id, role").ilike("email", email).maybeSingle();
  if (existing) throw new Error(existing.role === "client" ? "This email already has a client login" : "This email already belongs to another login");

  const { data: gen, error } = await admin.auth.admin.generateLink({ type: "invite", email, options: { data: { full_name: input.name }, redirectTo: `${siteUrl()}${SET_PASSWORD}` } });
  if (error || !gen?.properties?.hashed_token) throw new Error(error?.message ?? "Could not create the login");
  const userId = gen.user.id;
  // the sign-up trigger always creates a 'candidate' profile — set the real role server-side
  const { error: pErr } = await admin.from("profiles").upsert({ id: userId, email, full_name: input.name, role: "client", is_active: true });
  const { data: cu, error: cuErr } = pErr
    ? { data: null, error: pErr }
    : await admin
        .from("client_users")
        .insert({
          client_id: input.clientId,
          user_id: userId,
          name: input.name,
          phone: input.phone || null,
          designation: input.designation || null,
          role: input.role,
          status: "invited",
          invited_by: input.invitedBy,
          invited_at: new Date().toISOString(),
          created_by: input.invitedBy,
        })
        .select("id")
        .single();
  if (cuErr || !cu) {
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    throw new Error(cuErr?.message ?? "Could not add the member");
  }
  await admin.rpc("client_log_activity_as", { p_client: input.clientId, p_actor: input.invitedBy, p_action: "member_added", p_details: { member: cu.id, name: input.name, role: input.role } });
  const mail = await emailInvite({ to: email, name: input.name, company: client.name, role: input.role, link: linkFor(gen.properties.hashed_token, "invite"), clientId: input.clientId, userId });
  return { id: cu.id as string, userId, email, emailStatus: mail.status };
}

/** A fresh link: invite (never signed in) or password reset (has signed in before) */
export async function resendClientInvite(memberId: string, actorId: string) {
  const admin = createAdminClient();
  const { data: m } = await admin.from("client_users").select("id, client_id, user_id, name, role, status, client:clients(name)").eq("id", memberId).maybeSingle();
  if (!m) throw new Error("Member not found");
  if (m.status === "deactivated") throw new Error("Reactivate the member first");
  const { data: au } = await admin.auth.admin.getUserById(m.user_id);
  const email = au.user?.email;
  if (!email) throw new Error("This member has no email");
  const type = au.user?.last_sign_in_at ? "recovery" : "invite";
  const { data: gen, error } = await admin.auth.admin.generateLink({ type, email, options: { redirectTo: `${siteUrl()}${SET_PASSWORD}` } } as Parameters<typeof admin.auth.admin.generateLink>[0]);
  if (error || !gen?.properties?.hashed_token) throw new Error(error?.message ?? "Could not create a new link");
  await admin.from("client_users").update({ invited_at: new Date().toISOString(), invited_by: actorId }).eq("id", memberId);
  const company = (m.client as unknown as { name: string } | null)?.name ?? "your company";
  const mail = await emailInvite({ to: email, name: m.name, company, role: m.role as ClientRole, link: linkFor(gen.properties.hashed_token, type), clientId: m.client_id, userId: m.user_id, resend: true });
  return { emailStatus: mail.status };
}

/** after client_member_deactivate / reactivate: block or allow sign-in at the Auth level too */
export async function setClientLoginBlocked(memberId: string, blocked: boolean) {
  const admin = createAdminClient();
  const { data: m } = await admin.from("client_users").select("user_id").eq("id", memberId).maybeSingle();
  if (m) await admin.auth.admin.updateUserById(m.user_id, { ban_duration: blocked ? "876000h" : "none" });
}

// ---------------------------------------------------------------- notifications (only the people involved)
type ClientEvent = "client_task_assigned" | "client_task_due" | "client_job_transferred" | "client_interview_scheduled" | "client_feedback_added";

async function emailOf(userId: string) {
  const { data } = await createAdminClient().auth.admin.getUserById(userId);
  return data.user?.email ?? null;
}

/** in-app + email to specific client users (by auth user id) */
export async function notifyClientUsers(userIds: string[], n: { event: ClientEvent; title: string; body: string; link: string; cta?: string; clientId?: string | null; jobId?: string | null; dedupeKey?: string }) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return;
  await notify(ids, { type: n.event, title: n.title, body: n.body, link: n.link });
  for (const id of ids) {
    const to = await emailOf(id);
    if (!to) continue;
    await sendEmail({
      to,
      event: n.event,
      subject: n.title,
      related: { user_id: id, client_id: n.clientId ?? null, job_id: n.jobId ?? null },
      dedupeKey: n.dedupeKey ? `${n.dedupeKey}:${id}` : undefined,
      content: { heading: n.title, body: [n.body], cta: { label: n.cta ?? "Open", url: n.link } },
    });
  }
}

/** owner, collaborators, assignees on the job and the company's admins — never the whole company */
export async function jobPeople(jobId: string) {
  const { data } = await createAdminClient().rpc("client_job_people", { p_job: jobId });
  return ((data ?? []) as { user_id: string; name: string; role: string }[]).map((p) => p.user_id);
}
