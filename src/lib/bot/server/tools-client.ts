import { z } from "zod";
import type { BotCard, BotTurn } from "../types";
import { defineTool, P, type BotCtx } from "./registry";
import { remainder } from "./entities";
import { makeMatcher, pick, plural } from "./text";

/* eslint-disable @typescript-eslint/no-explicit-any */

const when = (d: string) => new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const CLOSE_REASONS = ["Filled via Synerax", "Filled internally", "On hold", "Cancelled"] as const;

async function rpc<T = any>(ctx: BotCtx, fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await ctx.sb.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}
const jobs = async (ctx: BotCtx) => ((await rpc<any[]>(ctx, "client_jobs")) ?? []) as any[];

/** the client's own job, by id or (part of) its title */
async function resolveJob(ctx: BotCtx, ref: string | undefined, filter: (j: any) => boolean = () => true) {
  const list = (await jobs(ctx)).filter(filter);
  if (!ref) return { list };
  const byId = list.find((j) => j.id === ref);
  if (byId) return { job: byId, list };
  const hit = makeMatcher(list.map((j) => ({ item: j, text: j.title })))(ref)[0];
  return hit && hit.score >= 0.45 ? { job: hit.item, list } : { list };
}
const pickJob = (list: any[], tool: string, text: string, extra: Record<string, unknown> = {}): BotTurn => ({
  text: list.length ? text : "You don't have any matching jobs.",
  chips: list.slice(0, 8).map((j) => ({ label: j.title, tool, params: { job: j.id, ...extra } })),
});

const jobCard = (j: any): BotCard => ({
  title: j.title,
  subtitle: [(j.locations ?? []).slice(0, 2).join(", "), j.work_mode].filter(Boolean).join(" · ") || undefined,
  badge: j.status,
  meta: `${plural(j.shared ?? 0, "profile")} shared · ${j.pending_decision ?? 0} awaiting you · ${j.interviews ?? 0} interviews`,
  href: `/client/jobs/${j.id}`,
});

export const myCompanyJobs = defineTool({
  name: "my_company_jobs",
  modes: ["client"],
  kind: "read",
  description: "The client company's own jobs with status and counts. Optional status filter.",
  params: z.object({ status: z.enum(["open", "pending_review", "closed", "all"]).optional() }),
  examples: ["my jobs", "show our jobs", "status of my jobs", "which jobs are open", "how many jobs do we have", "jobs pending review", "closed jobs", "hamari jobs dikhao", "all positions", "list my openings", "our open roles"],
  keywords: /\b(my jobs|our jobs|jobs? status|open (jobs|roles|positions)|openings|positions|roles)\b/,
  extract: (t) => ({ status: /pending|review/i.test(t) ? ("pending_review" as const) : /closed|filled/i.test(t) ? ("closed" as const) : /\ball\b/i.test(t) ? ("all" as const) : undefined }),
  async run(p, ctx) {
    const all = await jobs(ctx);
    const list = all.filter((j) => (p.status === "pending_review" ? j.status === "Pending review" : p.status === "closed" ? ["Filled", "Closed", "On Hold"].includes(j.status) : p.status === "all" ? true : j.status === "Open"));
    const word = p.status === "pending_review" ? "pending review" : p.status === "closed" ? "closed or on hold" : p.status === "all" ? "in total" : "open";
    if (!list.length) return [{ text: `You have no jobs ${word}.`, chips: [{ label: "Post a job", tool: "post_job", tone: "primary" }] }];
    return [{ text: pick([`You have ${plural(list.length, "job")} ${word}:`, `${plural(list.length, "job")} ${word}:`], word), cards: list.slice(0, 8).map(jobCard), chips: [{ label: "Pending decisions", tool: "pending_decisions" }] }];
  },
});

