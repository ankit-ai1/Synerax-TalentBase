import { z } from "zod";
import { istDayRange } from "@/lib/utils";
import type { BotCard } from "../types";
import { defineTool, P, type BotCtx } from "./registry";
import { remainder } from "./entities";
import { pick, plural } from "./text";

/* eslint-disable @typescript-eslint/no-explicit-any */

const STAFF = ["hr", "admin"] as const;
const time = (d: string) => new Date(d).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" });
const day = (d: string) => new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const name = (c: any) => [c?.first_name, c?.last_name].filter(Boolean).join(" ") || "Candidate";
const since = (range?: string) => new Date(Date.now() - (range === "month" ? 30 : range === "week" ? 7 : 1) * 864e5).toISOString();
const rangeWord = (range?: string) => (range === "month" ? "in the last 30 days" : range === "week" ? "in the last 7 days" : "today");

async function q<T = any>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data as T;
}

const candCard = (c: any): BotCard => ({
  title: name(c),
  subtitle: [c.current_designation || c.headline, c.current_company].filter(Boolean).join(" @ ") || undefined,
  meta: [c.total_experience != null ? `${c.total_experience} yrs` : "", c.current_city, c.notice_period_days != null ? (c.notice_period_days === 0 ? "Immediate" : `${c.notice_period_days}d notice`) : ""].filter(Boolean).join(" · "),
  badge: c.status ?? undefined,
  href: `/candidates/${c.id}`,
});

export const searchCandidates = defineTool({
  name: "search_candidates",
  modes: [...STAFF],
  kind: "read",
  description: "Search the candidate database by keyword/skill, city, experience range and max notice period.",
  params: z.object({ q: P.optText(100), skills: z.array(z.string().max(60)).max(5).optional(), location: P.optText(60), exp_min: P.optNum(0, 50), exp_max: P.optNum(0, 50), notice_max: P.optNum(0, 365) }),
  examples: ["find react developers in pune", "search candidates with java", "candidates with 5 years experience in bangalore", "immediate joiners for node.js", "show me data analysts", "python developers under 30 days notice", "koi react developer hai kya", "search for nurses in chennai", "devops candidates", "find a product designer"],
  keywords: /\b(find|search|candidates?|developers?|engineers?|analysts?|designers?|joiners?|profiles? with)\b/,
  extract: (t, e) => ({ skills: e.skills.slice(0, 3), location: e.cities[0], exp_min: e.years, notice_max: e.noticeDays ?? (/immediate/i.test(t) ? 15 : undefined), q: e.skills.length ? undefined : remainder(t, [/\b(find|search|candidates?|with|in|years?|experience|show|any|koi|hai|kya|under|days?|notice|immediate|joiners?)\b/g]) || undefined }),
  async run(p, ctx) {
    let skillIds: string[] = [];
    if (p.skills?.length) {
      const rows = await q<any[]>(ctx.sb.from("skills").select("id, name").in("name", p.skills));
      skillIds = rows.map((r) => r.id);
    }
    const res = await q<any>(ctx.sb.rpc("search_candidates", { f: { q: p.q ?? "", skills: skillIds, locations: p.location ? [p.location] : [], exp_min: p.exp_min ?? "", exp_max: p.exp_max ?? "", notice_max: p.notice_max ?? "", page_size: 6 } }));
    const items = (res?.items ?? []) as any[];
    const what = [p.skills?.join(", ") || p.q, p.location && `in ${p.location}`, p.exp_min != null && `${p.exp_min}+ yrs`, p.notice_max != null && `≤${p.notice_max}d notice`].filter(Boolean).join(" ");
    if (!items.length) return [{ text: `No candidates found${what ? ` for ${what}` : ""}.`, link: { label: "Open advanced search", href: "/candidates" } }];
    return [{ text: `${plural(res.total ?? items.length, "candidate")} found${what ? ` for ${what}` : ""}${(res.total ?? 0) > items.length ? ` — top ${items.length}` : ""}:`, cards: items.map(candCard), link: { label: "See all in search", href: "/candidates" } }];
  },
});

