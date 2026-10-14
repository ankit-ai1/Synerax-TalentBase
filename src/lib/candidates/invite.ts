import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { siteUrl } from "@/lib/email/layout";
import { site } from "@/content/site";

/**
 * "Send portal invite" for candidates staff added or imported (no login yet).
 *   • no login with that email  → a new auth user (role candidate, via the profiles trigger) linked to the
 *     EXISTING candidates row (candidates.user_id) + an invite email to set a password
 *   • a candidate login already exists with that email → just link it and send a sign-in link instead
 * The email is ours (branded, through the queue) — Supabase only makes the one-time link (generateLink).
 * A new link replaces nothing: every invite/resend makes a fresh one; expiry = Supabase "Email OTP expiration".
 */

export type InviteOutcome =
  | { id: string; name: string; status: "invited" | "signin_link"; email: string; link?: string }
  | { id: string; name: string; status: "skipped"; reason: string };

type Cand = { id: string; candidate_code: string | null; first_name: string; last_name: string | null; email: string | null; user_id: string | null; consent_at: string | null; invite_count: number | null };

const SET_PASSWORD = "/auth/set-password";
const linkFor = (hashedToken: string, type: "invite" | "magiclink", existing: boolean) =>
  `${siteUrl()}/auth/callback?token_hash=${encodeURIComponent(hashedToken)}&type=${type}&next=${encodeURIComponent(existing ? `${SET_PASSWORD}?existing=1` : SET_PASSWORD)}`;

export async function inviteCandidates(ids: string[], actorId: string, opts: { returnLinks?: boolean } = {}): Promise<InviteOutcome[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("candidates").select("id, candidate_code, first_name, last_name, email, user_id, consent_at, invite_count").in("id", ids);
  const out: InviteOutcome[] = [];
  for (const c of (data ?? []) as Cand[]) {
    const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
    try {
      out.push(await inviteOne(c, name, actorId, opts));
    } catch (e) {
      out.push({ id: c.id, name, status: "skipped", reason: e instanceof Error ? e.message : "Could not send the invite" });
    }
  }
  return out;
}

async function inviteOne(c: Cand, name: string, actorId: string, opts: { returnLinks?: boolean }): Promise<InviteOutcome> {
  const admin = createAdminClient();
  const email = (c.email ?? "").trim().toLowerCase();
  if (!email) return { id: c.id, name, status: "skipped", reason: "No email address" };

  let userId = c.user_id;
  let existing = false; // the person already has a password → sign-in link

  if (userId) {
    const { data: u } = await admin.auth.admin.getUserById(userId);
    if (u?.user?.email_confirmed_at && c.consent_at) return { id: c.id, name, status: "skipped", reason: "Already active on the portal" };
    existing = !!u?.user?.email_confirmed_at;
  } else {
    // a login with this email already? (profiles mirrors auth.users)
    const { data: p } = await admin.from("profiles").select("id, role").ilike("email", email).maybeSingle();
    if (p) {
      if (p.role !== "candidate") return { id: c.id, name, status: "skipped", reason: "This email belongs to a staff or client login" };
      const { data: other } = await admin.from("candidates").select("candidate_code").eq("user_id", p.id).maybeSingle();
      if (other) return { id: c.id, name, status: "skipped", reason: `This email already has a portal profile (${other.candidate_code ?? "another candidate"})` };
      const { data: u } = await admin.auth.admin.getUserById(p.id);
      existing = !!u?.user?.email_confirmed_at;
      userId = p.id;
    }
  }

  // one-time link (invite creates the auth user when there is none yet)
  const type: "invite" | "magiclink" = existing ? "magiclink" : "invite";
  const { data: gen, error } = await admin.auth.admin.generateLink({
    type,
    email,
    options: { redirectTo: `${siteUrl()}${SET_PASSWORD}`, ...(type === "invite" ? { data: { full_name: name } } : {}) },
  });
  if (error || !gen?.properties?.hashed_token) throw new Error(error?.message ?? "Could not create the invite link");
  userId = userId ?? gen.user.id;

  // link the EXISTING candidate row — never a second candidate
  await admin.from("candidates").update({ user_id: userId }).eq("id", c.id).is("user_id", null);
  await admin.from("profiles").update({ full_name: name }).eq("id", userId).eq("full_name", "");

  const link = linkFor(gen.properties.hashed_token, type, existing);
  const res = await sendEmail({
    to: email,
    event: "candidate_portal_invite",
    force: true, // staff pressed the button — always send
    subject: existing ? "Your Synerax profile — sign in" : "Synerax has created your profile — set your password",
    related: { candidate_id: c.id, user_id: userId },
    content: existing
      ? {
          preheader: "Sign in to see your profile, track applications and get matched to jobs.",
          heading: `Hi ${c.first_name}, your Synerax profile is ready`,
          body: [
            "You already have a Synerax login, and we've connected it to the profile our team created for you.",
            "Sign in to check your details, track your applications and get matched to new jobs.",
          ],
          cta: { label: "Sign in to Synerax", url: link },
          note: `This link works once and expires for security. If it has expired, use “Forgot password” on the sign-in page or contact us at ${site.contact.email}.`,
        }
      : {
          preheader: "Set your password to track applications and get matched to jobs.",
          heading: `Hi ${c.first_name}, Synerax has created your profile`,
          body: [
            "Our recruitment team has added your profile to Synerax TalentBase.",
            "Set your password to see your profile, track your applications and get matched to jobs that fit you. It takes less than a minute.",
          ],
          cta: { label: "Set my password", url: link },
          note: `This link works once and expires for security. If it has expired, contact us at ${site.contact.email} and we'll send a new one.`,
        },
  });
  if (res.status === "failed") throw new Error(res.error ?? "The email could not be sent");

  await admin
    .from("candidates")
    .update({ invited_at: new Date().toISOString(), invited_by: actorId, invite_count: (c.invite_count ?? 0) + 1 })
    .eq("id", c.id);
  await admin.from("activity_logs").insert({
    actor_id: actorId,
    action: existing ? "Portal sign-in link sent" : (c.invite_count ?? 0) > 0 ? "Portal invite resent" : "Portal invite sent",
    entity: "candidate",
    entity_id: c.id,
    candidate_id: c.id,
    details: { email, email_status: res.status },
  });

  return { id: c.id, name, status: existing ? "signin_link" : "invited", email, ...(opts.returnLinks ? { link } : {}) };
}
