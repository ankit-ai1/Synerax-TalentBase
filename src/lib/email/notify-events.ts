import "server-only";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAdminClient } from "@/lib/supabase/server";
import { alreadySent, getEmailSettings, notify, sendEmail, type EmailSettings } from "./send";
import { interviewIcs } from "./ics";

/**
 * Event handlers: each one sends the email(s) AND creates the matching in-app notification.
 * They are called from API routes inside after(), never throw, and re-read the database
 * so the email always reflects what really happened.
 *
 * Candidate emails go only to candidates with a portal account (they opted in by registering).
 */

// ---------------------------------------------------------------- helpers
const fullName = (c: { first_name: string; last_name: string | null } | null | undefined) => (c ? `${c.first_name} ${c.last_name ?? ""}`.trim() : "A candidate");
const ist = (d: string | Date, withTime = true) =>
  new Date(d).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit", hour12: true } : {}),
  }) + (withTime ? " IST" : "");
const employerLabel = (job: any) => (job?.show_client_name && job?.client?.name ? job.client.name : "the employer");
const safe = (name: string, fn: () => Promise<void>) => fn().catch((e) => console.error(name, e));

/** Active portal users of a client → { user_id, email, name } */
export async function clientRecipients(clientId: string | null | undefined) {
  if (!clientId) return [];
  const admin = createAdminClient();
  const { data } = await admin.from("client_users").select("user_id, name").eq("client_id", clientId).eq("is_active", true);
  const out: { user_id: string; email: string; name: string }[] = [];
  for (const u of data ?? []) {
    const { data: au } = await admin.auth.admin.getUserById(u.user_id);
    if (au.user?.email) out.push({ user_id: u.user_id, email: au.user.email, name: u.name });
  }
  return out;
}

/** Staff to notify in-app: the job's recruiters, or every active admin when nobody is assigned */
async function staffUserIds(jobId?: string | null) {
  const admin = createAdminClient();
  if (jobId) {
    const { data } = await admin.from("job_assignees").select("user_id, user:profiles(is_active)").eq("job_id", jobId);
    const ids = (data ?? []).filter((r: any) => r.user?.is_active !== false).map((r) => r.user_id);
    if (ids.length) return ids;
  }
  const { data } = await admin.from("profiles").select("id").eq("role", "admin").eq("is_active", true);
  return (data ?? []).map((r) => r.id);
}

/** Email the Synerax inbox(es) + notify the relevant staff in-app */
async function toSynerax(opts: {
  event: Parameters<typeof sendEmail>[0]["event"];
  jobId?: string | null;
  subject: string;
  title: string;
  body?: string;
  link: string;
  content: Parameters<typeof sendEmail>[0]["content"];
  related?: Parameters<typeof sendEmail>[0]["related"];
  settings?: EmailSettings;
  dedupeKey?: string;
}) {
  const settings = opts.settings ?? (await getEmailSettings());
  await notify(await staffUserIds(opts.jobId), { type: opts.event, title: opts.title, body: opts.body, link: opts.link });
  if (settings.notify_emails.length) {
    await sendEmail({ to: settings.notify_emails, event: opts.event, subject: opts.subject, content: opts.content, related: opts.related, settings, dedupeKey: opts.dedupeKey });
  }
}

const APP_SELECT =
  "id, stage, withdrawn_at, shared_with_client, client_decision, client_feedback, client_reject_reason, offered_ctc, expected_joining, joined_at, " +
  "job:jobs(id, title, job_code, client_id, show_client_name, client:clients(name)), " +
  "candidate:candidates(id, first_name, last_name, email, user_id, current_designation, total_experience)";

async function loadApp(applicationId: string) {
  const { data } = await createAdminClient().from("applications").select(APP_SELECT).eq("id", applicationId).maybeSingle();
  return data as any;
}