export const candidateSummary = defineTool({
  name: "candidate_summary",
  modes: [...STAFF],
  kind: "read",
  description: "Summary of ONE candidate when a name or candidate code is given ('who is Diya Verma', 'tell me about Aarav').",
  params: z.object({ candidate: P.text(80) }),
  examples: ["tell me about aarav sharma", "candidate summary for kabir", "who is diya verma", "details of CAND-00012", "what's the status of priya desai", "aarav ka profile", "show rohan gupta"],
  keywords: /\b(about|summary|who is|details of|profile of|cand-\d+)\b/,
  extract: (t) => ({ candidate: remainder(t, [/\b(about|summary|who|is|details|candidate|status|whats|what|ka|ki|ke)\b/g]) || undefined }),
  async run(p, ctx) {
    const term = String(p.candidate).trim();
    const code = term.match(/cand-?\d+/i)?.[0];
    let query = ctx.sb.from("candidates").select("id, first_name, last_name, headline, current_designation, current_company, current_city, total_experience, notice_period_days, expected_ctc, status, candidate_code").eq("is_archived", false).limit(5);
    if (code) query = query.ilike("candidate_code", code.toUpperCase().replace(/^CAND-?/, "CAND-"));
    else {
      const parts = term.split(/\s+/).filter((w) => w.length > 1).slice(0, 2);
      if (!parts.length) return [{ text: "Which candidate? Type their name or candidate code." }];
      query = query.ilike("first_name", `${parts[0]}%`);
      if (parts[1]) query = query.ilike("last_name", `${parts[1]}%`);
    }
    const rows = await q<any[]>(query);
    if (!rows.length) return [{ text: `I couldn't find a candidate called "${term}".`, link: { label: "Search candidates", href: "/candidates" } }];
    if (rows.length > 1) return [{ text: `I found ${rows.length} matches — which one?`, cards: rows.map(candCard) }];
    const c = rows[0];
    const apps = await q<any[]>(ctx.sb.from("applications").select("stage, job:jobs(id, title)").eq("candidate_id", c.id).not("stage", "in", "(Rejected,Dropped,Joined)").limit(5));
    return [{ text: `${name(c)} — ${c.current_designation ?? "no current role"}${c.current_company ? ` at ${c.current_company}` : ""}.`, cards: [{ ...candCard(c), lines: [`Code ${c.candidate_code} · Expected ${c.expected_ctc != null ? `₹${c.expected_ctc} LPA` : "—"}`, apps.length ? `Active: ${apps.map((a) => `${a.job?.title} (${a.stage})`).join(", ")}` : "Not in any active pipeline"] }] }];
  },
});

