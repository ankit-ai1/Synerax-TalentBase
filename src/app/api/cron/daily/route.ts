import { createAdminClient } from "@/lib/supabase/server";
import { alreadySent, getEmailSettings, notify, sendEmail } from "@/lib/email/send";
import { clientRecipients } from "@/lib/email/notify-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Daily jobs (Vercel Cron, see vercel.json — 09:00 IST):
 *  1. digest of new portal registrations/applications → Synerax inboxes
 *  2. incomplete-profile reminders → candidates (after 3 days, max 2, 3 days apart)
 *  3. "profiles waiting 48 h" reminder → clients
 *  4. new matching jobs → opted-in candidates (max once a day)
 * Protected by CRON_SECRET (Vercel sends it as a Bearer token).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });

  const settings = await getEmailSettings();
  const result: Record<string, number | string> = {};
  const run = async (name: string, fn: () => Promise<number>) => {
    try {
      result[name] = await fn();
    } catch (e) {
      console.error("cron", name, e);
      result[name] = `error: ${e instanceof Error ? e.message : "unknown"}`;
    }
  };

  await run("digest", () => digest(settings));
  await run("profileReminders", () => profileReminders(settings));
  await run("clientReminders", () => clientReminders(settings));
  await run("jobAlerts", () => jobAlerts(settings));
  return Response.json({ ok: true, ...result });
}

const dayKey = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10); // IST date
const since = (hours: number) => new Date(Date.now() - hours * 3600e3).toISOString();

async function digest(settings: Awaited<ReturnType<typeof getEmailSettings>>) {
  if (!settings.notify_emails.length) return 0;
  const key = `digest:${dayKey()}`;
  if (await alreadySent(key)) return 0;
  const admin = createAdminClient();
  const [{ data: regs }, { count: applied }, { count: pending }] = await Promise.all([
    admin
      .from("candidates")
      .select("id, first_name, last_name, current_designation, total_experience, current_city")
      .not("user_id", "is", null)
      .gte("created_at", since(24))
      .order("created_at", { ascending: false })
      .limit(50),
    admin.from("applications").select("id", { head: true, count: "exact" }).eq("origin", "Candidate applied").gte("created_at", since(24)),
    admin.from("jobs").select("id", { head: true, count: "exact" }).eq("status", "Pending review"),
  ]);
  const n = regs?.length ?? 0;
  if (!n && !applied && !pending) return 0;
  await sendEmail({
    to: settings.notify_emails,
    event: "staff_daily_digest",
    settings,
    dedupeKey: key,
    subject: `Daily digest: ${n} new registration${n === 1 ? "" : "s"}, ${applied ?? 0} application${applied === 1 ? "" : "s"}`,
    content: {
      heading: "Your daily TalentBase digest",
      body: [
        `In the last 24 hours: ${n} candidate${n === 1 ? "" : "s"} registered on the portal and ${applied ?? 0} application${applied === 1 ? "" : "s"} came in.`,
        ...(pending ? [`${pending} client job${pending === 1 ? " is" : "s are"} waiting in Pending review.`] : []),
      ],
      facts: (regs ?? []).slice(0, 15).map((c: any) => ({
        label: `${c.first_name} ${c.last_name ?? ""}`.trim(),
        value: [c.current_designation, c.total_experience != null ? `${Number(c.total_experience)} yrs` : null, c.current_city].filter(Boolean).join(" · ") || "—",
      })),
      cta: { label: "Open self-registered candidates", url: "/candidates?portal=true&sort=recent" },
    },
  });
  return 1;
}

async function profileReminders(settings: Awaited<ReturnType<typeof getEmailSettings>>) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("candidates")
    .select("id, first_name, email, user_id, profile_reminders_sent, last_profile_reminder_at")
    .not("user_id", "is", null)
    .eq("is_archived", false)
    .lt("profile_reminders_sent", 2)
    .lte("created_at", since(72))
    .or(`last_profile_reminder_at.is.null,last_profile_reminder_at.lte.${since(72)}`)
    .limit(100);
  let sent = 0;
  for (const c of (data ?? []) as any[]) {
    const { data: comp } = await admin.rpc("candidate_completion", { p_candidate: c.id });
    const percent = (comp as any)?.percent ?? 100;
    const missing: { label: string }[] = (comp as any)?.missing ?? [];
    // mark as handled either way so a complete profile isn't re-checked every day
    await admin
      .from("candidates")
      .update({ profile_reminders_sent: percent >= 80 ? 2 : c.profile_reminders_sent + 1, last_profile_reminder_at: new Date().toISOString() })
      .eq("id", c.id);
    if (percent >= 80) continue;
    await notify([c.user_id], { type: "profile_reminder", title: `Your profile is ${percent}% complete`, body: "Complete it to get matched with more jobs.", link: "/portal/profile" });
    if (c.email) {
      await sendEmail({
        to: c.email,
        event: "candidate_profile_reminder",
        settings,
        dedupeKey: `profile-reminder:${c.id}:${c.profile_reminders_sent + 1}`,
        related: { candidate_id: c.id, user_id: c.user_id },
        subject: `${c.first_name}, your profile is ${percent}% complete`,
        content: {
          heading: "A few details away from more interviews",
          body: [`Hi ${c.first_name},`, `Your Synerax profile is ${percent}% complete. Recruiters shortlist complete profiles first — it only takes a few minutes.`],
          facts: missing.slice(0, 6).map((m) => ({ label: "Missing", value: m.label })),
          cta: { label: "Complete my profile", url: "/portal/profile" },
        },
      });
    }
    sent++;
  }
  return sent;
}