/** Candidate email + notification, only for portal users */
async function toCandidate(
  c: any,
  opts: {
    event: Parameters<typeof sendEmail>[0]["event"];
    subject: string;
    title: string;
    body: string;
    link: string;
    content: Parameters<typeof sendEmail>[0]["content"];
    related?: Parameters<typeof sendEmail>[0]["related"];
    attachments?: Parameters<typeof sendEmail>[0]["attachments"];
    settings?: EmailSettings;
    dedupeKey?: string;
  }
) {
  if (!c?.user_id) return;
  if (opts.dedupeKey && (await alreadySent(opts.dedupeKey))) return;
  await notify([c.user_id], { type: opts.event, title: opts.title, body: opts.body, link: opts.link });
  if (!c.email) return;
  await sendEmail({
    to: c.email,
    event: opts.event,
    subject: opts.subject,
    content: opts.content,
    attachments: opts.attachments,
    settings: opts.settings,
    dedupeKey: opts.dedupeKey,
    related: { candidate_id: c.id, user_id: c.user_id, ...opts.related },
  });
}

// ---------------------------------------------------------------- clients → Synerax

/** Client created or edited a job from the portal */
export function onClientJobSaved(jobId: string, isNew: boolean) {
  return safe("onClientJobSaved", async () => {
    const admin = createAdminClient();
    const { data: j } = await admin
      .from("jobs")
      .select("id, title, job_code, client_id, openings, locations, exp_min, exp_max, ctc_min, ctc_max, status, client:clients(name), poster:profiles!jobs_posted_by_fkey(full_name)")
      .eq("id", jobId)
      .maybeSingle();
    if (!j) return;
    const job = j as any;
    const settings = await getEmailSettings();
    const facts = [
      { label: "Client", value: job.client?.name ?? "—" },
      { label: "Job", value: `${job.title} (${job.job_code})` },
      { label: "Openings", value: String(job.openings ?? 1) },
      ...(job.locations?.length ? [{ label: "Location", value: job.locations.join(", ") }] : []),
      ...(job.exp_min != null || job.exp_max != null ? [{ label: "Experience", value: `${job.exp_min ?? 0}–${job.exp_max ?? "any"} yrs` }] : []),
      ...(job.ctc_min != null || job.ctc_max != null ? [{ label: "Budget", value: `₹${job.ctc_min ?? "?"}–${job.ctc_max ?? "?"} LPA` }] : []),
    ];
    await toSynerax({
      event: isNew ? "staff_client_job_posted" : "staff_client_job_changed",
      jobId: job.id,
      settings,
      subject: isNew ? `New job from ${job.client?.name}: ${job.title}` : `${job.client?.name} edited “${job.title}”`,
      title: isNew ? `New job from ${job.client?.name}` : `${job.client?.name} edited a job`,
      body: job.title,
      link: isNew ? `/jobs/${job.id}#publish` : `/jobs/${job.id}#details`,
      related: { client_id: job.client_id, job_id: job.id },
      content: {
        heading: isNew ? "A client posted a new job" : "A client edited their job",
        body: [
          isNew
            ? `${job.poster?.full_name ?? "A client user"} from ${job.client?.name} posted a new requirement. It’s waiting in Pending review.`
            : `${job.client?.name} updated “${job.title}”. Check the changes before sharing more profiles.`,
        ],
        facts,
        cta: { label: isNew ? "Review & publish" : "Open the job", url: isNew ? `/jobs/${job.id}#publish` : `/jobs/${job.id}` },
      },
    });
    if (isNew) {
      const people = await clientRecipients(job.client_id);
      if (!people.length) return;
      const link = `/client/jobs/${job.id}`;
      await notify(people.map((p) => p.user_id), { type: "job_received", title: `We received “${job.title}”`, body: "Our team is reviewing it — you’ll hear from us shortly.", link });
      await sendEmail({
        to: people.map((p) => p.email),
        event: "client_job_received",
        subject: `We’ve received your job: ${job.title}`,
        settings,
        related: { client_id: job.client_id, job_id: job.id },
        content: {
          heading: "Thanks — we’ve got your requirement",
          body: [`“${job.title}” (${job.job_code}) is with our team for review. We’ll publish it and start sourcing shortly, usually within one working day.`],
          cta: { label: "View the job", url: link },
        },
      });
    }
  });
}

