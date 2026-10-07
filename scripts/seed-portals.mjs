#!/usr/bin/env node
/**
 * Realistic demo data for the client & candidate portals.
 *
 *   node scripts/seed-portals.mjs            → create / refresh (safe to re-run)
 *   node scripts/seed-portals.mjs --cleanup  → delete everything this script created
 *
 * Creates:
 *   • "Nimbus Fintech Pvt Ltd" with 2 client logins, 5 jobs (4 live, 1 pending review)
 *   • "Orbit Retail Pvt Ltd" with 1 client login and no jobs (empty-state demo)
 *   • 10 candidates with skills, experience & education, applications across every stage,
 *     upcoming + past interviews, client decisions and notifications
 *   • 1 brand-new candidate with an empty profile (empty-state demo)
 *   • 2 Synerax team members (recruiter + account manager) shown on the portal contact cards.
 *     Their passwords are random and never printed — nobody can sign in as them.
 * All demo emails use @example.com, so no real email is ever sent.
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing in .env.local");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const MARK = "seed:portals";
const LEGACY_CLIENT = "Demo Client Pvt Ltd (seed)";

const C = (email, first_name, last_name, phone, designation, exp, city, skills, extra = {}) => ({ email, first_name, last_name, phone, designation, exp, city, skills, ...extra });

export const DEMO = {
  password: "Demo@Portal2026",
  clientName: "Nimbus Fintech Pvt Ltd",
  client: { email: "demo.client@example.com", name: "Riya Kapoor", designation: "HR Manager" },
  client2: { email: "demo.client2@example.com", name: "Arjun Menon", designation: "Engineering Manager" },
  emptyClientName: "Orbit Retail Pvt Ltd",
  emptyClient: { email: "demo.client.empty@example.com", name: "Meera Joshi", designation: "Talent Lead" },
  staff: [
    { email: "demo.recruiter@example.com", name: "Neha Arora", designation: "Senior Recruiter", phone: "+91 98100 00011" },
    { email: "demo.accounts@example.com", name: "Rahul Mehta", designation: "Account Manager", phone: "+91 98100 00012" },
  ],
  candidates: [
    C("demo.candidate1@example.com", "Aarav", "Sharma", "9000000001", "Frontend Developer", 4, "Bengaluru", [["React", 4], ["TypeScript", 3], ["Next.js", 2], ["Node.js", 2], ["SQL", 2]], {
      company: "Brightpath Labs", ctc: 14, expected: 20, notice: 30, edu: ["B.Tech", "Computer Science", "PES University", 2020],
      summary: "Frontend developer who loves building fast, accessible product UIs. Shipped a design system used by 40+ engineers.",
    }),
    C("demo.candidate2@example.com", "Diya", "Verma", "9000000002", "Full Stack Developer", 6, "Pune", [["React", 5], ["Node.js", 6], ["PostgreSQL", 4], ["AWS", 3]], {
      company: "Kite Commerce", ctc: 20, expected: 28, notice: 30, edu: ["B.E.", "Information Technology", "COEP Pune", 2018],
    }),
    C("demo.candidate3@example.com", "Kabir", "Singh", "9000000003", "Senior Frontend Engineer", 7, "Bengaluru", [["React", 7], ["TypeScript", 5], ["GraphQL", 3], ["Next.js", 3]], {
      company: "Lumen Health", ctc: 26, expected: 32, notice: 60, edu: ["B.Tech", "Electronics", "NIT Surathkal", 2017],
    }),
    C("demo.candidate4@example.com", "Ananya", "Iyer", "9000000004", "Frontend Developer", 5, "Chennai", [["React", 5], ["TypeScript", 4], ["Jest", 3]], {
      company: "Quill Software", ctc: 18, expected: 25, notice: 30, edu: ["B.Sc", "Computer Science", "Loyola College", 2019],
    }),
    C("demo.candidate5@example.com", "Rohan", "Gupta", "9000000005", "React Developer", 4, "Hyderabad", [["React", 4], ["Redux", 3], ["TypeScript", 3]], {
      company: "Pixelwave", ctc: 15, expected: 22, notice: 15, edu: ["B.Tech", "Computer Science", "JNTU Hyderabad", 2020],
    }),
    C("demo.candidate6@example.com", "Ishita", "Banerjee", "9000000006", "UI Engineer", 3, "Kolkata", [["React", 3], ["Figma", 2], ["CSS", 4]], {
      company: "Craftly", ctc: 11, expected: 16, notice: 90, edu: ["B.Tech", "Information Technology", "Jadavpur University", 2021],
    }),
    C("demo.candidate7@example.com", "Vikram", "Rao", "9000000007", "Backend Engineer", 6, "Pune", [["Node.js", 6], ["PostgreSQL", 5], ["Docker", 4], ["AWS", 4]], {
      company: "Stackline", ctc: 22, expected: 30, notice: 30, edu: ["M.Tech", "Computer Science", "IIIT Pune", 2018],
    }),
    C("demo.candidate8@example.com", "Sneha", "Kulkarni", "9000000008", "Backend Developer", 3, "Mumbai", [["Node.js", 3], ["MongoDB", 3], ["Express", 3]], {
      company: "Freshbasket", ctc: 10, expected: 15, notice: 30, edu: ["B.E.", "Computer Engineering", "VJTI Mumbai", 2021],
    }),
    C("demo.candidate9@example.com", "Aditya", "Menezes", "9000000009", "Product Designer", 5, "Bengaluru", [["Figma", 5], ["UX Research", 4], ["Prototyping", 4]], {
      company: "Orbitly", ctc: 17, expected: 23, notice: 30, edu: ["B.Des", "Interaction Design", "NID Bengaluru", 2019],
    }),
    C("demo.candidate10@example.com", "Priya", "Desai", "9000000010", "Data Analyst", 3, "Remote", [["SQL", 3], ["Python", 2], ["Power BI", 2]], {
      company: "Insightly", ctc: 9, expected: 14, notice: 30, edu: ["B.Com", "Statistics", "Christ University", 2021],
    }),
  ],
  newCandidate: C("demo.newcandidate@example.com", "Tanvi", "Joshi", "9000000011", null, null, "Jaipur", []),
};

const JOBS = [
  {
    key: "react", title: "Senior React Developer", skills: [["React", true], ["TypeScript", true], ["Next.js", false], ["GraphQL", false]],
    locations: ["Bengaluru", "Remote"], work_mode: "Hybrid", exp: [3, 7], ctc: [18, 30], openings: 2, published: 18, target: 20, show_salary: true,
    description: "Own the customer-facing web app for our payments platform. You'll build new product surfaces in React and TypeScript, raise the bar on performance and accessibility, and mentor two junior engineers.",
  },
  {
    key: "node", title: "Node.js Backend Engineer", skills: [["Node.js", true], ["PostgreSQL", true], ["AWS", false], ["Docker", false]],
    locations: ["Pune"], work_mode: "Hybrid", exp: [4, 8], ctc: [20, 32], openings: 2, published: 12, target: 30,
    description: "Design and scale the APIs behind our lending products — reliable Node.js services on PostgreSQL and AWS, with strong testing and observability.",
  },
  {
    key: "design", title: "Product Designer (UI/UX)", skills: [["Figma", true], ["UX Research", true], ["Prototyping", false]],
    locations: ["Bengaluru"], work_mode: "Onsite", exp: [3, 6], ctc: [15, 24], openings: 1, published: 6, target: -2,
    description: "Shape end-to-end journeys for small-business owners: research, flows, high-fidelity UI and prototypes, working closely with product and engineering.",
  },
  {
    key: "data", title: "Data Analyst", skills: [["SQL", true], ["Python", false], ["Power BI", false]],
    locations: [], work_mode: "Remote", exp: [2, 5], ctc: [10, 18], openings: 1, published: 25, target: 10, show_salary: true,
    description: "Turn transaction data into decisions. Build dashboards, define metrics with the business teams and run deep-dive analyses.",
  },
  {
    key: "devops", title: "DevOps Engineer", skills: [["Kubernetes", true], ["AWS", true], ["Terraform", false]],
    locations: ["Hyderabad"], work_mode: "Hybrid", exp: [4, 7], ctc: [22, 34], openings: 1, published: null, target: 45, pending: true,
    description: "We need someone to own our CI/CD and Kubernetes platform on AWS, with infrastructure as code in Terraform.",
  },
];

const must = (res, what) => {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data;
};
const ago = (days = 0, hours = 0) => new Date(Date.now() - (days * 24 + hours) * 3600e3).toISOString();
/** a future time at an IST hour, n days from today */
const inDays = (n, istHour, istMin = 0) => {
  const d = new Date(Date.now() + 5.5 * 3600e3);
  d.setUTCDate(d.getUTCDate() + n);
  d.setUTCHours(istHour, istMin, 0, 0);
  return new Date(d.getTime() - 5.5 * 3600e3).toISOString();
};
const dateIn = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

