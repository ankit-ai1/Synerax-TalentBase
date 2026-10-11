/**
 * Assistant understanding quality: 100 typed questions across all roles (typos, Hinglish, varied wording,
 * data questions). Scores the FREE fallback engine, and Gemini too when GEMINI_API_KEY is set.
 * Only the understanding layer is tested here (question → tool + params / FAQ) — no database needed.
 * Run: npm run test:bot:quality   (add --verbose to see every miss)
 */
import { fallbackUnderstand, type Understood } from "../src/lib/bot/server/fallback";
import { geminiConfigured, geminiUnderstand } from "../src/lib/bot/providers/gemini";
import { toolsFor } from "../src/lib/bot/server/tools";
import { faqsFor, publicKnowledge, searchFaq } from "../src/lib/bot/server/knowledge";
import { redact } from "../src/lib/bot/server/redact";
import { BOT_FAQ } from "../src/data/bot-faq";
import type { BotMode } from "../src/lib/bot/types";

type Case = { mode: BotMode; q: string; expect: string | string[]; params?: Record<string, unknown> };
const C = (mode: BotMode, q: string, expect: string | string[], params?: Record<string, unknown>): Case => ({ mode, q, expect, params });

export const CASES: Case[] = [
  // ---------------------------------------------------------------- visitor (20)
  C("visitor", "React jobs in Pune?", "search_public_jobs", { q: "React", location: "Pune" }),
  C("visitor", "any opening for java developer", "search_public_jobs", { q: "Java" }),
  C("visitor", "koi naukri hai bangalore mein", "search_public_jobs", { location: "Bangalore" }),
  C("visitor", "remote jobs", "search_public_jobs", { work_mode: "Remote" }),
  C("visitor", "show current openings", "search_public_jobs"),
  C("visitor", "do I have to pay anything to get a job?", "faq:candidate-fee"),
  C("visitor", "what r ur fees for hiring", ["faq:fees"]),
  C("visitor", "how fast can u send profiles", "faq:shortlist-time"),
  C("visitor", "replacment guarantee?", "faq:replacement"),
  C("visitor", "where is your office", ["company_info", "faq:office"]),
  C("visitor", "whats ur phone number", ["company_info", "faq:contact"]),
  C("visitor", "we need 5 java developers urgently", "create_lead"),
  C("visitor", "i want to hire through synerax", "create_lead"),
  C("visitor", "hume 3 accountants chahiye", "create_lead"),
  C("visitor", "how do i register as a candidate", "faq:how-register"),
  C("visitor", "do you provide contract staffing?", "faq:contract-staffing"),
  C("visitor", "which industries do you work with", ["faq:industries", "company_info"]),
  C("visitor", "hello", "smalltalk:greet"),
  C("visitor", "can I talk to a human", "smalltalk:handoff"),
  C("visitor", "how does hiring with synerax work", "faq:how-hire"),

  // ---------------------------------------------------------------- candidate (25)
  C("candidate", "how many of my applications are in interview?", "my_applications", { status: "interview" }),
  C("candidate", "whats the status of my applications", "my_applications"),
  C("candidate", "did i get any offer", "my_applications", { status: "offer" }),
  C("candidate", "mere applications ka status batao", "my_applications"),
  C("candidate", "track my aplications", "my_applications"),
  C("candidate", "when is my next interview", "my_interviews"),
  C("candidate", "interview kab hai", "my_interviews"),
  C("candidate", "React jobs in Pune?", "recommended_jobs", { q: "React", location: "Pune" }),
  C("candidate", "show me remote jobs", "recommended_jobs", { work_mode: "Remote" }),
  C("candidate", "jobs above 20 lpa", "recommended_jobs", { min_salary: 20 }),
  C("candidate", "find me a job", "recommended_jobs"),
  C("candidate", "mere liye koi job hai kya", "recommended_jobs"),
  C("candidate", "what is missing in my profile", "my_profile_missing_fields"),
  C("candidate", "how can i get more matches", "my_profile_missing_fields"),
  C("candidate", "show my profile", "my_profile_summary"),
  C("candidate", "change my notice period to 30 days", "update_my_preferences", { notice_days: 30 }),
  C("candidate", "update expected ctc to 18 lpa", "update_my_preferences", { expected_ctc: 18 }),
  C("candidate", "i moved to hyderabad", "update_my_preferences", { city: "Hyderabad" }),
  C("candidate", "i can join immediately", "update_my_preferences", { notice_days: 0 }),
  C("candidate", "withdraw my application for data analyst", "withdraw_application"),
  C("candidate", "apply to the react developer job", "apply_to_job"),
  C("candidate", "call me back please", "request_callback"),
  C("candidate", "do i have to pay any fees", "faq:candidate-fee"),
  C("candidate", "can i withdraw an application?", ["faq:withdraw", "withdraw_application"]),
  C("candidate", "thanks", "smalltalk:thanks"),

  // ---------------------------------------------------------------- client (22)
  C("client", "what's pending for me today?", "pending_decisions"),
  C("client", "profiles waiting for my approval", "pending_decisions"),
  C("client", "kya pending hai", "pending_decisions"),
  C("client", "show my jobs", "my_company_jobs"),
  C("client", "which jobs are pending review", "my_company_jobs", { status: "pending_review" }),
  C("client", "how is the react developer job going", "job_pipeline_summary"),
  C("client", "show profiles for the node job", "shared_profiles"),
  C("client", "upcoming interviews", "upcoming_interviews"),
  C("client", "interviews this week", "upcoming_interviews"),
  C("client", "post a new job for a QA engineer with 3-5 years in Pune", "post_job", { exp_min: 3, exp_max: 5 }),
  C("client", "i want to hire a react developer", "post_job"),
  C("client", "close the data analyst job, we filled it internally", "close_job", { reason: "Filled internally" }),
  C("client", "put the designer job on hold", "close_job", { reason: "On hold" }),
  C("client", "approve kabir", "decide_profile", { decision: "Approved" }),
  C("client", "reject rohan, not suitable", "decide_profile", { decision: "Rejected" }),
  C("client", "talk to synerax", "message_synerax"),
  C("client", "message my account manager", "message_synerax"),
  C("client", "why is my job pending review?", "faq:post-job-review"),
  C("client", "can i get the candidate's phone number", "faq:candidate-contacts"),
  C("client", "what are your fees", "faq:fees"),
  C("client", "hamari jobs dikhao", "my_company_jobs"),
  C("client", "any interviews tomorrow", "upcoming_interviews"),

  // ---------------------------------------------------------------- hr (21)
  C("hr", "what's pending for me today?", "daily_summary"),
  C("hr", "give me today's summary", "daily_summary"),
  C("hr", "today's interviews", "todays_interviews"),
  C("hr", "aaj ke interviews", "todays_interviews"),
  C("hr", "my overdue tasks", "overdue_tasks"),
  C("hr", "what follow ups are due", "overdue_tasks"),
  C("hr", "find react developers in pune", "search_candidates", { location: "Pune" }),
  C("hr", "immediate joiners for node.js", "search_candidates"),
  C("hr", "search python devs with 5 years experience", "search_candidates", { exp_min: 5 }),
  C("hr", "tell me about aarav sharma", "candidate_summary"),
  C("hr", "who is diya verma", "candidate_summary"),
  C("hr", "how is the senior react developer job doing", "job_summary"),
  C("hr", "jobs pending review", "jobs_pending_review"),
  C("hr", "profiles pending with clients", "awaiting_client_decision"),
  C("hr", "any new messages", "unread_messages"),
  C("hr", "remind me to call aarav tomorrow", "create_task", { due: "tomorrow" }),
  C("hr", "create a task to send the offer letter", "create_task"),
  C("hr", "team overview", "!team_overview"),
  C("hr", "did any emails fail", "!email_log_summary"),
  C("hr", "what are your fees", ["faq:fees", "none"]),
  C("hr", "hi", "smalltalk:greet"),

  // ---------------------------------------------------------------- admin (12)
  C("admin", "team overview", "team_overview"),
  C("admin", "how is the team doing", "team_overview"),
  C("admin", "who has the most tasks", "team_overview"),
  C("admin", "activity this week", "activity_summary", { range: "week" }),
  C("admin", "what happened today", "activity_summary", { range: "today" }),
  C("admin", "did any emails fail", "email_log_summary"),
  C("admin", "email log for this month", "email_log_summary", { range: "month" }),
  C("admin", "daily summary", "daily_summary"),
  C("admin", "search java candidates in bangalore", "search_candidates", { location: "Bangalore" }),
  C("admin", "today's interviews", "todays_interviews"),
  C("admin", "jobs waiting for approval", "jobs_pending_review"),
  C("admin", "remind me to review the nimbus contract", "create_task"),
];