/** Client closed or deleted a job */
export function onClientJobChanged(jobId: string, kind: "closed" | "deleted", reason?: string | null) {
  return safe("onClientJobChanged", async () => {
    const { data: j } = await createAdminClient().from("jobs").select("id, title, job_code, client_id, client:clients(name)").eq("id", jobId).maybeSingle();
    if (!j) return;
    const job = j as any;
    await toSynerax({
      event: "staff_client_job_changed",
      jobId: job.id,
      subject: `${job.client?.name} ${kind} “${job.title}”`,
      title: `${job.client?.name} ${kind} a job`,
      body: `${job.title}${reason ? ` — ${reason}` : ""}`,
      link: kind === "deleted" ? "/jobs" : `/jobs/${job.id}`,
      related: { client_id: job.client_id, job_id: job.id },
      content: {
        heading: kind === "closed" ? "A client closed a job" : "A client deleted a job",
        body: [
          `${job.client?.name} ${kind} “${job.title}” (${job.job_code}) from their portal.`,
          ...(reason ? [`Reason: ${reason}`] : []),
          kind === "deleted" ? "The job and its pipeline are now hidden from the team. Please stop sourcing for it." : "Please stop sourcing and update candidates in the pipeline.",
        ],
        ...(kind === "closed" ? { cta: { label: "Open the job", url: `/jobs/${job.id}` } } : {}),
      },
    });
  });
}

/** Client approved / rejected a shared profile */
export function onClientDecision(applicationId: string) {
  return safe("onClientDecision", async () => {
    const a = await loadApp(applicationId);
    if (!a?.client_decision || a.client_decision === "Pending") return;
    const approved = a.client_decision === "Approved";
    const who = fullName(a.candidate);
    await toSynerax({
      event: "staff_client_decision",
      jobId: a.job.id,
      subject: `${a.job.client?.name} ${approved ? "approved" : "rejected"} ${who} — ${a.job.title}`,
      title: `${a.job.client?.name} ${approved ? "approved" : "rejected"} ${who}`,
      body: a.client_feedback || a.client_reject_reason || a.job.title,
      link: `/jobs/${a.job.id}`,
      related: { client_id: a.job.client_id, job_id: a.job.id, application_id: a.id, candidate_id: a.candidate?.id },
      content: {
        heading: approved ? "Profile approved — schedule the interview" : "Profile rejected by the client",
        body: [`${a.job.client?.name} ${approved ? "approved" : "rejected"} ${who} for “${a.job.title}”.`],
        facts: [
          ...(a.client_reject_reason ? [{ label: "Reason", value: a.client_reject_reason }] : []),
          ...(a.client_feedback ? [{ label: "Feedback", value: a.client_feedback }] : []),
        ],
        cta: { label: "Open the pipeline", url: `/jobs/${a.job.id}` },
      },
    });
  });
}

/** Client gave feedback on an interview round */
export function onClientInterviewFeedback(interviewId: string) {
  return safe("onClientInterviewFeedback", async () => {
    const { data: iv } = await createAdminClient()
      .from("interviews")
      .select("id, round_name, client_feedback, client_rating, application_id")
      .eq("id", interviewId)
      .maybeSingle();
    if (!iv) return;
    const a = await loadApp(iv.application_id);
    if (!a) return;
    const who = fullName(a.candidate);
    await toSynerax({
      event: "staff_client_interview_feedback",
      jobId: a.job.id,
      subject: `Interview feedback on ${who} — ${a.job.title}`,
      title: `${a.job.client?.name} gave interview feedback`,
      body: `${who} · ${iv.round_name}`,
      link: `/jobs/${a.job.id}`,
      related: { client_id: a.job.client_id, job_id: a.job.id, application_id: a.id },
      content: {
        heading: "New interview feedback from the client",
        body: [`${a.job.client?.name} shared feedback on ${who}’s ${iv.round_name} for “${a.job.title}”.`],
        facts: [
          ...(iv.client_rating ? [{ label: "Rating", value: `${iv.client_rating} / 5` }] : []),
          ...(iv.client_feedback ? [{ label: "Feedback", value: iv.client_feedback }] : []),
        ],
        cta: { label: "Open the pipeline", url: `/jobs/${a.job.id}` },
      },
    });
  });
}