async function findUser(email) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const u = data.users.find((x) => x.email?.toLowerCase() === email);
    if (u) return u;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function ensureUser(email, name, role, password = DEMO.password) {
  let u = await findUser(email);
  if (!u) u = must(await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } }), `create ${email}`).user;
  else must(await db.auth.admin.updateUserById(u.id, { password, ban_duration: "none" }), `update ${email}`);
  must(await db.from("profiles").upsert({ id: u.id, email, full_name: name, role, is_active: true }), `profile ${email}`);
  return u.id;
}

const skillCache = new Map();
async function skillId(name) {
  if (skillCache.has(name)) return skillCache.get(name);
  let row = must(await db.from("skills").select("id").ilike("name", name).maybeSingle(), `skill ${name}`);
  if (!row) row = must(await db.from("skills").insert({ name }).select("id").single(), `insert skill ${name}`);
  skillCache.set(name, row.id);
  return row.id;
}

async function ensureClient(name, fields) {
  let c = must(await db.from("clients").select("id").ilike("name", name).maybeSingle(), `find ${name}`);
  if (!c) c = must(await db.from("clients").insert({ name, ...fields, notes: MARK }).select("id").single(), `create ${name}`);
  else must(await db.from("clients").update({ ...fields, notes: MARK }).eq("id", c.id), `update ${name}`);
  return c.id;
}