export const jobSummary = defineTool({
  name: "job_summary",
  modes: [...STAFF],
  kind: "read",
  description: "Summary of one job by title or job code: client, status, pipeline counts by stage.",
  params: z.object({ job: P.text(120) }),
  examples: ["how is the senior react developer job doing", "job summary for node.js backend", "pipeline of the data analyst job", "status of JOB-0012", "how many candidates in the devops role", "react job ka status"],
  keywords: /\b(job summary|pipeline of|how is the .* job|job-\d+)\b/,
  extract: (t) => ({ job: remainder(t, [/\b(how|is|the|job|summary|pipeline|of|doing|status|many|candidates|in|role|ka)\b/g]) || undefined }),
  async run(p, ctx) {
    const term = String(p.job).trim();
    const code = term.match(/job-?\d+/i)?.[0];
    let query = ctx.sb.from("jobs").select("id, title, status, job_code, openings, client:clients(name)").is("client_deleted_at", null).limit(5);
    query = code ? query.ilike("job_code", code.toUpperCase().replace(/^JOB-?/, "JOB-")) : query.ilike("title", `%${term.split(/\s+/).slice(0, 3).join("%")}%`);
    const rows = await q<any[]>(query);
    if (!rows.length) return [{ text: `I couldn't find a job matching "${term}".`, link: { label: "All jobs", href: "/jobs" } }];
    if (rows.length > 1) return [{ text: "Which job?", cards: rows.map((j) => ({ title: j.title, subtitle: j.client?.name ?? "Internal", badge: j.status, href: `/jobs/${j.id}` })) }];
    const j = rows[0];
    const apps = await q<any[]>(ctx.sb.from("applications").select("stage").eq("job_id", j.id));
    const by = apps.reduce<Record<string, number>>((m, a) => ((m[a.stage] = (m[a.stage] ?? 0) + 1), m), {});
    return [{ text: `${j.title} (${j.client?.name ?? "Internal"}) is ${j.status} with ${plural(apps.length, "candidate")} in the pipeline.`, cards: [{ title: j.title, subtitle: `${j.job_code} · ${j.client?.name ?? "Internal"} · ${plural(j.openings ?? 1, "opening")}`, badge: j.status, lines: [Object.entries(by).map(([s, n]) => `${s} ${n}`).join(" · ") || "No candidates yet"], href: `/jobs/${j.id}` }] }];
  },
});

export const jobsOverview = defineTool({
  name: "jobs_overview",
  modes: [...STAFF],
  kind: "read",
  description: "How many jobs/positions are open right now: open jobs, total openings, on hold, pending review, and which clients have the most.",
  params: z.object({}),
  examples: ["how many job positions are there", "how many open jobs do we have", "open positions", "jobs overview", "kitni jobs open hain", "total openings", "how many vacancies are open", "which jobs are open", "jobs by client", "how many positions are we hiring for", "count of open jobs", "active jobs"],
  keywords: /\b(how many|kitni|count|total|number of)\b.*\b(jobs?|positions?|openings?|vacanc\w*|roles?)\b|\b(open (jobs|positions|roles)|jobs overview|active jobs|total openings)\b/,
  async run(_p, ctx) {
    const rows = await q<any[]>(ctx.sb.from("jobs").select("id, title, status, openings, priority, client:clients(name)").is("client_deleted_at", null).in("status", ["Open", "On Hold", "Pending review"]).order("created_at", { ascending: false }).limit(300));
    const open = rows.filter((j) => j.status === "Open");
    const openings = open.reduce((s, j) => s + (j.openings ?? 1), 0);
    const hold = rows.filter((j) => j.status === "On Hold").length;
    const review = rows.filter((j) => j.status === "Pending review").length;
    if (!open.length && !hold && !review) return [{ text: "There are no open jobs right now.", link: { label: "All jobs", href: "/jobs" } }];
    const byClient = open.reduce<Record<string, number>>((m, j) => ((m[j.client?.name ?? "Internal"] = (m[j.client?.name ?? "Internal"] ?? 0) + 1), m), {});
    const top = Object.entries(byClient).sort((a, b) => b[1] - a[1]).slice(0, 4);
    return [
      {
        text: `There ${open.length === 1 ? "is" : "are"} ${plural(open.length, "open job")} with ${plural(openings, "position")} to fill${hold ? `, ${hold} on hold` : ""}${review ? ` and ${review} waiting for review` : ""}.`,
        cards: [
          ...(top.length ? [{ title: "By client", lines: top.map(([c, n]) => `${c}: ${plural(n, "open job")}`) }] : []),
          ...open.slice(0, 5).map((j) => ({ title: j.title, subtitle: j.client?.name ?? "Internal", meta: `${plural(j.openings ?? 1, "opening")} · ${j.priority ?? ""}`.replace(/ · $/, ""), href: `/jobs/${j.id}` })),
        ],
        link: { label: "All jobs", href: "/jobs" },
        chips: review ? [{ label: "Pending review", tool: "jobs_pending_review" }] : undefined,
      },
    ];
  },
});