/** HELD-OUT questions — written after tuning and never used to adjust the rules (honest accuracy) */
export const HOLDOUT: Case[] = [
  C("visitor", "are there any openings for nurses in chennai", "search_public_jobs", { location: "Chennai" }),
  C("visitor", "looking for a job in mumbai", "search_public_jobs", { location: "Mumbai" }),
  C("visitor", "is registration free for job seekers", ["faq:candidate-fee", "faq:how-register"]),
  C("visitor", "how long until you send candidates", "faq:shortlist-time"),
  C("visitor", "our company needs a team of 10 developers", "create_lead"),
  C("visitor", "what is your email id", ["company_info", "faq:contact"]),
  C("visitor", "do you hire for healthcare", ["faq:industries", "company_info", "search_public_jobs"]),
  C("visitor", "who can see my resume", "faq:privacy"),
  C("candidate", "any update on my job applications?", "my_applications"),
  C("candidate", "how many applications have i made", "my_applications"),
  C("candidate", "am i shortlisted anywhere", "my_applications"),
  C("candidate", "what time is my interview tomorrow", "my_interviews"),
  C("candidate", "show python jobs", "recommended_jobs", { q: "Python" }),
  C("candidate", "any job in delhi", "recommended_jobs", { location: "Delhi" }),
  C("candidate", "my notice is 60 days now", "update_my_preferences", { notice_days: 60 }),
  C("candidate", "i expect 25 lakh now", "update_my_preferences", { expected_ctc: 25 }),
  C("candidate", "I want to talk to someone", "request_callback"),
  C("candidate", "how strong is my profile", "my_profile_missing_fields"),
  C("candidate", "i am no longer interested in the backend role", "withdraw_application"),
  C("client", "who is waiting for my feedback", "pending_decisions"),
  C("client", "list open positions", "my_company_jobs"),
  C("client", "progress on the devops opening", "job_pipeline_summary"),
  C("client", "see candidates shared for the react role", "shared_profiles"),
  C("client", "when are the next interviews scheduled", "upcoming_interviews"),
  C("client", "we need a business analyst in gurgaon", "post_job"),
  C("client", "the react role is filled, close it", "close_job"),
  C("client", "go ahead with aarav", "decide_profile", { decision: "Approved" }),
  C("client", "I want to speak with my account manager", "message_synerax"),
  C("hr", "anything due today for me", ["overdue_tasks", "daily_summary"]),
  C("hr", "who is interviewing today", "todays_interviews"),
  C("hr", "java devs in hyderabad with 3 years", "search_candidates", { location: "Hyderabad" }),
  C("hr", "profile of kabir singh", "candidate_summary"),
  C("hr", "which client jobs need approval", "jobs_pending_review"),
  C("hr", "do i have unread chats", "unread_messages"),
  C("hr", "add a follow up to call nimbus today", "create_task", { due: "today" }),
  C("hr", "show team workload", "!team_overview"),
  C("admin", "team workload", "team_overview"),
  C("admin", "audit log this month", "activity_summary", { range: "month" }),
  C("admin", "how many emails went out this week", "email_log_summary", { range: "week" }),
  C("admin", "morning brief", "daily_summary"),
];