async function removeLegacy() {
  const old = must(await db.from("clients").select("id").ilike("name", LEGACY_CLIENT).maybeSingle(), "legacy");
  if (old) {
    must(await db.from("jobs").delete().eq("client_id", old.id), "legacy jobs");
    must(await db.from("clients").delete().eq("id", old.id), "legacy client");
  }
}

async function seed() {
  await removeLegacy();

  // Synerax team (random passwords — not usable logins)
  const staffIds = [];
  for (const s of DEMO.staff) {
    const id = await ensureUser(s.email, s.name, "hr", randomBytes(24).toString("base64url") + "aA1!");
    const { error } = await db.from("profiles").update({ phone: s.phone, designation: s.designation }).eq("id", id);
    if (error) console.warn(`  ! staff contact details skipped (${error.message}) — run the latest 003_portals.sql`);
    staffIds.push(id);
  }
  const [recruiter, accountManager] = staffIds;

  // clients + logins
  const clientId = await ensureClient(DEMO.clientName, { industry: "Fintech", city: "Bengaluru", status: "Active", website: "https://nimbus.example.com", account_manager: accountManager });
  const emptyClientId = await ensureClient(DEMO.emptyClientName, { industry: "Retail", city: "Mumbai", status: "Active", account_manager: accountManager });
  const clientUsers = [];
  for (const [cid, u] of [[clientId, DEMO.client], [clientId, DEMO.client2], [emptyClientId, DEMO.emptyClient]]) {
    const uid = await ensureUser(u.email, u.name, "client");
    must(await db.from("client_users").upsert({ client_id: cid, user_id: uid, name: u.name, designation: u.designation, is_active: true }, { onConflict: "user_id" }), "client_users");
    clientUsers.push(uid);
  }

  // candidates
  const cand = [];
  for (const [i, c] of [...DEMO.candidates, DEMO.newCandidate].entries()) {
    const isNew = c === DEMO.newCandidate;
    const userId = await ensureUser(c.email, `${c.first_name} ${c.last_name}`, "candidate");
    let row = must(await db.from("candidates").select("id").ilike("email", c.email).maybeSingle(), `find ${c.email}`);
    const fields = isNew
      ? { first_name: c.first_name, last_name: c.last_name, email: c.email, phone: c.phone, current_city: c.city, source: "Portal", status: "Available", user_id: userId, consent_at: ago(0, 2), job_alerts: true, open_to_work: true }
      : {
          first_name: c.first_name, last_name: c.last_name, email: c.email, phone: c.phone,
          current_designation: c.designation, current_company: c.company, currently_employed: true,
          headline: `${c.designation} · ${c.skills.slice(0, 3).map((s) => s[0]).join(", ")}`,
          summary: c.summary ?? `${c.designation} with ${c.exp} years of experience in ${c.skills.slice(0, 2).map((s) => s[0]).join(" and ")}.`,
          total_experience: c.exp, relevant_experience: Math.max(1, c.exp - 1), current_city: c.city, preferred_locations: [c.city === "Remote" ? "Bengaluru" : c.city],
          notice_period_days: c.notice, current_ctc: c.ctc, expected_ctc: c.expected, highest_qualification: "Graduation", gender: i % 2 ? "Female" : "Male",
          dob: `${1990 + (i % 8)}-0${1 + (i % 9)}-1${i % 9}`, source: "Portal", status: "Available", user_id: userId, consent_at: ago(40 - i, 0),
          job_alerts: true, open_to_work: true, work_mode_preference: "Hybrid", willing_to_relocate: i % 3 === 0,
        };
    if (row) must(await db.from("candidates").update(fields).eq("id", row.id), `update ${c.email}`);
    else row = must(await db.from("candidates").insert(fields).select("id").single(), `create ${c.email}`);
    must(await db.from("candidates").update({ created_at: isNew ? ago(0, 2) : ago(40 - i, 3) }).eq("id", row.id), "backdate cand");

    // skills / experience / education / CV (rebuilt each run)
    for (const t of ["candidate_skills", "candidate_experiences", "candidate_educations"]) must(await db.from(t).delete().eq("candidate_id", row.id), `clear ${t}`);
    if (!isNew) {
      for (const [k, [s, yrs]] of c.skills.entries()) {
        must(await db.from("candidate_skills").insert({ candidate_id: row.id, skill_id: await skillId(s), years: yrs, is_primary: k === 0, level: yrs >= 5 ? "Expert" : yrs >= 3 ? "Intermediate" : "Beginner" }), `skill ${s}`);
      }
      const start = new Date(Date.now() - Math.min(c.exp, 3) * 365 * 864e5).toISOString().slice(0, 10);
      must(await db.from("candidate_experiences").insert([
        { candidate_id: row.id, company: c.company, designation: c.designation, start_date: start, is_current: true, location: c.city, sort_order: 0 },
        ...(c.exp > 3 ? [{ candidate_id: row.id, company: ["Tidewater Systems", "Northstar Tech", "Bluefin Apps"][i % 3], designation: c.designation.replace("Senior ", ""), start_date: new Date(Date.now() - c.exp * 365 * 864e5).toISOString().slice(0, 10), end_date: start, location: c.city, sort_order: 1 }] : []),
      ]), "experience");
      must(await db.from("candidate_educations").insert({ candidate_id: row.id, level: "Graduation", degree: c.edu[0], specialization: c.edu[1], institute: c.edu[2], end_year: c.edu[3], start_year: c.edu[3] - 4 }), "education");
      const hasCv = must(await db.from("candidate_documents").select("id").eq("candidate_id", row.id).eq("doc_type", "Resume").eq("is_archived", false).maybeSingle(), "cv");
      if (!hasCv) {
        // placeholder — there is no real file in Drive behind it (opening it shows "File unavailable")
        must(await db.from("candidate_documents").insert({ candidate_id: row.id, doc_type: "Resume", file_name: `${c.first_name}_${c.last_name}_CV.pdf`, mime_type: "application/pdf", size_bytes: 182_000, drive_file_id: "seed-placeholder" }), "cv");
      }
    }
    await db.rpc("refresh_candidate_search", { p_id: row.id });
    cand.push({ ...c, id: row.id, userId });
  }

  // jobs
  const jobs = {};
  for (const j of JOBS) {
    let job = must(await db.from("jobs").select("id").eq("client_id", clientId).eq("title", j.title).maybeSingle(), `find ${j.title}`);
    const publishedAt = j.published != null ? ago(j.published, 2) : null;
    const fields = {
      title: j.title, client_id: clientId, status: j.pending ? "Pending review" : "Open", priority: j.key === "react" ? "Urgent" : "High",
      openings: j.openings, locations: j.locations, work_mode: j.work_mode, employment_type: "Full-time",
      exp_min: j.exp[0], exp_max: j.exp[1], ctc_min: j.ctc[0], ctc_max: j.ctc[1], notice_max: 60, qualification: "Graduation",
      description: j.description,
      public_description: j.pending ? null : `${j.description}\n\nWhat you'll do\n• Ship high-quality features end to end\n• Collaborate with product, design and data\n• Help shape engineering practices\n\nWhat we offer\n• Hybrid work and flexible hours\n• Learning budget and health cover\n• A fast-growing, well-funded team`,
      interview_process: "HR screen → Technical round → Hiring manager round",
      published: !j.pending, published_at: publishedAt, show_client_name: false, target_date: dateIn(j.target),
      posted_by_client: !!j.pending, posted_by: j.pending ? clientUsers[0] : null, notes: MARK,
    };
    if (job) must(await db.from("jobs").update(fields).eq("id", job.id), `update ${j.title}`);
    else job = must(await db.from("jobs").insert(fields).select("id").single(), `create ${j.title}`);
    const created = j.pending ? ago(1, 4) : ago((j.published ?? 0) + 1, 0);
    must(await db.from("jobs").update({ created_at: created, opened_at: created.slice(0, 10) }).eq("id", job.id), "backdate job");
    {
      const { error } = await db.from("jobs").update({ show_salary: !!j.show_salary }).eq("id", job.id);
      if (error) console.warn(`  ! show_salary skipped (${error.message})`);
    }
    must(await db.from("job_skills").delete().eq("job_id", job.id), "clear job skills");
    for (const [s, m] of j.skills) must(await db.from("job_skills").insert({ job_id: job.id, skill_id: await skillId(s), is_mandatory: m }), `job skill ${s}`);
    must(await db.from("job_assignees").delete().eq("job_id", job.id), "clear assignees");
    if (!j.pending) must(await db.from("job_assignees").insert({ job_id: job.id, user_id: recruiter }), "assignee");
    jobs[j.key] = job.id;
  }

  // applications: [job, candidate#, final stage, story]
  const STEP_STAGE = ["Applied", "Screening", "Submitted", "Interview", "Offered", "Joined"];
  const plan = [
    { job: "react", c: 0, stage: "Applied", origin: "Candidate applied", created: [3, 4], match: 86 },
    { job: "react", c: 1, stage: "Submitted", created: [4, 0], shared: [0, 8], decision: "Pending", match: 88, note: "Strong full-stack profile — led a React rewrite at Kite Commerce. 30 days notice, open to Bengaluru." },
    { job: "react", c: 2, stage: "Interview", created: [12, 0], shared: [10, 0], decision: "Approved", decided: [9, 2], match: 92, note: "7 years of React + TypeScript, very strong on performance. Expected CTC within budget." },
    { job: "react", c: 3, stage: "Offered", created: [16, 0], shared: [14, 0], decision: "Approved", decided: [13, 0], interviewAt: 9, offerAt: 2, match: 84, offered_ctc: 26, note: "Solid fundamentals, great communicator." },
    { job: "react", c: 4, stage: "Joined", created: [17, 0], shared: [16, 0], decision: "Approved", decided: [15, 4], interviewAt: 13, offerAt: 9, joinedAt: 3, match: 81, offered_ctc: 22, note: "Can join in 15 days." },
    { job: "react", c: 5, stage: "Rejected", created: [9, 0], shared: [8, 0], decision: "Rejected", decided: [7, 0], match: 61, reason: "Notice period too long", feedback: "Good UI skills, but we need someone within 30 days.", note: "Great eye for UI; 90 days notice." },
    { job: "node", c: 6, stage: "Submitted", created: [3, 0], shared: [1, 6], decision: "Pending", match: 90, note: "6 years on Node.js + PostgreSQL at scale; built a payments ledger service." },
    { job: "node", c: 7, stage: "Screening", created: [2, 0], match: 72 },
    { job: "node", c: 1, stage: "Interview", created: [8, 0], shared: [7, 0], decision: "Approved", decided: [6, 3], match: 85, note: "Also a strong fit for backend — keen on fintech." },
    { job: "node", c: 0, stage: "Rejected", created: [11, 0], match: 54 },
    { job: "design", c: 8, stage: "Submitted", created: [3, 0], shared: [2, 2], decision: "Pending", match: 89, note: "Portfolio is excellent — ran research for a 2M-user app." },
    { job: "data", c: 9, stage: "Submitted", created: [6, 0], shared: [5, 0], decision: "Approved", decided: [4, 0], match: 83, note: "Hands-on with SQL and Power BI dashboards." },
    { job: "data", c: 0, stage: "Interview", created: [9, 0], shared: [8, 0], decision: "Approved", decided: [7, 0], origin: "Candidate applied", match: 70, note: "Applied directly; strong SQL alongside frontend work." },
  ];
  const apps = [];
  for (const p of plan) {
    const c = cand[p.c];
    const jobId = jobs[p.job];
    let app = must(await db.from("applications").select("id").eq("job_id", jobId).eq("candidate_id", c.id).maybeSingle(), "find app");
    const fields = {
      job_id: jobId, candidate_id: c.id, stage: p.stage, origin: p.origin ?? "Synerax", match_score: p.match, owner_id: recruiter, added_by: recruiter,
      shared_with_client: !!p.shared, shared_at: p.shared ? ago(...p.shared) : null, shared_by: p.shared ? recruiter : null, share_note: p.note ?? null,
      client_decision: p.decision ?? null, client_decision_at: p.decided ? ago(...p.decided) : null, client_reject_reason: p.reason ?? null, client_feedback: p.feedback ?? null,
      offered_ctc: p.offered_ctc ?? null, rejection_reason: p.stage === "Rejected" ? p.reason ?? "Not shortlisted" : null, withdrawn_at: null,
    };
    if (app) must(await db.from("applications").update(fields).eq("id", app.id), "update app");
    else app = must(await db.from("applications").insert(fields).select("id").single(), "insert app");
    if (p.shared) {
      const cv = must(await db.from("candidate_documents").select("id").eq("candidate_id", c.id).eq("doc_type", "Resume").eq("is_archived", false).limit(1).single(), "cv");
      must(await db.from("applications").update({ client_cv_document_id: cv.id }).eq("id", app.id), "cv link");
    }

    // backdated timeline
    const created = ago(...p.created);
    const finalStep = STEP_STAGE.indexOf(p.stage);
    const hist = [{ to: p.origin === "Candidate applied" ? "Applied" : "Sourced", at: created }];
    if (finalStep >= 1 || p.stage === "Rejected") hist.push({ to: "Screening", at: ago(p.created[0] - 1, 0) });
    if (p.shared) hist.push({ to: "Submitted", at: ago(...p.shared) });
    if (finalStep >= 3) hist.push({ to: "Interview", at: p.decided ? ago(p.decided[0] - 1, 0) : ago(1, 0) });
    if (finalStep >= 4) hist.push({ to: "Offered", at: ago(p.offerAt, 0) });
    if (finalStep >= 5) hist.push({ to: "Joined", at: ago(p.joinedAt, 0) });
    if (p.stage === "Rejected") hist.push({ to: "Rejected", at: p.decided ? ago(...p.decided) : ago(p.created[0] - 2, 0) });
    must(await db.from("application_stage_history").delete().eq("application_id", app.id), "clear hist");
    let prev = null;
    for (const h of hist) {
      must(await db.from("application_stage_history").insert({ application_id: app.id, from_stage: prev, to_stage: h.to, changed_at: h.at, changed_by: recruiter }), "hist");
      prev = h.to;
    }
    must(
      await db.from("applications").update({
        created_at: created, stage_changed_at: hist[hist.length - 1].at,
        joined_at: p.joinedAt != null ? ago(p.joinedAt, 0).slice(0, 10) : null,
        submitted_at: p.shared ? ago(...p.shared) : null,
      }).eq("id", app.id),
      "backdate app"
    );
    apps.push({ ...p, id: app.id });
  }

  // interviews (rebuilt each run)
  const appOf = (job, c) => apps.find((a) => a.job === job && a.c === c).id;
  for (const a of apps) must(await db.from("interviews").delete().eq("application_id", a.id), "clear interviews");
  const ivs = [
    { app: appOf("react", 2), round_no: 1, round_name: "Technical round", mode: "Video", at: ago(5, 2), status: "Completed", result: "Selected", client_feedback: "Strong on React internals and performance. Moving to the manager round.", client_rating: 4 },
    { app: appOf("react", 2), round_no: 2, round_name: "Hiring manager round", mode: "Video", at: inDays(2, 11), meeting_link: "https://meet.google.com/demo-abcd-efg" },
    { app: appOf("node", 1), round_no: 1, round_name: "Technical round", mode: "In-person", at: inDays(1, 15, 30), location: "Nimbus HQ, Baner, Pune" },
    { app: appOf("data", 0), round_no: 1, round_name: "Case study round", mode: "Video", at: inDays(4, 16), meeting_link: "https://meet.google.com/demo-hijk-lmn" },
    { app: appOf("react", 3), round_no: 1, round_name: "Technical round", mode: "Video", at: ago(10, 0), status: "Completed", result: "Selected", client_feedback: "Clear thinker, good culture fit.", client_rating: 5 },
    { app: appOf("react", 4), round_no: 1, round_name: "Technical round", mode: "Video", at: ago(14, 0), status: "Completed", result: "Selected", client_feedback: "Hire.", client_rating: 4 },
  ];
  for (const iv of ivs) {
    const row = must(
      await db.from("interviews").insert({
        application_id: iv.app, round_no: iv.round_no, round_name: iv.round_name, mode: iv.mode, scheduled_at: iv.at, duration_min: 45,
        meeting_link: iv.meeting_link ?? null, location: iv.location ?? null, interviewers: "Arjun Menon", created_by: recruiter,
      }).select("id").single(),
      "interview"
    );
    if (iv.status) {
      must(await db.from("interviews").update({ status: iv.status, result: iv.result, client_feedback: iv.client_feedback, client_rating: iv.client_rating, client_feedback_at: iv.at }).eq("id", row.id), "iv result");
    }
    must(await db.from("interviews").update({ created_at: iv.status ? ago(16, 0) : ago(1, 3) }).eq("id", row.id), "iv backdate");
  }
  // the interview trigger may have nudged stages — restore the planned ones
  for (const a of apps) must(await db.from("applications").update({ stage: a.stage }).eq("id", a.id), "restore stage");
  for (const a of apps) {
    const last = must(await db.from("application_stage_history").select("changed_at").eq("application_id", a.id).order("changed_at", { ascending: false }).limit(1).single(), "last hist");
    must(await db.from("application_stage_history").delete().eq("application_id", a.id).gt("changed_at", ago(0, 0.05)), "drop trigger hist");
    must(await db.from("applications").update({ stage_changed_at: last.changed_at }).eq("id", a.id), "stage time");
  }

  // saved job + notifications
  await db.from("saved_jobs").upsert({ candidate_id: cand[0].id, job_id: jobs.design }, { onConflict: "candidate_id,job_id" }).then(() => {});
  const demoUsers = [clientUsers[0], clientUsers[1], cand[0].userId];
  must(await db.from("notifications").delete().in("user_id", demoUsers), "clear notifications");
  const N = (user_id, type, title, body, link, hoursAgo, read) => ({ user_id, type, title, body, link, created_at: ago(0, hoursAgo), read_at: read ? ago(0, hoursAgo - 0.5) : null });
  must(
    await db.from("notifications").insert([
      N(clientUsers[0], "profiles_shared", "1 new profile for “Senior React Developer”", "Review and approve or reject it in your portal.", `/client/jobs/${jobs.react}?tab=profiles`, 8, false),
      N(clientUsers[0], "profiles_shared", "1 new profile for “Node.js Backend Engineer”", "Shared by Neha Arora.", `/client/jobs/${jobs.node}?tab=profiles`, 30, false),
      N(clientUsers[0], "interview_scheduled", "Interview scheduled: Kabir Singh", "Hiring manager round · in 2 days", `/client/jobs/${jobs.react}?tab=profiles`, 27, true),
      N(clientUsers[0], "candidate_joined", "Rohan Gupta has joined", "Senior React Developer", `/client/jobs/${jobs.react}`, 72, true),
      N(clientUsers[0], "job_received", "We received “DevOps Engineer”", "Our team is reviewing it.", `/client/jobs/${jobs.devops}`, 28, true),
      N(clientUsers[1], "profiles_shared", "1 new profile for “Senior React Developer”", null, `/client/jobs/${jobs.react}?tab=profiles`, 8, false),
      N(cand[0].userId, "interview_scheduled", "Interview scheduled: Case study round", "Data Analyst · in 4 days", "/portal/applications", 5, false),
      N(cand[0].userId, "profile_shared", "Your profile was shared for “Data Analyst”", "We’ll update you as soon as the employer responds.", "/portal/applications", 192, true),
      N(cand[0].userId, "candidate_application_received", "Application received: Senior React Developer", "Our recruiters will review your profile.", "/portal/applications", 76, true),
      N(cand[0].userId, "job_alert", "3 new jobs match your profile", "Senior React Developer, Product Designer (UI/UX), Data Analyst", "/portal/jobs", 50, true),
    ]),
    "notifications"
  );

  console.log("\n✓ Demo data ready\n");
  console.log(`  Password for every demo login: ${DEMO.password}\n`);
  console.log(`  Client portal (${DEMO.clientName}): ${DEMO.client.email}, ${DEMO.client2.email}`);
  console.log(`  Client portal, no jobs yet (${DEMO.emptyClientName}): ${DEMO.emptyClient.email}`);
  console.log(`  Candidate portal: ${DEMO.candidates[0].email} (richest profile) … demo.candidate10@example.com`);
  console.log(`  Brand-new candidate (empty state): ${DEMO.newCandidate.email}`);
  console.log("\n  Remove it all later with: node scripts/seed-portals.mjs --cleanup\n");
}