export const jobPipelineSummary = defineTool({
  name: "job_pipeline_summary",
  modes: ["client"],
  kind: "read",
  description: "Pipeline numbers for one of the client's jobs (shared, awaiting decision, approved, interviews, offers, joined).",
  params: z.object({ job: P.optText(120) }),
  examples: ["how is the react developer job going", "pipeline for the backend role", "progress on the data analyst position", "status of hiring for designer", "how many profiles for the node job", "react wali job ka kya status hai", "update on the devops opening"],
  keywords: /\b(pipeline|progress|how is .* going|update on)\b/,
  extract: (t) => ({ job: remainder(t, [/\b(pipeline|progress|how|going|update|status|job|role|position|opening|hiring|many|profiles?)\b/g]) || undefined }),
  async run(p, ctx) {
    const r = await resolveJob(ctx, p.job);
    if (!r.job) return [pickJob(r.list, "job_pipeline_summary", "Which job?")];
    const j = r.job;
    return [
      {
        text: pick([`${j.title}: ${plural(j.shared, "profile")} shared, ${j.pending_decision} waiting for your decision.`, `Here's where ${j.title} stands:`], j.id),
        cards: [{ ...jobCard(j), lines: [`Shared ${j.shared} → approved ${j.approved} → interviews ${j.interviews} → offers ${j.offered} → joined ${j.joined}`, `Open for ${plural(j.days_open ?? 0, "day")}`] }],
        chips: j.shared ? [{ label: "See profiles", tool: "shared_profiles", params: { job: j.id } }] : undefined,
      },
    ];
  },
});

export const sharedProfiles = defineTool({
  name: "shared_profiles",
  modes: ["client"],
  kind: "read",
  description: "Candidate profiles Synerax has shared for one of the client's jobs (masked: no contact details).",
  params: z.object({ job: P.optText(120) }),
  examples: ["show profiles for the react job", "candidates shared for backend role", "who has been shared for data analyst", "profiles for designer position", "shared candidates", "react job ke candidates dikhao", "cvs for the node role"],
  keywords: /\b(profiles?|candidates?|cvs?|resumes?)\b.*\b(shared|for)\b|\bshared (profiles|candidates)\b/,
  extract: (t) => ({ job: remainder(t, [/\b(profiles?|candidates?|cvs?|resumes?|shared|who|has|been|for|job|role|position)\b/g]) || undefined }),
  async run(p, ctx) {
    const r = await resolveJob(ctx, p.job, (j) => j.shared > 0);
    if (!r.job) return [pickJob(r.list, "shared_profiles", "Which job's profiles?")];
    const list = ((await rpc<any[]>(ctx, "client_shared_candidates", { p_job: r.job.id })) ?? []) as any[];
    if (!list.length) return [{ text: `No profiles have been shared for ${r.job.title} yet.` }];
    return [
      {
        text: `${plural(list.length, "profile")} shared for ${r.job.title}:`,
        cards: list.slice(0, 8).map((c) => ({
          title: c.name,
          subtitle: [c.current_designation, c.total_experience != null ? `${c.total_experience} yrs` : null, c.current_city].filter(Boolean).join(" · "),
          badge: c.decision ?? undefined,
          meta: [(c.skills ?? []).slice(0, 3).map((s: any) => s.name).join(", "), c.notice_period_days != null ? (c.notice_period_days === 0 ? "Immediate" : `${c.notice_period_days}d notice`) : null].filter(Boolean).join(" · "),
          href: `/client/jobs/${r.job.id}`,
          chips: c.decision === "Pending" ? [{ label: "Approve", tool: "decide_profile", params: { application_id: c.application_id, decision: "Approved" }, tone: "primary" }, { label: "Reject", tool: "decide_profile", params: { application_id: c.application_id, decision: "Rejected" } }] : undefined,
        })),
      },
    ];
  },
});