/** Client marked the final result (Selected → Offered, Rejected → Rejected) */
export function onClientFinalResult(applicationId: string, result: string, feedback?: string | null) {
  return safe("onClientFinalResult", async () => {
    const a = await loadApp(applicationId);
    if (!a) return;
    const who = fullName(a.candidate);
    const selected = result === "Selected";
    await toSynerax({
      event: "staff_client_interview_feedback",
      jobId: a.job.id,
      subject: `${a.job.client?.name} ${selected ? "selected" : "rejected"} ${who} — ${a.job.title}`,
      title: `${a.job.client?.name}: final result for ${who}`,
      body: selected ? "Selected — prepare the offer" : "Not selected",
      link: `/jobs/${a.job.id}`,
      related: { client_id: a.job.client_id, job_id: a.job.id, application_id: a.id },
      content: {
        heading: selected ? "Candidate selected 🎉" : "Candidate not selected",
        body: [
          `${a.job.client?.name} marked ${who} as ${selected ? "selected" : "not selected"} for “${a.job.title}”.`,
          ...(feedback ? [`Feedback: ${feedback}`] : []),
          ...(selected ? ["The stage is now Offered — add the offer details in the pipeline."] : []),
        ],
        cta: { label: "Open the pipeline", url: `/jobs/${a.job.id}` },
      },
    });
    await onStageChanged(applicationId);
  });
}

/** Client wrote in a profile's conversation */
export function onClientComment(applicationId: string, body: string) {
  return safe("onClientComment", async () => {
    const a = await loadApp(applicationId);
    if (!a) return;
    const who = fullName(a.candidate);
    await toSynerax({
      event: "staff_client_comment",
      jobId: a.job.id,
      subject: `${a.job.client?.name} sent a message about ${who}`,
      title: `Message from ${a.job.client?.name}`,
      body: `${who}: ${body.slice(0, 120)}`,
      link: `/jobs/${a.job.id}`,
      related: { client_id: a.job.client_id, job_id: a.job.id, application_id: a.id },
      content: {
        heading: `${a.job.client?.name} sent a message`,
        body: [`About ${who} — “${a.job.title}”:`, body],
        cta: { label: "Reply in TalentBase", url: `/jobs/${a.job.id}` },
      },
    });
  });
}

// ---------------------------------------------------------------- candidates → Synerax

export function onCandidateApplied(applicationId: string) {
  return safe("onCandidateApplied", async () => {
    const a = await loadApp(applicationId);
    if (!a) return;
    const who = fullName(a.candidate);
    const settings = await getEmailSettings();
    await toSynerax({
      event: "staff_candidate_applied",
      jobId: a.job.id,
      settings,
      dedupeKey: `applied:${a.id}:${new Date().toISOString().slice(0, 10)}`,
      subject: `${who} applied for ${a.job.title}`,
      title: `New application: ${who}`,
      body: a.job.title,
      link: `/jobs/${a.job.id}`,
      related: { job_id: a.job.id, application_id: a.id, candidate_id: a.candidate?.id },
      content: {
        heading: "New application via the portal",
        body: [`${who} applied for “${a.job.title}” (${a.job.job_code}).`],
        facts: [
          ...(a.candidate?.current_designation ? [{ label: "Current role", value: a.candidate.current_designation }] : []),
          ...(a.candidate?.total_experience != null ? [{ label: "Experience", value: `${Number(a.candidate.total_experience)} yrs` }] : []),
        ],
        cta: { label: "Review in the pipeline", url: `/jobs/${a.job.id}` },
      },
    });
    await toCandidate(a.candidate, {
      event: "candidate_application_received",
      settings,
      dedupeKey: `app-received:${a.id}`,
      subject: `Application received — ${a.job.title}`,
      title: `Application received: ${a.job.title}`,
      body: "Our recruiters will review your profile and get back to you.",
      link: "/portal/applications",
      related: { job_id: a.job.id, application_id: a.id },
      content: {
        heading: "We’ve received your application",
        body: [`Hi ${a.candidate.first_name},`, `Thanks for applying for “${a.job.title}”. Our recruiters review every application — if your profile fits, we’ll contact you about next steps.`, "Keep your profile up to date to improve your chances."],
        cta: { label: "Track your application", url: "/portal/applications" },
      },
    });
  });
}