async function clientReminders(settings: Awaited<ReturnType<typeof getEmailSettings>>) {
  const admin = createAdminClient();
  // each shared profile is reminded exactly once: when it crosses the 48 h mark (daily window 48–72 h)
  const { data } = await admin
    .from("applications")
    .select("id, shared_at, job:jobs!inner(id, title, client_id, client_deleted_at), candidate:candidates(first_name, last_name)")
    .eq("shared_with_client", true)
    .eq("client_decision", "Pending")
    .is("withdrawn_at", null)
    .lte("shared_at", since(48))
    .gt("shared_at", since(72))
    .is("job.client_deleted_at", null);
  const byClient = new Map<string, any[]>();
  for (const a of (data ?? []) as any[]) {
    if (!a.job?.client_id) continue;
    byClient.set(a.job.client_id, [...(byClient.get(a.job.client_id) ?? []), a]);
  }
  let sent = 0;
  for (const [clientId, list] of byClient) {
    const people = await clientRecipients(clientId);
    if (!people.length) continue;
    const n = list.length;
    const jobId = list[0].job.id;
    const link = new Set(list.map((a) => a.job.id)).size === 1 ? `/client/jobs/${jobId}` : "/client";
    await notify(people.map((p) => p.user_id), { type: "pending_reminder", title: `${n} profile${n === 1 ? "" : "s"} waiting for your review`, body: "Shared more than 48 hours ago", link });
    await sendEmail({
      to: people.map((p) => p.email),
      event: "client_pending_reminder",
      settings,
      dedupeKey: `pending:${clientId}:${dayKey()}`,
      related: { client_id: clientId },
      subject: `Reminder: ${n} profile${n === 1 ? "" : "s"} waiting for your review`,
      content: {
        heading: "Candidates are waiting for your feedback",
        body: ["These profiles were shared more than 48 hours ago. A quick approve / reject helps us keep good candidates engaged."],
        facts: list.slice(0, 10).map((a) => ({ label: `${a.candidate?.first_name ?? ""} ${a.candidate?.last_name ?? ""}`.trim() || "Candidate", value: a.job.title })),
        cta: { label: "Review now", url: link },
      },
    });
    sent++;
  }
  return sent;
}

async function jobAlerts(settings: Awaited<ReturnType<typeof getEmailSettings>>) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("job_alert_matches", { p_min_score: 55 });
  if (error) throw new Error(error.message);
  let sent = 0;
  for (const m of (data ?? []) as any[]) {
    const jobs = (m.jobs ?? []).slice(0, 5);
    if (!jobs.length) continue;
    await admin.from("candidates").update({ last_job_alert_at: new Date().toISOString() }).eq("id", m.candidate_id);
    await notify([m.user_id], { type: "job_alert", title: `${jobs.length} new job${jobs.length === 1 ? "" : "s"} match your profile`, body: jobs.map((j: any) => j.title).join(", "), link: "/portal/jobs" });
    await sendEmail({
      to: m.email,
      event: "candidate_job_alerts",
      settings,
      dedupeKey: `alerts:${m.candidate_id}:${dayKey()}`,
      related: { candidate_id: m.candidate_id, user_id: m.user_id },
      subject: `${jobs.length} new job${jobs.length === 1 ? "" : "s"} that match your profile`,
      content: {
        heading: "New jobs picked for you",
        body: [`Hi ${m.first_name},`, "These openings were published recently and fit your profile well:"],
        facts: jobs.map((j: any) => ({
          label: j.title,
          value: [[...(j.locations ?? [])].join(", "), j.work_mode, `${j.score}% match`].filter(Boolean).join(" · "),
        })),
        cta: { label: "View & apply", url: "/portal/jobs" },
        note: "You get these because job alerts are on. Turn them off anytime in your profile.",
      },
    });
    sent++;
  }
  return sent;
}