export const pendingDecisions = defineTool({
  name: "pending_decisions",
  modes: ["client"],
  kind: "read",
  description: "List all profiles waiting for the client's decision (use decide_profile instead when the user names a candidate to approve/reject).",
  params: z.object({}),
  examples: ["pending decisions", "what is waiting for me", "profiles awaiting my decision", "what's pending for me today", "any profiles to review", "kya pending hai", "who do i need to approve", "anything to review", "shortlist pending"],
  keywords: /\b(pending|awaiting|waiting|to review|decisions?)\b/,
  async run(_p, ctx) {
    const d = await rpc<any>(ctx, "client_dashboard");
    const list = (d?.pending ?? []) as any[];
    if (!list.length) return [{ text: "Nothing is waiting for your decision right now. 🎉", chips: [{ label: "Upcoming interviews", tool: "upcoming_interviews" }] }];
    return [
      {
        text: pick([`${plural(d.awaiting_decision ?? list.length, "profile")} ${list.length === 1 ? "is" : "are"} waiting for your decision:`, `You have ${plural(d.awaiting_decision ?? list.length, "profile")} to review:`], String(list.length)),
        cards: list.map((c) => ({
          title: c.name,
          subtitle: [c.current_designation, c.total_experience != null ? `${c.total_experience} yrs` : null].filter(Boolean).join(" · "),
          meta: c.job_title,
          href: `/client/jobs/${c.job_id}`,
          chips: [{ label: "Approve", tool: "decide_profile", params: { application_id: c.application_id, decision: "Approved" }, tone: "primary" }, { label: "Reject", tool: "decide_profile", params: { application_id: c.application_id, decision: "Rejected" } }],
        })),
      },
    ];
  },
});

export const upcomingInterviews = defineTool({
  name: "upcoming_interviews",
  modes: ["client"],
  kind: "read",
  description: "The client's upcoming interviews.",
  params: z.object({}),
  examples: ["upcoming interviews", "interviews this week", "when are the interviews", "interview schedule", "any interviews today", "interviews kab hain", "next interview", "who am i interviewing"],
  keywords: /\binterviews?\b/,
  async run(_p, ctx) {
    const d = await rpc<any>(ctx, "client_dashboard");
    const list = ((d?.interviews ?? []) as any[]).filter((i) => new Date(i.scheduled_at).getTime() > Date.now() - 2 * 3600e3);
    if (!list.length) return [{ text: "There are no upcoming interviews.", chips: [{ label: "Pending decisions", tool: "pending_decisions" }] }];
    return [{ text: list.length === 1 ? `Your next interview is ${when(list[0].scheduled_at)}.` : `You have ${plural(list.length, "upcoming interview")}:`, cards: list.map((i) => ({ title: `${i.name} — ${i.round ?? "Interview"}`, subtitle: i.job_title, meta: `${when(i.scheduled_at)}${i.mode ? ` · ${i.mode}` : ""}`, href: `/client/jobs/${i.job_id}` })) }];
  },
});

const draft = z.object({
  title: P.optText(160),
  locations: z.union([z.array(z.string().max(60)).max(10), z.string().max(300)]).optional(),
  work_mode: z.enum(["Onsite", "Hybrid", "Remote"]).optional(),
  exp_min: P.optNum(0, 50),
  exp_max: P.optNum(0, 50),
  openings: P.optNum(1, 500),
  skills: z.union([z.array(z.string().max(60)).max(20), z.string().max(400)]).optional(),
  description: P.optText(4000),
});
const list = (v: unknown) => (Array.isArray(v) ? v : String(v ?? "").split(/[,;\n]/)).map((x) => String(x).trim()).filter(Boolean).slice(0, 15);