export function onCandidateWithdrew(applicationId: string) {
  return safe("onCandidateWithdrew", async () => {
    const a = await loadApp(applicationId);
    if (!a) return;
    const who = fullName(a.candidate);
    await toSynerax({
      event: "staff_candidate_withdrew",
      jobId: a.job.id,
      subject: `${who} withdrew from ${a.job.title}`,
      title: `${who} withdrew`,
      body: a.job.title,
      link: `/jobs/${a.job.id}`,
      related: { job_id: a.job.id, application_id: a.id, candidate_id: a.candidate?.id },
      content: {
        heading: "A candidate withdrew their application",
        body: [`${who} withdrew from “${a.job.title}” (${a.job.job_code}) via the portal.`, ...(a.shared_with_client ? ["This profile was shared with the client — let them know if needed."] : [])],
        cta: { label: "Open the pipeline", url: `/jobs/${a.job.id}` },
      },
    });
  });
}

// ---------------------------------------------------------------- staff actions → client / candidate

/** Stage changed (from the pipeline, a dialog or the client's final result) */
export function onStageChanged(applicationId: string) {
  return safe("onStageChanged", async () => {
    const a = await loadApp(applicationId);
    if (!a || a.withdrawn_at) return;
    const c = a.candidate;
    const job = a.job;
    const settings = await getEmailSettings();
    const key = `stage:${a.id}:${a.stage}`;
    const related = { job_id: job.id, application_id: a.id };

    if (a.stage === "Interview") {
      // when an interview is already booked, the "interview scheduled" email says it all
      const { count: upcoming } = await createAdminClient()
        .from("interviews")
        .select("id", { head: true, count: "exact" })
        .eq("application_id", a.id)
        .eq("status", "Scheduled")
        .gt("scheduled_at", new Date().toISOString());
      if (upcoming) return;
      await toCandidate(c, {
        event: "candidate_shortlisted",
        settings,
        dedupeKey: key,
        subject: `You’re shortlisted for an interview — ${job.title}`,
        title: `Shortlisted: ${job.title}`,
        body: "Our team will share the interview details shortly.",
        link: "/portal/applications",
        related,
        content: {
          heading: "Great news — you’re shortlisted!",
          body: [`Hi ${c?.first_name},`, `${employerLabel(job) === "the employer" ? "The employer" : employerLabel(job)} would like to interview you for “${job.title}”. Our recruiter will share the date, time and format shortly.`],
          cta: { label: "View your application", url: "/portal/applications" },
        },
      });
    } else if (a.stage === "Rejected") {
      await toCandidate(c, {
        event: "candidate_not_selected",
        settings,
        dedupeKey: key,
        subject: `Update on your application — ${job.title}`,
        title: `Update: ${job.title}`,
        body: "The employer has decided not to move forward this time.",
        link: "/portal/jobs",
        related,
        content: {
          heading: "An update on your application",
          body: [
            `Hi ${c?.first_name},`,
            `Thank you for your interest in “${job.title}”. After careful consideration, the employer has decided not to move forward with your profile for this role.`,
            "This isn’t the end — we’ll keep your profile in mind for other roles, and new openings are added every week.",
          ],
          cta: { label: "Browse open jobs", url: "/portal/jobs" },
        },
      });
    } else if (a.stage === "Offered") {
      await toCandidate(c, {
        event: "candidate_offer",
        settings,
        dedupeKey: key,
        subject: `Congratulations — you’ve been selected for ${job.title}`,
        title: `Selected: ${job.title} 🎉`,
        body: "Our team will contact you with the offer details.",
        link: "/portal/applications",
        related,
        content: {
          heading: "Congratulations — you’re selected! 🎉",
          body: [`Hi ${c?.first_name},`, `You’ve been selected for “${job.title}”. Our recruiter will contact you shortly with the offer details and next steps.`],
          cta: { label: "View your application", url: "/portal/applications" },
        },
      });
    } else if (a.stage === "Joined") {
      await toCandidate(c, {
        event: "candidate_joined",
        settings,
        dedupeKey: key,
        subject: `Welcome aboard — all the best in your new role!`,
        title: "Congratulations on joining! 🎉",
        body: job.title,
        link: "/portal/applications",
        related,
        content: {
          heading: "Congratulations on your new role! 🎉",
          body: [`Hi ${c?.first_name},`, `Congratulations on joining as “${job.title}”. It was a pleasure working with you — we wish you every success.`, "If a friend is looking for a job, send them our way!"],
          cta: { label: "Refer a friend", url: "/register" },
        },
      });
      if (job.client_id && !(await alreadySent(`${key}:client`))) {
        const people = await clientRecipients(job.client_id);
        if (people.length) {
          await notify(people.map((p) => p.user_id), { type: "candidate_joined", title: `${fullName(c)} has joined`, body: job.title, link: `/client/jobs/${job.id}` });
          await sendEmail({
            to: people.map((p) => p.email),
            event: "client_candidate_joined",
            settings,
            dedupeKey: `${key}:client`,
            subject: `${fullName(c)} has joined — ${job.title}`,
            related: { client_id: job.client_id, ...related },
            content: {
              heading: "Your new hire has joined 🎉",
              body: [`${fullName(c)} has joined as “${job.title}”${a.joined_at ? ` on ${ist(a.joined_at, false)}` : ""}.`, "Thank you for hiring with Synerax."],
              cta: { label: "View the job", url: `/client/jobs/${job.id}` },
            },
          });
        }
      }
    }
  });
}