let CURRENT_MODE: BotMode = "visitor";
const label = (u: Understood) =>
  u.kind === "tool" && u.tool === "get_faq"
    ? (() => {
        const h = searchFaq(String(u.params.question ?? ""), faqsFor(CURRENT_MODE, BOT_FAQ))[0];
        return h && h.score >= 0.45 ? `faq:${h.item.id}` : "none";
      })()
    : u.kind === "tool" ? u.tool : u.kind === "faq" ? `faq:${u.faq.id}` : u.kind === "smalltalk" ? `smalltalk:${u.intent}` : u.kind === "answer" ? (u.unsure ? "none" : "answer") : "none";

function paramsOk(u: Understood, want?: Record<string, unknown>) {
  if (!want || u.kind !== "tool") return true;
  return Object.entries(want).every(([k, v]) => {
    const got = u.params[k];
    if (typeof v === "string") return Array.isArray(got) ? got.some((g) => String(g).toLowerCase().includes(v.toLowerCase())) : String(got ?? "").toLowerCase().includes(v.toLowerCase());
    return Number(got) === Number(v);
  });
}

function judge(c: Case, u: Understood) {
  const got = label(u);
  const exp = Array.isArray(c.expect) ? c.expect : [c.expect];
  // "!tool" = that tool must NOT be chosen (e.g. admin-only tools for HR)
  if (exp.length === 1 && exp[0].startsWith("!")) return got !== exp[0].slice(1);
  // the AI may answer a FAQ itself from the public knowledge — accept a text answer where a FAQ is expected
  const ok = exp.includes(got) || (got === "answer" && exp.some((e) => e.startsWith("faq:") || e.startsWith("smalltalk:")));
  return ok && paramsOk(u, c.params);
}