export const jobsPendingReview = defineTool({
  name: "jobs_pending_review",
  modes: [...STAFF],
  kind: "read",
  description: "Client-posted jobs waiting for Synerax review.",
  params: z.object({}),
  examples: ["jobs pending review", "which jobs need review", "new client jobs", "pending jobs to publish", "review queue", "kaun si jobs review mein hain", "jobs waiting for approval"],
  keywords: /\b(pending review|review queue|to publish|need(s)? review|waiting for approval|new client jobs)\b/,
  async run(_p, ctx) {
    const rows = await q<any[]>(ctx.sb.from("jobs").select("id, title, created_at, client:clients(name)").eq("status", "Pending review").order("created_at").limit(8));
    if (!rows.length) return [{ text: "No jobs are waiting for review." }];
    return [{ text: `${plural(rows.length, "job")} waiting for review:`, cards: rows.map((j) => ({ title: j.title, subtitle: j.client?.name, meta: `Posted ${day(j.created_at)}`, href: `/jobs/${j.id}` })), link: { label: "Open review queue", href: "/jobs/review" } }];
  },
});

export const todaysInterviews = defineTool({
  name: "todays_interviews",
  modes: [...STAFF],
  kind: "read",
  description: "Interviews scheduled for today.",
  params: z.object({}),
  examples: ["today's interviews", "interviews today", "who is interviewing today", "any interviews scheduled today", "aaj ke interviews", "what interviews do we have today", "interview schedule for today"],
  keywords: /\binterviews?\b/,
  async run(_p, ctx) {
    const { from, to } = istDayRange();
    const rows = await q<any[]>(ctx.sb.from("interviews").select("id, round_name, mode, scheduled_at, status, application:applications(candidate:candidates(id, first_name, last_name), job:jobs(title))").gte("scheduled_at", from).lt("scheduled_at", to).neq("status", "Cancelled").order("scheduled_at"));
    if (!rows.length) return [{ text: "No interviews today.", link: { label: "Interview calendar", href: "/interviews" } }];
    return [{ text: pick([`${plural(rows.length, "interview")} today:`, `Today's schedule has ${plural(rows.length, "interview")}:`], String(rows.length)), cards: rows.map((i) => ({ title: `${time(i.scheduled_at)} · ${name(i.application?.candidate)}`, subtitle: `${i.round_name} — ${i.application?.job?.title ?? ""}`, meta: `${i.mode} · ${i.status}`, href: i.application?.candidate?.id ? `/candidates/${i.application.candidate.id}` : "/interviews" })) }];
  },
});

export const overdueTasks = defineTool({
  name: "overdue_tasks",
  modes: [...STAFF],
  kind: "read",
  description: "The current staff member's open follow-ups that are overdue or due today.",
  params: z.object({}),
  examples: ["my overdue tasks", "what follow-ups are due", "pending tasks", "tasks for today", "what do i need to do today", "mere pending tasks", "any overdue follow ups", "to do list"],
  keywords: /\b(tasks?|follow[- ]?ups?|to ?do|overdue|due)\b/,
  async run(_p, ctx) {
    const { to } = istDayRange();
    const rows = await q<any[]>(ctx.sb.from("tasks").select("id, title, due_at, priority, candidate:candidates(id, first_name, last_name)").eq("status", "Open").eq("assigned_to", ctx.userId).lt("due_at", to).order("due_at").limit(10));
    if (!rows.length) return [{ text: "You're all caught up — no overdue or due-today tasks. ✅", link: { label: "All tasks", href: "/tasks" } }];
    const overdue = rows.filter((t) => new Date(t.due_at).getTime() < Date.now()).length;
    return [{ text: `${plural(rows.length, "task")} due${overdue ? ` (${overdue} overdue)` : " today"}:`, cards: rows.map((t) => ({ title: t.title, subtitle: t.candidate ? name(t.candidate) : undefined, meta: `${new Date(t.due_at).getTime() < Date.now() ? "Overdue · " : ""}${day(t.due_at)} · ${t.priority}`, href: "/tasks" })) }];
  },
});