/** Interview scheduled / rescheduled by staff → candidate (with .ics) and client (if the profile is shared) */
export function onInterviewSaved(interviewId: string) {
  return safe("onInterviewSaved", async () => {
    const { data: iv } = await createAdminClient()
      .from("interviews")
      .select("id, round_name, round_no, mode, scheduled_at, duration_min, location, meeting_link, status, application_id")
      .eq("id", interviewId)
      .maybeSingle();
    if (!iv || iv.status !== "Scheduled" || new Date(iv.scheduled_at).getTime() < Date.now()) return;
    const a = await loadApp(iv.application_id);
    if (!a || a.withdrawn_at) return;
    const job = a.job;
    const settings = await getEmailSettings();
    const base = `iv:${iv.id}:`;
    const rescheduled = await alreadySent(base, true);
    const key = `${base}${iv.scheduled_at}`;
    const when = ist(iv.scheduled_at);
    const where = iv.meeting_link ? iv.meeting_link : iv.location ? iv.location : iv.mode === "Phone" ? "Phone call" : iv.mode;
    const facts = [
      { label: "Role", value: job.title },
      { label: "Round", value: iv.round_name },
      { label: "When", value: when },
      { label: "Duration", value: `${iv.duration_min ?? 60} minutes` },
      { label: "Mode", value: iv.mode },
      ...(where && where !== iv.mode ? [{ label: iv.meeting_link ? "Link" : "Venue", value: where }] : []),
    ];
    const verb = rescheduled ? "rescheduled" : "scheduled";

    await toCandidate(a.candidate, {
      event: "candidate_interview_scheduled",
      settings,
      dedupeKey: `${key}:cand`,
      subject: `Interview ${verb}: ${job.title} — ${when}`,
      title: `Interview ${verb}: ${iv.round_name}`,
      body: `${job.title} · ${when}`,
      link: "/portal/applications",
      related: { job_id: job.id, application_id: a.id },
      attachments: [
        {
          filename: "interview.ics",
          contentType: "text/calendar; charset=utf-8; method=PUBLISH",
          content: interviewIcs({
            uid: iv.id,
            start: iv.scheduled_at,
            minutes: iv.duration_min ?? 60,
            title: `${iv.round_name} — ${job.title}`,
            location: where ?? "",
            description: `Interview for ${job.title}. Arranged by Synerax.`,
          }),
        },
      ],
      content: {
        heading: rescheduled ? "Your interview has been rescheduled" : "Your interview is scheduled",
        body: [`Hi ${a.candidate?.first_name},`, rescheduled ? "Please note the new time below." : "Here are the details. The calendar invite is attached — add it so you don’t miss it.", "Join 5 minutes early and keep your CV handy. All the best!"],
        facts,
        cta: { label: "View in your portal", url: "/portal/applications" },
      },
    });

    if (a.shared_with_client && job.client_id && !(await alreadySent(`${key}:client`))) {
      const people = await clientRecipients(job.client_id);
      if (people.length) {
        const who = fullName(a.candidate);
        await notify(people.map((p) => p.user_id), { type: "interview_scheduled", title: `Interview ${verb}: ${who}`, body: when, link: `/client/jobs/${job.id}` });
        await sendEmail({
          to: people.map((p) => p.email),
          event: "client_interview_scheduled",
          settings,
          dedupeKey: `${key}:client`,
          subject: `Interview ${verb}: ${who} — ${when}`,
          related: { client_id: job.client_id, job_id: job.id, application_id: a.id },
          attachments: [
            {
              filename: "interview.ics",
              contentType: "text/calendar; charset=utf-8; method=PUBLISH",
              content: interviewIcs({ uid: `${iv.id}-client`, start: iv.scheduled_at, minutes: iv.duration_min ?? 60, title: `${iv.round_name}: ${who} (${job.title})`, location: where ?? "", description: "Arranged by Synerax." }),
            },
          ],
          content: {
            heading: rescheduled ? "Interview rescheduled" : "Interview scheduled",
            body: [`${who}’s interview for “${job.title}” is ${verb}.`],
            facts: [{ label: "Candidate", value: who }, ...facts],
            cta: { label: "Open in your portal", url: `/client/jobs/${job.id}` },
            note: "Please share your feedback in the portal after the interview.",
          },
        });
      }
    }
  });
}