async function cleanup() {
  await removeLegacy();
  for (const name of [DEMO.clientName, DEMO.emptyClientName]) {
    const c = must(await db.from("clients").select("id, notes").ilike("name", name).maybeSingle(), "find client");
    if (c && c.notes === MARK) {
      must(await db.from("jobs").delete().eq("client_id", c.id), "delete jobs");
      must(await db.from("clients").delete().eq("id", c.id), "delete client");
    }
  }
  for (const c of [...DEMO.candidates, DEMO.newCandidate]) must(await db.from("candidates").delete().ilike("email", c.email), `delete ${c.email}`);
  const emails = [DEMO.client.email, DEMO.client2.email, DEMO.emptyClient.email, ...DEMO.staff.map((s) => s.email), ...DEMO.candidates.map((c) => c.email), DEMO.newCandidate.email];
  for (const email of emails) {
    const u = await findUser(email);
    if (u) must(await db.auth.admin.deleteUser(u.id), `delete user ${email}`);
  }
  console.log("✓ Demo data removed");
}

const isMain = /seed-portals\.mjs$/.test(process.argv[1] ?? "");
if (isMain) {
  (process.argv.includes("--cleanup") ? cleanup() : seed()).catch((e) => {
    console.error("✗", e.message);
    process.exit(1);
  });
}