export const awaitingClientDecision = defineTool({
  name: "awaiting_client_decision",
  modes: [...STAFF],
  kind: "read",
  description: "Profiles shared with clients that are still waiting for the client's decision (oldest first).",
  params: z.object({}),
  examples: ["awaiting client decision", "which profiles are pending with clients", "client feedback pending", "shared profiles waiting", "what are clients sitting on", "client ka feedback pending", "follow up with clients on profiles"],
  keywords: /\b(client (decision|feedback)|pending with clients?|awaiting client|shared .* waiting)\b/,
  async run(_p, ctx) {
    const rows = await q<any[]>(ctx.sb.from("applications").select("id, shared_at, candidate:candidates(id, first_name, last_name), job:jobs(id, title, client:clients(name))").eq("shared_with_client", true).eq("client_decision", "Pending").order("shared_at").limit(10));
    if (!rows.length) return [{ text: "No profiles are waiting on clients." }];
    return [{ text: `${plural(rows.length, "profile")} waiting for a client decision (oldest first):`, cards: rows.map((a) => ({ title: name(a.candidate), subtitle: `${a.job?.title} — ${a.job?.client?.name ?? ""}`, meta: a.shared_at ? `Shared ${day(a.shared_at)}` : undefined, href: a.job?.id ? `/jobs/${a.job.id}` : undefined })) }];
  },
});

export const unreadMessages = defineTool({
  name: "unread_messages",
  modes: [...STAFF],
  kind: "read",
  description: "Chat conversations with unread messages.",
  params: z.object({}),
  examples: ["unread messages", "any new messages", "who messaged me", "inbox", "chats waiting for reply", "naye messages", "do i have messages"],
  keywords: /\b(messages?|inbox|chats?|unread|replies)\b/,
  async run(_p, ctx) {
    const list = ((await q<any[]>(ctx.sb.rpc("chat_list", { p: { limit: 50 } }))) ?? []).filter((c) => c.unread > 0);
    if (!list.length) return [{ text: "No unread messages. 📭", link: { label: "Open Messages", href: "/messages" } }];
    return [{ text: `${plural(list.length, "conversation")} with unread messages:`, cards: list.slice(0, 6).map((c) => ({ title: c.title, subtitle: c.type === "client" ? "Client" : "Candidate", badge: `${c.unread} new`, meta: c.last_message_preview ?? undefined, href: `/messages?c=${c.id}` })) }];
  },
});