/** Profiles newly shared with a client → one email per job to the client, one per candidate */
export function onProfilesShared(applicationIds: string[]) {
  return safe("onProfilesShared", async () => {
    const admin = createAdminClient();
    const { data: apps } = await admin.from("applications").select(APP_SELECT + ", share_note").in("id", applicationIds).eq("shared_with_client", true);
    if (!apps?.length) return;
    const settings = await getEmailSettings();

    const byJob = new Map<string, any[]>();
    for (const a of apps as any[]) {
      if (!a.job?.client_id) continue;
      byJob.set(a.job.id, [...(byJob.get(a.job.id) ?? []), a]);
    }
    for (const list of byJob.values()) {
      const job = list[0].job;
      const people = await clientRecipients(job.client_id);
      if (!people.length) continue;
      const link = `/client/jobs/${job.id}`;
      const n = list.length;
      await notify(people.map((p) => p.user_id), { type: "profiles_shared", title: `${n} new profile${n === 1 ? "" : "s"} for “${job.title}”`, body: "Review and approve or reject them in your portal.", link });
      await sendEmail({
        to: people.map((p) => p.email),
        event: "client_profiles_shared",
        subject: `${n} new profile${n === 1 ? "" : "s"} shared for ${job.title}`,
        settings,
        related: { client_id: job.client_id, job_id: job.id },
        content: {
          heading: `${n} new profile${n === 1 ? "" : "s"} for you to review`,
          body: [`We’ve shortlisted the following candidate${n === 1 ? "" : "s"} for “${job.title}” (${job.job_code}).`, ...(list[0].share_note ? [`Note from Synerax: ${list[0].share_note}`] : [])],
          facts: list.slice(0, 10).map((a) => ({
            label: fullName(a.candidate),
            value: [a.candidate?.current_designation, a.candidate?.total_experience != null ? `${Number(a.candidate.total_experience)} yrs` : null].filter(Boolean).join(" · ") || "—",
          })),
          cta: { label: "Review profiles", url: link },
          note: "Please approve or reject within 48 hours so we can keep candidates engaged.",
        },
      });
    }

    for (const a of apps as any[]) {
      await toCandidate(a.candidate, {
        event: "candidate_profile_shared",
        settings,
        dedupeKey: `shared:${a.id}`,
        subject: `Good news — your profile was shared for ${a.job.title}`,
        title: `Your profile was shared for “${a.job.title}”`,
        body: `We’ve sent your profile to ${employerLabel(a.job)}. We’ll update you as soon as they respond.`,
        link: "/portal/applications",
        related: { job_id: a.job.id, application_id: a.id },
        content: {
          heading: "Your profile has been shared",
          body: [`Hi ${a.candidate.first_name},`, `Our team has shared your profile with ${employerLabel(a.job)} for the “${a.job.title}” role. We’ll let you know as soon as they respond.`],
          cta: { label: "Track your applications", url: "/portal/applications" },
        },
      });
    }
  });
}