async function score(name: string, run: (c: Case) => Promise<Understood>, cases: Case[] = CASES) {
  const per: Record<string, { ok: number; n: number }> = {};
  const misses: string[] = [];
  for (const c of cases) {
    let u: Understood;
    CURRENT_MODE = c.mode;
    try {
      u = await run(c);
    } catch (e) {
      u = { kind: "none" };
      misses.push(`  [${c.mode}] "${c.q}" → ERROR ${(e as Error).message}`);
    }
    const ok = judge(c, u);
    per[c.mode] ??= { ok: 0, n: 0 };
    per[c.mode].n++;
    if (ok) per[c.mode].ok++;
    else misses.push(`  [${c.mode}] "${c.q}" → got ${label(u)}${u.kind === "tool" ? ` ${JSON.stringify(u.params)}` : ""}, expected ${JSON.stringify(c.expect)}${c.params ? ` ${JSON.stringify(c.params)}` : ""}`);
  }
  const total = Object.values(per).reduce((a, b) => ({ ok: a.ok + b.ok, n: a.n + b.n }), { ok: 0, n: 0 });
  console.log(`\n${name}`);
  for (const [m, r] of Object.entries(per)) console.log(`  ${m.padEnd(10)} ${String(r.ok).padStart(3)}/${String(r.n).padEnd(3)} ${((100 * r.ok) / r.n).toFixed(0).padStart(4)}%`);
  console.log(`  ${"TOTAL".padEnd(10)} ${String(total.ok).padStart(3)}/${String(total.n).padEnd(3)} ${((100 * total.ok) / total.n).toFixed(1).padStart(5)}%`);
  if (misses.length && (process.argv.includes("--verbose") || misses.length <= 25)) console.log("  misses:\n" + misses.join("\n"));
  return total.ok / total.n;
}

async function main() {
  console.log(`${CASES.length} tuning questions + ${HOLDOUT.length} held-out questions`);
  const fbRun = (c: Case) => fallbackUnderstand(redact(c.q), c.mode, BOT_FAQ);
  const fb = await score("FALLBACK — tuning set (free: rules + Fuse.js + local MiniLM embeddings)", fbRun);
  await score("FALLBACK — HELD-OUT set (not used for tuning)", fbRun, HOLDOUT);
  let gm: number | null = null;
  if (geminiConfigured()) {
    const gRun = async (c: Case) => {
      await new Promise((r) => setTimeout(r, Number(process.env.GEMINI_TEST_DELAY_MS || 4500))); // stay under the free-tier per-minute limit
      return geminiUnderstand({ question: redact(c.q), recent: [], mode: c.mode, tools: toolsFor(c.mode), knowledge: publicKnowledge(c.mode, BOT_FAQ) }, 15000);
    };
    gm = await score(`GEMINI (${process.env.GEMINI_MODEL || "gemini-flash-lite-latest"}) — all ${CASES.length + HOLDOUT.length} questions`, gRun, [...CASES, ...HOLDOUT]);
  } else console.log("\nGEMINI: skipped — set GEMINI_API_KEY (and BOT_AI_ENABLED=on) in .env.local to score it");
  const min = Number(process.env.BOT_MIN_ACCURACY || 0.85);
  process.exit(fb >= min && (gm === null || gm >= min) ? 0 : 1);
}
main();