export const dailySummary = defineTool({
  name: "daily_summary",
  modes: [...STAFF],
  kind: "read",
  description: "Today at a glance: interviews, overdue tasks, jobs pending review, profiles awaiting clients, unread chats, new registrations.",
  params: z.object({}),
  examples: ["daily summary", "what's pending for me today", "give me today's summary", "what's happening today", "my day", "aaj ka summary", "morning brief", "what should i focus on today", "status update"],
  keywords: /\b(summary|my day|brief|focus|what'?s (pending|happening))\b/,
  async run(_p, ctx) {
    const { from, to } = istDayRange();
    const head = { count: "exact" as const, head: true };
    const [iv, tasks, review, awaiting, regs, unread] = await Promise.all([
      ctx.sb.from("interviews").select("id", head).gte("scheduled_at", from).lt("scheduled_at", to).neq("status", "Cancelled"),
      ctx.sb.from("tasks").select("id", head).eq("status", "Open").eq("assigned_to", ctx.userId).lt("due_at", to),
      ctx.sb.from("jobs").select("id", head).eq("status", "Pending review"),
      ctx.sb.from("applications").select("id", head).eq("shared_with_client", true).eq("client_decision", "Pending"),
      ctx.sb.from("candidates").select("id", head).not("user_id", "is", null).gte("created_at", since("day")),
      ctx.sb.rpc("chat_unread_total"),
    ]);
    const n = { iv: iv.count ?? 0, tasks: tasks.count ?? 0, review: review.count ?? 0, awaiting: awaiting.count ?? 0, regs: regs.count ?? 0, unread: typeof unread.data === "number" ? unread.data : 0 };
    return [
      {
        text: `${pick(["Here's your day", "Today at a glance", "Your summary for today"], ctx.userId ?? "")}${ctx.firstName ? `, ${ctx.firstName}` : ""}:`,
        cards: [
          {
            title: "Today",
            lines: [`📅 ${plural(n.iv, "interview")}`, `✅ ${plural(n.tasks, "task")} due or overdue`, `📝 ${plural(n.review, "job")} pending review`, `⏳ ${plural(n.awaiting, "profile")} waiting on clients`, `💬 ${plural(n.unread, "unread chat")}`, `🆕 ${plural(n.regs, "new registration")} in 24 h`],
          },
        ],
        chips: [
          n.iv ? { label: "Today's interviews", tool: "todays_interviews" } : null,
          n.tasks ? { label: "My tasks", tool: "overdue_tasks" } : null,
          n.review ? { label: "Pending review", tool: "jobs_pending_review" } : null,
          n.awaiting ? { label: "Awaiting clients", tool: "awaiting_client_decision" } : null,
          n.unread ? { label: "Unread chats", tool: "unread_messages" } : null,
        ].filter(Boolean) as { label: string; tool: string }[],
      },
    ];
  },
});

const taskSchema = z.object({ title: P.optText(200), due: z.enum(["today", "tomorrow"]).optional(), candidate: P.optText(80) });
export const createTask = defineTool({
  name: "create_task",
  modes: [...STAFF],
  kind: "action",
  description: "Create a follow-up task for yourself (title, due today or tomorrow, optional candidate name).",
  params: taskSchema,
  examples: ["remind me to call aarav tomorrow", "create a task to follow up with nimbus", "add a follow up for today", "new task: send offer letter", "remind me to check references", "task banao kal ke liye", "set a reminder to call the client"],
  keywords: /\b(remind me|create (a )?task|add (a )?(task|follow[- ]?up)|new task|reminder|task banao)\b/,
  extract: (t, e) => ({ title: t.replace(/^(please\s+)?(remind me to|create a task to|add a follow up to|new task:?|set a reminder to)\s*/i, "").replace(/\b(today|tomorrow|kal)\b/gi, "").trim().slice(0, 200) || undefined, due: e.due ?? (/\bkal\b/i.test(t) ? "tomorrow" : undefined) }),
  async prepare(p, ctx) {
    const v = taskSchema.parse(p);
    if (!v.title) return { turns: [{ text: "What's the task?", form: { id: "task", tool: "create_task", submitLabel: "Review", fields: [{ name: "title", label: "Task", required: true }, { name: "due", label: "Due", type: "select", options: ["today", "tomorrow"] }] } }] };
    void ctx;
    return { params: { ...v, due: v.due ?? "today" }, confirm: { title: "Create this task for you?", details: [v.title, `Due ${v.due ?? "today"}`], confirmLabel: "Create task" } };
  },
  async execute(p, ctx) {
    const v = taskSchema.parse(p);
    const { from } = istDayRange(v.due === "tomorrow" ? 1 : 0);
    const due = new Date(new Date(from).getTime() + 18 * 3600e3).toISOString(); // 6 PM IST
    await q(ctx.sb.from("tasks").insert({ title: v.title, due_at: due, priority: "Normal", status: "Open", assigned_to: ctx.userId, created_by: ctx.userId }).select("id").single());
    return [{ text: `Task created for ${v.due ?? "today"}.`, tone: "success", link: { label: "My tasks", href: "/tasks" } }];
  },
});

// ---------------------------------------------------------------- admin only
export const teamOverview = defineTool({
  name: "team_overview",
  modes: ["admin"],
  kind: "read",
  description: "Admin: team members with their open tasks and assigned conversations.",
  params: z.object({}),
  examples: ["team overview", "how is the team doing", "who has the most tasks", "team workload", "show my team", "team ka status"],
  keywords: /\b(team|workload|staff|recruiters)\b/,
  async run(_p, ctx) {
    const staff = await q<any[]>(ctx.sb.from("profiles").select("id, full_name, role").in("role", ["admin", "hr"]).eq("is_active", true).order("full_name"));
    const [tasks, convs] = await Promise.all([q<any[]>(ctx.sb.from("tasks").select("assigned_to").eq("status", "Open")), q<any[]>(ctx.sb.from("conversations").select("assigned_to").eq("status", "open"))]);
    const count = (rows: any[], id: string) => rows.filter((r) => r.assigned_to === id).length;
    return [{ text: `${plural(staff.length, "active team member")}:`, cards: staff.map((s) => ({ title: s.full_name || "Team member", badge: s.role === "admin" ? "Admin" : "HR", meta: `${plural(count(tasks, s.id), "open task")} · ${plural(count(convs, s.id), "open chat")}` })), link: { label: "Team & access", href: "/admin/users" } }];
  },
});

export const activitySummary = defineTool({
  name: "activity_summary",
  modes: ["admin"],
  kind: "read",
  description: "Admin: what happened / activity log for today, the last 7 days or the last 30 days.",
  params: z.object({ range: z.enum(["today", "week", "month"]).optional() }),
  examples: ["activity this week", "what happened today", "activity summary", "recent activity", "activity log for the month", "is hafte kya hua"],
  keywords: /\b(activity|what happened|audit|log)\b/,
  extract: (_t, e) => ({ range: e.range }),
  async run(p, ctx) {
    const rows = await q<any[]>(ctx.sb.from("activity_logs").select("action, entity, created_at").gte("created_at", since(p.range)).order("created_at", { ascending: false }).limit(500));
    const by = rows.reduce<Record<string, number>>((m, r) => ((m[`${r.entity} ${r.action}`] = (m[`${r.entity} ${r.action}`] ?? 0) + 1), m), {});
    const top = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 6);
    return [{ text: `${plural(rows.length, "logged change")} ${rangeWord(p.range)}.`, cards: top.length ? [{ title: "Most common", lines: top.map(([k, n]) => `${k}: ${n}`) }] : undefined, link: { label: "Activity log", href: "/admin/activity" } }];
  },
});