/** Synerax replied in a profile's conversation → the client's users */
export function onStaffComment(applicationId: string, body: string) {
  return safe("onStaffComment", async () => {
    const a = await loadApp(applicationId);
    if (!a?.shared_with_client || !a.job?.client_id) return;
    const people = await clientRecipients(a.job.client_id);
    if (!people.length) return;
    const who = fullName(a.candidate);
    const link = `/client/jobs/${a.job.id}`;
    await notify(people.map((p) => p.user_id), { type: "comment", title: `Synerax replied about ${who}`, body: body.slice(0, 140), link });
    await sendEmail({
      to: people.map((p) => p.email),
      event: "client_comment",
      subject: `New message about ${who} — ${a.job.title}`,
      related: { client_id: a.job.client_id, job_id: a.job.id, application_id: a.id },
      content: { heading: `Message about ${who}`, body: [body], cta: { label: "Reply in your portal", url: link } },
    });
  });
}

/** Job published → the client's users */
export function onJobPublished(jobId: string) {
  return safe("onJobPublished", async () => {
    const { data: j } = await createAdminClient().from("jobs").select("id, title, job_code, client_id").eq("id", jobId).maybeSingle();
    if (!j?.client_id) return;
    const people = await clientRecipients(j.client_id);
    if (!people.length) return;
    const link = `/client/jobs/${j.id}`;
    await notify(people.map((p) => p.user_id), { type: "job_published", title: `“${j.title}” is live`, body: "Synerax has reviewed and published your job. Shortlisted profiles will appear here.", link });
    await sendEmail({
      to: people.map((p) => p.email),
      event: "client_job_published",
      dedupeKey: `published:${j.id}`,
      subject: `Your job “${j.title}” is now live`,
      related: { client_id: j.client_id, job_id: j.id },
      content: {
        heading: "Your job is live",
        body: [`Our team has reviewed “${j.title}” (${j.job_code}) and started sourcing.`, "We’ll share shortlisted profiles in your portal — you’ll get an email each time we do."],
        cta: { label: "View the job", url: link },
      },
    });
  });
}

// ---------------------------------------------------------------- accounts

/** Client portal login created or password reset by Synerax */
export function onClientLogin(userId: string, email: string, name: string, tempPassword: string, reset: boolean) {
  return safe("onClientLogin", async () => {
    const { data: cu } = await createAdminClient().from("client_users").select("client_id, client:clients(name)").eq("user_id", userId).maybeSingle();
    await sendEmail({
      to: email,
      event: "client_login_created",
      subject: reset ? "Your Synerax client portal password was reset" : "Your Synerax client portal login",
      related: { user_id: userId, client_id: cu?.client_id ?? null },
      content: {
        heading: reset ? "Your password was reset" : `Welcome to the Synerax client portal`,
        body: [
          `Hi ${name},`,
          reset
            ? "Your Synerax team reset your portal password. Use the temporary password below to sign in."
            : `We’ve created a portal login for ${(cu as any)?.client?.name ?? "your company"}. Post jobs, review shortlisted profiles and give interview feedback — all in one place.`,
        ],
        facts: [
          { label: "Login email", value: email },
          { label: "Temporary password", value: tempPassword },
        ],
        cta: { label: "Sign in", url: "/login?next=/client" },
        note: "Please change this password after signing in (menu → Change password). Never share it with anyone.",
      },
    });
  });
}

/** Candidate finished registration (email verified, profile created) */
export function onCandidateRegistered(candidateId: string) {
  return safe("onCandidateRegistered", async () => {
    const { data: c } = await createAdminClient().from("candidates").select("id, first_name, last_name, email, user_id").eq("id", candidateId).maybeSingle();
    if (!c?.user_id) return;
    await toCandidate(c, {
      event: "candidate_welcome",
      dedupeKey: `welcome:${c.id}`,
      subject: "Welcome to Synerax — your profile is live",
      title: "Welcome to Synerax 👋",
      body: "Complete your profile to get matched with the right jobs.",
      link: "/portal/profile",
      content: {
        heading: `Welcome, ${c.first_name}!`,
        body: [
          "Your Synerax profile is ready. Our recruiters can now match you with openings from our clients.",
          "A complete profile gets noticed first — add your skills, experience and expected salary.",
          "Synerax never charges candidates any fee.",
        ],
        cta: { label: "Complete your profile", url: "/portal/profile" },
      },
    });
  });
}
