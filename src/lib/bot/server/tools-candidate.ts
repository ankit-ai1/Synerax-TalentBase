import { z } from "zod";
import type { BotCard, BotTurn } from "../types";
import { defineTool, P, type BotCtx } from "./registry";
import { remainder } from "./entities";
import { makeMatcher, pick, plural } from "./text";

/* eslint-disable @typescript-eslint/no-explicit-any */

const STEPS = ["Applied", "Under review", "Shared", "Interview", "Offer", "Joined"];
const when = (d: string) => new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const where = (j: any) => (j.work_mode === "Remote" ? "Remote" : [(j.locations ?? []).slice(0, 2).join(", "), j.work_mode].filter(Boolean).join(" · "));

async function rpc<T = any>(ctx: BotCtx, fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await ctx.sb.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

const appCard = (a: any): BotCard => ({
  title: a.job_title,
  subtitle: a.company,
  badge: a.status_label,
  href: "/portal/applications",
  steps: { labels: STEPS, current: Math.max(0, a.step), closed: a.step < 0 || a.withdrawn },
});

function filterApps(apps: any[], status?: string) {
  const active = (a: any) => !a.withdrawn && a.step >= 0 && a.step < 5;
  switch (status) {
    case "interview":
      return apps.filter((a) => a.step === 3 && !a.withdrawn);
    case "offer":
      return apps.filter((a) => a.step === 4 && !a.withdrawn);
    case "shared":
      return apps.filter((a) => a.step === 2 && !a.withdrawn);
    case "review":
      return apps.filter((a) => a.step === 1 && !a.withdrawn);
    case "applied":
      return apps.filter((a) => a.step === 0 && !a.withdrawn);
    case "closed":
      return apps.filter((a) => a.withdrawn || a.step < 0);
    case "all":
      return apps;
    default:
      return apps.filter(active);
  }
}
const STATUS_WORD: Record<string, string> = { interview: "at the interview stage", offer: "with an offer", shared: "shared with the employer", review: "under review", applied: "just applied", closed: "closed", all: "in total", active: "active" };

export const myProfileSummary = defineTool({
  name: "my_profile_summary",
  modes: ["candidate"],
  kind: "read",
  description: "The candidate's own profile at a glance (headline, experience, city, notice, expected CTC, completion).",
  params: z.object({}),
  examples: ["show my profile", "what's on my profile", "my details", "profile summary", "what does my profile say", "meri profile dikhao", "my current details", "how does my profile look"],
  keywords: /\b(my profile|my details|profile summary)\b/,
  async run(_p, ctx) {
    const d = await rpc(ctx, "candidate_my_profile");
    const c = d.candidate;
    return [
      {
        text: pick([`Here's your profile — ${d.completion.percent}% complete.`, `Your profile is ${d.completion.percent}% complete. Here's a snapshot:`], c.id),
        cards: [
          {
            title: [c.first_name, c.last_name].filter(Boolean).join(" "),
            subtitle: c.headline || c.current_designation || "Add a headline",
            lines: [
              `Experience: ${c.total_experience ?? "—"} yrs · City: ${c.current_city ?? "—"}`,
              `Notice: ${c.notice_period_days == null ? "—" : c.notice_period_days === 0 ? "Immediate" : `${c.notice_period_days} days`} · Expected CTC: ${c.expected_ctc != null ? `₹${c.expected_ctc} LPA` : "—"}`,
              `Skills: ${(d.skills ?? []).slice(0, 6).map((s: any) => s.name).join(", ") || "—"}`,
            ],
            href: "/portal/profile",
          },
        ],
        chips: d.completion.missing.length ? [{ label: "What's missing?", tool: "my_profile_missing_fields" }] : [{ label: "Jobs for me", tool: "recommended_jobs" }],
      },
    ];
  },
});

export const myProfileMissing = defineTool({
  name: "my_profile_missing_fields",
  modes: ["candidate"],
  kind: "read",
  description: "Profile strength / completeness: what the candidate still needs to add and how to get more matches.",
  params: z.object({}),
  examples: ["what is missing in my profile", "how to complete my profile", "profile tips", "improve my profile", "why is my profile incomplete", "profile kaise complete kare", "what should i add to my profile", "profile strength", "how can i get more matches"],
  keywords: /\b(missing|incomplete|complete (my )?profile|profile tips|improve|profile strength)\b/,
  async run(_p, ctx) {
    const d = await rpc(ctx, "candidate_my_profile");
    const c = d.completion;
    if (!c.missing.length) return [{ text: `Your profile is ${c.percent}% complete — nothing important is missing. Keep your notice period and CTC up to date.`, chips: [{ label: "Jobs for me", tool: "recommended_jobs" }] }];
    return [
      {
        text: `Your profile is ${c.percent}% complete. Adding these gets you matched to more jobs:\n${c.missing.slice(0, 6).map((m: any) => `• ${m.label}`).join("\n")}`,
        link: { label: "Complete my profile", href: "/portal/profile" },
        upload: c.missing.some((m: any) => m.key === "cv") ? { docType: "Resume" } : undefined,
      },
    ];
  },
});

export const myApplications = defineTool({
  name: "my_applications",
  modes: ["candidate"],
  kind: "read",
  description: "The candidate's own job applications and their stage. Optional status filter.",
  params: z.object({ status: z.enum(["active", "interview", "offer", "shared", "review", "applied", "closed", "all"]).optional() }),
  examples: ["my applications", "application status", "where are my applications", "how many of my applications are in interview", "any offers for me", "did i get shortlisted", "track my applications", "mere applications ka status", "jobs i applied to", "which applications are closed", "status of my job applications", "kitne interview pe hain"],
  keywords: /\b(applications?|applied|application status|track|shortlisted|offers?)\b/,
  extract: (_t, e) => ({ status: e.status === "active" ? undefined : e.status }),
  async run(p, ctx) {
    const all = ((await rpc<any[]>(ctx, "candidate_my_applications")) ?? []).map((a) => ({ ...a, withdrawn: !!a.withdrawn }));
    const list = filterApps(all, p.status);
    const word = STATUS_WORD[p.status ?? "active"];
    if (!all.length) return [{ text: "You haven't applied to any jobs yet.", chips: [{ label: "Jobs for me", tool: "recommended_jobs", tone: "primary" }] }];
    if (!list.length) return [{ text: `None of your applications are ${word} right now. You have ${plural(filterApps(all).length, "active application")}.`, chips: [{ label: "All applications", tool: "my_applications", params: { status: "all" } }] }];
    return [
      {
        text: pick([`You have ${plural(list.length, "application")} ${word}.`, `${plural(list.length, "application")} ${list.length === 1 ? "is" : "are"} ${word}:`, `Here ${list.length === 1 ? "is your application" : `are your ${list.length} applications`} ${word}:`], String(list.length)),
        cards: list.slice(0, 6).map(appCard),
        chips: [{ label: "Upcoming interviews", tool: "my_interviews" }, { label: "Jobs for me", tool: "recommended_jobs" }],
      },
    ];
  },
});

export const myInterviews = defineTool({
  name: "my_interviews",
  modes: ["candidate"],
  kind: "read",
  description: "The candidate's upcoming interviews.",
  params: z.object({}),
  examples: ["my interviews", "when is my interview", "upcoming interviews", "do i have any interview", "interview schedule", "mera interview kab hai", "interview time", "next interview", "any interviews this week"],
  keywords: /\binterviews?\b.*\b(when|upcoming|schedule|next|time|kab|do i have)\b|\b(when|upcoming|next|my)\b.*\binterviews?\b/,
  async run(_p, ctx) {
    const apps = (await rpc<any[]>(ctx, "candidate_my_applications")) ?? [];
    const list = apps.flatMap((a) => (a.interviews ?? []).map((i: any) => ({ ...i, job: a.job_title, company: a.company }))).filter((i) => new Date(i.scheduled_at).getTime() > Date.now() - 2 * 3600e3);
    list.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
    if (!list.length) return [{ text: "You have no upcoming interviews. I'll keep an eye out — your recruiter will schedule one when an employer is interested.", chips: [{ label: "My applications", tool: "my_applications" }] }];
    return [
      {
        text: list.length === 1 ? `Your next interview is ${when(list[0].scheduled_at)}.` : `You have ${plural(list.length, "upcoming interview")}:`,
        cards: list.slice(0, 5).map((i) => ({ title: `${i.round ?? "Interview"} — ${i.job}`, subtitle: i.company, meta: `${when(i.scheduled_at)} · ${i.mode ?? ""}${i.duration_min ? ` · ${i.duration_min} min` : ""}`, href: "/portal/applications" })),
      },
    ];
  },
});

export const recommendedJobs = defineTool({
  name: "recommended_jobs",
  modes: ["candidate"],
  kind: "read",
  description: "Open jobs that match the candidate, best match first. Optional filters: skill/keyword, city, work mode, minimum salary (LPA).",
  params: z.object({ q: P.optText(80), location: P.optText(60), work_mode: z.enum(["Remote", "Hybrid", "Onsite"]).optional(), min_salary: P.optNum(0, 500) }),
  examples: ["jobs for me", "recommended jobs", "find me a job", "react jobs in pune", "any remote jobs", "jobs matching my profile", "show openings", "mere liye job hai kya", "jobs above 20 lpa", "new jobs", "best jobs for me", "java developer jobs in bangalore", "how many jobs are there for me"],
  keywords: /\b(jobs?|openings?|vacanc\w*|positions?|roles?|naukri|recommend\w*|match\w*)\b/,
  extract: (_t, e) => ({ q: e.skills[0], location: e.cities[0], work_mode: e.workMode, min_salary: e.lpa }),
  async run(p, ctx) {
    const items = (await rpc<any[]>(ctx, "candidate_jobs", { f: { q: p.q ?? "", location: p.location ?? "", work_mode: p.work_mode ?? "", salary_min: p.min_salary ?? "", sort: "match", limit: 20 } })) ?? [];
    const open = items.filter((j) => !j.applied);
    const jobs = open.slice(0, 5);
    const what = [p.q, p.location && `in ${p.location}`, p.work_mode?.toLowerCase()].filter(Boolean).join(" ");
    if (!jobs.length) return [{ text: `I couldn't find open ${what ? `${what} ` : ""}jobs you haven't applied to yet. Adding more skills to your profile helps.`, chips: [{ label: "Profile tips", tool: "my_profile_missing_fields" }] }];
    return [
      {
        text: open.length > jobs.length ? `There are ${open.length >= 20 ? "20+" : open.length} open ${what ? `${what} ` : ""}jobs you haven't applied to — top ${jobs.length} by match:` : pick([`Top ${jobs.length} ${what ? `${what} ` : ""}jobs for you, best match first:`, `These ${what ? `${what} ` : ""}jobs fit you best:`, `I found ${plural(jobs.length, "job")} ${what ? `for ${what} ` : ""}that ${jobs.length === 1 ? "matches" : "match"} your profile:`], what),
        cards: jobs.map((j) => ({
          title: j.title,
          subtitle: [j.company, where(j)].filter(Boolean).join(" · "),
          badge: j.match != null ? `${j.match}% match` : undefined,
          meta: (j.matched_skills ?? []).length ? `Matches: ${(j.matched_skills ?? []).slice(0, 4).join(", ")}` : undefined,
          href: `/portal/jobs/${j.id}`,
          chips: [{ label: "Apply", tool: "apply_to_job", params: { job_id: j.id }, tone: "primary" }],
        })),
        chips: [{ label: "Browse all jobs", href: "/portal/jobs" }],
      },
    ];
  },
});

/** find a job the candidate may see by id or by (part of) its title */
async function resolveJob(ctx: BotCtx, idOrTitle?: string) {
  if (!idOrTitle) return { error: "Which job? Pick one from your recommended jobs." };
  if (/^[0-9a-f-]{36}$/i.test(idOrTitle)) {
    const j = await rpc(ctx, "candidate_job", { p_job: idOrTitle });
    return j ? { job: j } : { error: "That job is no longer open." };
  }
  const items = ((await rpc<any[]>(ctx, "candidate_jobs", { f: { sort: "match", limit: 50 } })) ?? []) as any[];
  const hit = makeMatcher(items.map((j) => ({ item: j, text: j.title })))(idOrTitle)[0];
  if (!hit || hit.score < 0.5) return { error: "I couldn't find that job among the open roles." };
  return { job: hit.item };
}

export const jobDetails = defineTool({
  name: "job_details",
  modes: ["candidate"],
  kind: "read",
  description: "Details of one open (published) job by id or title, incl. how well the candidate matches.",
  params: z.object({ job: P.text(120) }),
  examples: ["tell me about the react developer job", "job details", "what does the data analyst role involve", "details of this job", "salary for the backend role"],
  extract: (t) => ({ job: remainder(t, [/\b(job|role|position|details?|about|tell|more)\b/g]) || undefined }),
  async run(p, ctx) {
    const r = await resolveJob(ctx, p.job);
    if (!r.job) return [{ text: r.error!, chips: [{ label: "Jobs for me", tool: "recommended_jobs" }] }];
    const j = r.job.description !== undefined ? r.job : await rpc(ctx, "candidate_job", { p_job: r.job.id });
    return [
      {
        text: `${j.title} — ${[j.company, where(j)].filter(Boolean).join(" · ")}${j.match != null ? ` (${j.match}% match)` : ""}`,
        cards: [{ title: j.title, subtitle: [j.exp_min != null || j.exp_max != null ? `${j.exp_min ?? 0}–${j.exp_max ?? "any"} yrs` : "", j.salary_min ? `₹${j.salary_min}–${j.salary_max} LPA` : ""].filter(Boolean).join(" · "), lines: [(j.skills ?? []).slice(0, 6).map((s: any) => s.name ?? s).join(", "), String(j.description ?? "").slice(0, 350)].filter(Boolean), href: `/portal/jobs/${j.id}` }],
        chips: j.application_id ? [{ label: "My applications", tool: "my_applications" }] : [{ label: "Apply", tool: "apply_to_job", params: { job_id: j.id }, tone: "primary" }],
      },
    ];
  },
});

export const applyToJob = defineTool({
  name: "apply_to_job",
  modes: ["candidate"],
  kind: "action",
  description: "Apply to an open job (by job id or title). Always asks the candidate to confirm first.",
  params: z.object({ job_id: P.optText(120), job: P.optText(120) }),
  examples: ["apply to this job", "apply for the react developer role", "i want to apply", "apply now", "is job ke liye apply karo", "send my application", "apply to the backend job"],
  keywords: /\bapply\b/,
  extract: (t) => ({ job: remainder(t, [/\b(apply|applying|application|job|role|position|for|to|now|want)\b/g]) || undefined }),
  async prepare(p, ctx) {
    const r = await resolveJob(ctx, p.job_id || p.job);
    if (!r.job) return { turns: [{ text: r.error!, chips: [{ label: "Jobs for me", tool: "recommended_jobs" }] }] };
    if (r.job.applied || r.job.application_id) return { turns: [{ text: `You've already applied to ${r.job.title}.`, chips: [{ label: "My applications", tool: "my_applications" }] }] };
    return { params: { job_id: r.job.id }, confirm: { title: `Apply to ${r.job.title}?`, details: [[r.job.company, where(r.job)].filter(Boolean).join(" · "), "Your current profile and CV go to the Synerax recruiter for this role."], confirmLabel: "Apply" } };
  },
  async execute(p, ctx) {
    const id = await rpc<string>(ctx, "candidate_apply", { p_job: p.job_id });
    ctx.defer(async () => (await import("@/lib/email/notify-events")).onCandidateApplied(id));
    return [{ text: "Done — you've applied. Your recruiter will review it and you can track it under My applications.", tone: "success", chips: [{ label: "My applications", tool: "my_applications" }, { label: "More jobs", tool: "recommended_jobs" }] }];
  },
});

export const withdrawApplication = defineTool({
  name: "withdraw_application",
  modes: ["candidate"],
  kind: "action",
  description: "Withdraw one of the candidate's applications (by job title) — also when they say they are no longer interested in a role. Asks to confirm first.",
  params: z.object({ application_id: P.optText(60), job: P.optText(120) }),
  examples: ["withdraw my application", "cancel my application for the react job", "i am not interested anymore", "remove my application", "application wapas lo", "withdraw from the data analyst role", "i don't want this job"],
  keywords: /\b(withdraw|cancel (my )?application|not interested|remove (my )?application|wapas)\b/,
  extract: (t) => ({ job: remainder(t, [/\b(withdraw|cancel|remove|application|from|the|job|role|my|not|interested|anymore)\b/g]) || undefined }),
  async prepare(p, ctx) {
    const apps = ((await rpc<any[]>(ctx, "candidate_my_applications")) ?? []).filter((a) => a.can_withdraw);
    let app = p.application_id ? apps.find((a) => a.id === p.application_id) : undefined;
    if (!app && p.job) app = makeMatcher(apps.map((a) => ({ item: a, text: a.job_title })))(p.job).find((h) => h.score >= 0.5)?.item;
    if (!app) {
      if (!apps.length) return { turns: [{ text: "You have no applications that can be withdrawn." }] };
      return { turns: [{ text: "Which application do you want to withdraw?", chips: apps.slice(0, 6).map((a) => ({ label: a.job_title, tool: "withdraw_application", params: { application_id: a.id } })) }] };
    }
    return { params: { application_id: app.id }, confirm: { title: `Withdraw your application for ${app.job_title}?`, details: [app.company, "The recruiter will be told. You can apply again later if the job is still open."], confirmLabel: "Withdraw" } };
  },
  async execute(p, ctx) {
    await rpc(ctx, "candidate_withdraw", { p_application: p.application_id });
    ctx.defer(async () => (await import("@/lib/email/notify-events")).onCandidateWithdrew(String(p.application_id)));
    return [{ text: "Your application has been withdrawn.", tone: "success", chips: [{ label: "My applications", tool: "my_applications" }] }];
  },
});

const prefs = z.object({ notice_days: z.coerce.number().int().min(0).max(180).optional(), expected_ctc: z.coerce.number().min(0.5).max(500).optional(), city: z.string().trim().min(2).max(60).optional() });
export const updatePreferences = defineTool({
  name: "update_my_preferences",
  modes: ["candidate"],
  kind: "action",
  description: "Update the candidate's notice period (days), expected CTC (LPA) and/or current city. Asks to confirm first.",
  params: prefs,
  examples: ["change my notice period to 30 days", "update expected ctc to 18 lpa", "i moved to pune", "my notice period is now immediate", "set my expected salary 25 lakh", "update my city", "notice period 60 days kar do", "change my details", "update my preferences", "i can join immediately"],
  keywords: /\b(update|change|set|edit|moved|shifted|relocated|kar do|now)\b.*\b(notice|ctc|salary|package|city|location|join)|\b(notice|expected ctc|expected salary)\b.*\b(update|change|now|is)\b|\bjoin immediately\b/,
  extract: (t, e) => {
    const city = /\b(moved|shifted|relocated|living|city|location)\b/i.test(t) ? e.cities[0] : undefined;
    return { notice_days: /\b(notice|join|immediate)/i.test(t) ? e.noticeDays : undefined, expected_ctc: /\b(ctc|salary|package|lpa|lakh)/i.test(t) ? e.lpa : undefined, city };
  },
  async prepare(p) {
    const v = prefs.parse(p);
    if (v.notice_days === undefined && v.expected_ctc === undefined && !v.city)
      return {
        turns: [
          {
            text: "What would you like to update?",
            form: { id: "prefs", tool: "update_my_preferences", submitLabel: "Review", fields: [{ name: "notice_days", label: "Notice period (days, 0 = immediate)", type: "number" }, { name: "expected_ctc", label: "Expected CTC (LPA)", type: "number" }, { name: "city", label: "Current city" }] },
          },
        ],
      };
    const details = [
      v.notice_days !== undefined && `Notice period → ${v.notice_days === 0 ? "Immediate" : `${v.notice_days} days`}`,
      v.expected_ctc !== undefined && `Expected CTC → ₹${v.expected_ctc} LPA`,
      v.city && `Current city → ${v.city}`,
    ].filter(Boolean) as string[];
    return { params: v, confirm: { title: "Update your profile?", details, confirmLabel: "Update" } };
  },
  async execute(p, ctx) {
    const v = prefs.parse(p);
    const candidate: Record<string, unknown> = {};
    if (v.notice_days !== undefined) candidate.notice_period_days = String(v.notice_days);
    if (v.expected_ctc !== undefined) candidate.expected_ctc = String(v.expected_ctc);
    if (v.city) candidate.current_city = v.city;
    const d = await rpc<{ percent?: number }>(ctx, "candidate_update_profile", { p: { candidate } });
    return [{ text: `Updated.${d?.percent != null ? ` Your profile is ${d.percent}% complete.` : ""}`, tone: "success", chips: [{ label: "Jobs for me", tool: "recommended_jobs" }] }];
  },
});

export const requestCallback = defineTool({
  name: "request_callback",
  modes: ["candidate"],
  kind: "action",
  description: "Ask the Synerax team to call the candidate back (optional short note). Asks to confirm first.",
  params: z.object({ note: P.optText(500) }),
  examples: ["call me back", "i want to talk to someone", "can a recruiter call me", "request a call back", "mujhe call karo", "talk to my recruiter", "speak to a person", "need help from a human", "contact my recruiter"],
  keywords: /\b(call (me )?back|callback|talk to|speak to|recruiter|human|person|someone|call karo)\b/,
  extract: () => ({}),
  async prepare(p) {
    return { params: { note: p.note }, confirm: { title: "Ask the Synerax team to call you back?", details: ["They'll call your registered mobile number, usually within one working day."], confirmLabel: "Request call back" } };
  },
  async execute(p, ctx) {
    const ok = await rpc<boolean>(ctx, "chat_request_callback", { p_note: (p.note ? String(p.note) : "Requested from the assistant").slice(0, 500) });
    return [{ text: ok ? "Done — the Synerax team will call you back, usually within one working day." : "You already asked for a call back in the last 24 hours — the team will reach out soon.", tone: ok ? "success" : "normal" } satisfies BotTurn];
  },
});

export const CANDIDATE_TOOLS = [myProfileSummary, myProfileMissing, myApplications, myInterviews, recommendedJobs, jobDetails, applyToJob, withdrawApplication, updatePreferences, requestCallback];