export const emailLogSummary = defineTool({
  name: "email_log_summary",
  modes: ["admin"],
  kind: "read",
  description: "Admin: automated e-mails sent/failed/skipped for a period.",
  params: z.object({ range: z.enum(["today", "week", "month"]).optional() }),
  examples: ["email log", "did emails fail", "email summary this week", "how many emails were sent", "failed emails", "email status"],
  keywords: /\b(e-?mails?|mail log|smtp)\b/,
  extract: (_t, e) => ({ range: e.range ?? "week" }),
  async run(p, ctx) {
    const rows = await q<any[]>(ctx.sb.from("email_log").select("status, template, created_at").gte("created_at", since(p.range ?? "week")).limit(2000));
    const c = (s: string) => rows.filter((r) => r.status === s).length;
    const failed = rows.filter((r) => r.status === "failed").slice(0, 3);
    return [{ text: `${plural(rows.length, "e-mail")} ${rangeWord(p.range ?? "week")}: ${c("sent")} sent, ${c("failed")} failed, ${c("skipped")} skipped.`, cards: failed.length ? [{ title: "Recent failures", lines: failed.map((f) => `${f.template} · ${day(f.created_at)}`) }] : undefined, link: { label: "Email settings & log", href: "/admin/email" } }];
  },
});

export const STAFF_TOOLS = [searchCandidates, candidateSummary, jobSummary, jobsOverview, jobsPendingReview, todaysInterviews, overdueTasks, awaitingClientDecision, unreadMessages, dailySummary, createTask, teamOverview, activitySummary, emailLogSummary];