export const postJob = defineTool({
  name: "post_job",
  modes: ["client"],
  kind: "action",
  description: "Post a new job (when the client wants to hire for a role, e.g. 'I want to hire a React developer'). Saved as Pending review for Synerax. Collect title, location, work mode, experience, openings, skills.",
  params: draft,
  examples: ["post a new job", "i want to hire a react developer", "create a job for a data analyst", "add a new position", "we need 2 java developers in pune", "new requirement", "naya job post karna hai", "open a role for a designer", "post a job for qa engineer with 3-5 years"],
  keywords: /\b(post (a )?(new )?job|new (job|role|position|requirement|opening)|create (a )?(job|role)|add (a )?(job|role|position)|want to hire|need \d+)\b/,
  extract: (t, e) => {
    const title = t.match(/\b(?:for|hire|hiring)\s+(?:a|an|\d+)?\s*([a-z][a-z .+#/-]{2,40}?(?:developer|engineer|analyst|designer|manager|executive|lead|nurse|accountant|tester|consultant|architect|specialist|associate))/i)?.[1];
    const em = t.match(/(\d{1,2})\s*(?:-|to)\s*(\d{1,2})\s*(?:years?|yrs?)/i);
    const op = t.match(/\b(?:need|hire|hiring)\s+(\d{1,3})\b/i);
    return { title: title?.trim().replace(/\b\w/g, (c) => c.toUpperCase()), locations: e.cities, work_mode: e.workMode, exp_min: em ? Number(em[1]) : undefined, exp_max: em ? Number(em[2]) : undefined, openings: op ? Number(op[1]) : undefined, skills: e.skills };
  },
  async prepare(p) {
    const v = draft.parse(p);
    if (!v.title)
      return {
        turns: [
          {
            text: "Let's post it. Fill in the basics — it's saved as Pending review and the Synerax team publishes it.",
            form: {
              id: "post-job",
              tool: "post_job",
              submitLabel: "Review",
              initial: { locations: list(v.locations).join(", "), skills: list(v.skills).join(", "), work_mode: v.work_mode ?? "", exp_min: v.exp_min?.toString() ?? "", exp_max: v.exp_max?.toString() ?? "", openings: v.openings?.toString() ?? "" },
              fields: [
                { name: "title", label: "Job title", required: true, placeholder: "e.g. Senior React Developer" },
                { name: "locations", label: "Location(s)", placeholder: "Bengaluru, Pune" },
                { name: "work_mode", label: "Work mode", type: "select", options: ["Onsite", "Hybrid", "Remote"] },
                { name: "exp_min", label: "Min experience (yrs)", type: "number" },
                { name: "exp_max", label: "Max experience (yrs)", type: "number" },
                { name: "openings", label: "Openings", type: "number" },
                { name: "skills", label: "Key skills (comma separated)" },
                { name: "description", label: "Short description", type: "textarea" },
              ],
            },
            link: { label: "Use the full form", href: "/client/jobs/new" },
          },
        ],
      };
    const details = [
      list(v.locations).length ? `Location: ${list(v.locations).join(", ")}` : "",
      v.work_mode ? `Work mode: ${v.work_mode}` : "",
      v.exp_min != null || v.exp_max != null ? `Experience: ${v.exp_min ?? 0}–${v.exp_max ?? "any"} yrs` : "",
      v.openings ? `Openings: ${v.openings}` : "",
      list(v.skills).length ? `Skills: ${list(v.skills).join(", ")}` : "",
      "Saved as Pending review — Synerax publishes it after a quick check.",
    ].filter(Boolean);
    return { params: v, confirm: { title: `Post "${v.title}"?`, details, confirmLabel: "Post job" } };
  },
  async execute(p, ctx) {
    const v = draft.parse(p);
    const id = await rpc<string>(ctx, "client_save_job", {
      p: {
        job: { title: v.title, locations: list(v.locations), work_mode: v.work_mode ?? "", exp_min: v.exp_min ?? "", exp_max: v.exp_max ?? "", openings: v.openings ?? 1, description: v.description ?? "" },
        skills: list(v.skills).map((name) => ({ name, is_mandatory: true })),
      },
    });
    ctx.defer(async () => (await import("@/lib/email/notify-events")).onClientJobSaved(id, true));
    return [{ text: "Posted! It's now Pending review — we'll email you as soon as it's live.", tone: "success", link: { label: "Open the job", href: `/client/jobs/${id}` } }];
  },
});

export const closeJob = defineTool({
  name: "close_job",
  modes: ["client"],
  kind: "action",
  description: "Close one of the client's open jobs with a reason (Filled via Synerax, Filled internally, On hold, Cancelled).",
  params: z.object({ job: P.optText(120), reason: z.enum(CLOSE_REASONS).optional() }),
  examples: ["close the react developer job", "we filled the backend role", "put the designer job on hold", "cancel the data analyst opening", "close a job", "job band karo", "position filled internally", "stop hiring for qa role"],
  keywords: /\b(close|closing|filled|on hold|cancel|stop hiring|band karo)\b/,
  extract: (t) => ({
    job: remainder(t, [/\b(close|closing|filled|fill|we|put|on|hold|cancel|stop|hiring|band|karo|internally|via|synerax|job|role|position|opening)\b/g]) || undefined,
    reason: /internal/i.test(t) ? ("Filled internally" as const) : /hold|pause/i.test(t) ? ("On hold" as const) : /cancel|stop/i.test(t) ? ("Cancelled" as const) : /filled|hired/i.test(t) ? ("Filled via Synerax" as const) : undefined,
  }),
  async prepare(p, ctx) {
    const r = await resolveJob(ctx, p.job, (j) => j.status === "Open" || j.status === "On Hold" || j.status === "Pending review");
    if (!r.job) return { turns: [pickJob(r.list, "close_job", "Which job do you want to close?", p.reason ? { reason: p.reason } : {})] };
    if (!p.reason) return { turns: [{ text: `Why are you closing ${r.job.title}?`, chips: CLOSE_REASONS.map((reason) => ({ label: reason, tool: "close_job", params: { job: r.job.id, reason } })) }] };
    return { params: { job: r.job.id, reason: p.reason }, confirm: { title: `Close ${r.job.title}?`, details: [`Reason: ${p.reason}`, "Synerax will stop sourcing for this role."], confirmLabel: "Close job" } };
  },
  async execute(p, ctx) {
    await rpc(ctx, "client_close_job", { p_job: p.job, p_reason: p.reason });
    ctx.defer(async () => (await import("@/lib/email/notify-events")).onClientJobChanged(String(p.job), "closed", String(p.reason)));
    return [{ text: `Done — the job is closed (${p.reason}).`, tone: "success", chips: [{ label: "My jobs", tool: "my_company_jobs" }] }];
  },
});

const decision = z.object({ application_id: P.optText(60), candidate: P.optText(80), decision: z.enum(["Approved", "Rejected"]).optional(), reason: P.optText(200), feedback: P.optText(1000) });
export const decideProfile = defineTool({
  name: "decide_profile",
  modes: ["client"],
  kind: "action",
  description: "Approve or reject ONE named candidate profile waiting for the client (e.g. 'approve Kabir', 'go ahead with Aarav', 'reject Rohan'). Put the name in candidate. Reject needs a reason and feedback.",
  params: decision,
  examples: ["approve diya", "reject this candidate", "shortlist aarav for interview", "we want to interview kabir", "not suitable reject him", "approve the first profile", "move forward with ananya", "decline rohan"],
  keywords: /\b(approve|reject|decline|shortlist|move forward|not suitable|interview (him|her))\b/,
  extract: (t, e) => ({ decision: e.decision, candidate: remainder(t, [/\b(approve|approved|reject|rejected|decline|shortlist|move|forward|with|not|suitable|this|candidate|profile|him|her|for|interview|we|want|first|the)\b/g]) || undefined }),
  async prepare(p, ctx) {
    const d = await rpc<any>(ctx, "client_dashboard");
    const pending = (d?.pending ?? []) as any[];
    let app = p.application_id ? pending.find((a) => a.application_id === p.application_id) : undefined;
    if (!app && p.candidate) app = makeMatcher(pending.map((a) => ({ item: a, text: a.name })))(p.candidate).find((h) => h.score >= 0.5)?.item;
    if (!app) {
      if (!pending.length) return { turns: [{ text: "There are no profiles waiting for your decision." }] };
      return { turns: [{ text: "Which profile?", chips: pending.slice(0, 6).flatMap((a) => [{ label: `Approve ${a.name.split(" ")[0]}`, tool: "decide_profile", params: { application_id: a.application_id, decision: "Approved" } }, { label: `Reject ${a.name.split(" ")[0]}`, tool: "decide_profile", params: { application_id: a.application_id, decision: "Rejected" } }]) }] };
    }
    if (!p.decision) return { turns: [{ text: `Approve or reject ${app.name} for ${app.job_title}?`, chips: [{ label: "Approve", tool: "decide_profile", params: { application_id: app.application_id, decision: "Approved" }, tone: "primary" }, { label: "Reject", tool: "decide_profile", params: { application_id: app.application_id, decision: "Rejected" } }] }] };
    if (p.decision === "Rejected" && (!p.reason || !p.feedback))
      return {
        turns: [
          {
            text: `Tell us why ${app.name} isn't a fit — it helps us send better profiles.`,
            form: {
              id: "reject",
              tool: "decide_profile",
              submitLabel: "Review",
              initial: { application_id: app.application_id, decision: "Rejected", reason: p.reason ?? "" },
              fields: [
                { name: "reason", label: "Reason", type: "select", required: true, options: ["Skills don't match", "Experience too low", "Experience too high", "Salary expectations", "Notice period too long", "Location", "Other"] },
                { name: "feedback", label: "Feedback for Synerax", type: "textarea", required: true },
              ],
            },
          },
        ],
      };
    return {
      params: { application_id: app.application_id, decision: p.decision, reason: p.reason, feedback: p.feedback },
      confirm: { title: `${p.decision === "Approved" ? "Approve" : "Reject"} ${app.name}?`, details: [app.job_title, p.decision === "Approved" ? "Synerax will arrange the interview." : `Reason: ${p.reason}`], confirmLabel: p.decision === "Approved" ? "Approve" : "Reject" },
    };
  },
  async execute(p, ctx) {
    await rpc(ctx, "client_decide", { p_application: p.application_id, p_decision: p.decision, p_reason: p.reason ?? null, p_feedback: p.feedback ?? null });
    ctx.defer(async () => (await import("@/lib/email/notify-events")).onClientDecision(String(p.application_id)));
    return [{ text: p.decision === "Approved" ? "Approved — Synerax will arrange the interview." : "Rejected — thanks for the feedback.", tone: "success", chips: [{ label: "Pending decisions", tool: "pending_decisions" }] }];
  },
});

export const messageSynerax = defineTool({
  name: "message_synerax",
  modes: ["client"],
  kind: "action",
  description: "Send a message to the Synerax team in the client's chat thread (a person replies).",
  params: z.object({ text: P.optText(2000) }),
  examples: ["talk to synerax", "message my account manager", "i want to speak to someone", "send a message to synerax", "contact the team", "synerax se baat karni hai", "talk to a human", "escalate this"],
  keywords: /\b(talk to|speak to|message|contact|human|person|account manager|someone|escalate|baat)\b/,
  extract: () => ({}),
  async prepare(p) {
    if (!p.text)
      return { turns: [{ text: "What would you like to tell the Synerax team?", form: { id: "msg", tool: "message_synerax", submitLabel: "Review", fields: [{ name: "text", label: "Message", type: "textarea", required: true }] } }] };
    return { params: { text: p.text }, confirm: { title: "Send this to the Synerax team?", details: [String(p.text).slice(0, 300)], confirmLabel: "Send" } };
  },
  async execute(p, ctx) {
    const id = await rpc<string>(ctx, "chat_my_thread", { p_create: true });
    await rpc(ctx, "chat_send", { p_conversation: id, p_body: String(p.text) });
    return [{ text: "Sent — the Synerax team will reply in Messages.", tone: "success", link: { label: "Open messages", href: `/client/messages?c=${id}` } }];
  },
});

export const CLIENT_TOOLS = [myCompanyJobs, jobPipelineSummary, sharedProfiles, pendingDecisions, upcomingInterviews, postJob, closeJob, decideProfile, messageSynerax];
