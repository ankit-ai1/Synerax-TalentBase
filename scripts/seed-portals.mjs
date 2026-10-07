#!/usr/bin/env node
/**
 * Demo data for the client & candidate portals.
 *
 *   node scripts/seed-portals.mjs            → create (safe to re-run; reuses what exists)
 *   node scripts/seed-portals.mjs --cleanup  → delete everything this script created
 *
 * Creates: 1 client + 1 client login, 3 candidate logins (with profiles), 2 published jobs,
 * 1 portal application and 1 profile shared with the client.
 * All demo emails use @example.com, so no real email is ever sent to them.
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing in .env.local");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

export const DEMO = {
  password: "Demo@Portal2026",
  clientName: "Demo Client Pvt Ltd (seed)",
  client: { email: "demo.client@example.com", name: "Riya Kapoor", designation: "HR Manager" },
  candidates: [
    { email: "demo.candidate1@example.com", first_name: "Aarav", last_name: "Sharma", phone: "9000000001", designation: "Frontend Developer", exp: 4, skills: ["React", "TypeScript", "Node.js"], city: "Bengaluru" },
    { email: "demo.candidate2@example.com", first_name: "Diya", last_name: "Verma", phone: "9000000002", designation: "Full Stack Developer", exp: 6, skills: ["React", "Node.js", "PostgreSQL"], city: "Pune" },
    { email: "demo.candidate3@example.com", first_name: "Kabir", last_name: "Singh", phone: "9000000003", designation: "HR Executive", exp: 2, skills: ["Recruitment", "Payroll"], city: "Delhi" },
  ],
  jobs: [
    { title: "Senior React Developer (seed)", skills: ["React", "TypeScript"], locations: ["Bengaluru", "Remote"], exp_min: 3, exp_max: 7, ctc_min: 12, ctc_max: 22 },
    { title: "Node.js Backend Engineer (seed)", skills: ["Node.js", "PostgreSQL"], locations: ["Pune"], exp_min: 4, exp_max: 8, ctc_min: 15, ctc_max: 25 },
  ],
};

const must = (res, what) => {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data;
};

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

async function ensureUser(email, name, role) {
  let u = await findUser(email);
  if (!u) {
    u = must(await db.auth.admin.createUser({ email, password: DEMO.password, email_confirm: true, user_metadata: { full_name: name } }), `create ${email}`).user;
  } else {
    must(await db.auth.admin.updateUserById(u.id, { password: DEMO.password, ban_duration: "none" }), `update ${email}`);
  }
  must(await db.from("profiles").upsert({ id: u.id, email, full_name: name, role, is_active: true }), `profile ${email}`);
  return u.id;
}

async function skillId(name) {
  const found = must(await db.from("skills").select("id").ilike("name", name).maybeSingle(), `skill ${name}`);
  if (found) return found.id;
  return must(await db.from("skills").insert({ name }).select("id").single(), `insert skill ${name}`).id;
}

async function seed() {
  // client + login
  let client = must(await db.from("clients").select("id").ilike("name", DEMO.clientName).maybeSingle(), "find client");
  if (!client) client = must(await db.from("clients").insert({ name: DEMO.clientName, industry: "IT Services", city: "Bengaluru", status: "Active" }).select("id").single(), "create client");
  const clientUserId = await ensureUser(DEMO.client.email, DEMO.client.name, "client");
  must(
    await db.from("client_users").upsert({ client_id: client.id, user_id: clientUserId, name: DEMO.client.name, designation: DEMO.client.designation, is_active: true }, { onConflict: "user_id" }),
    "client_users"
  );

  // candidates
  const candIds = [];
  for (const c of DEMO.candidates) {
    const userId = await ensureUser(c.email, `${c.first_name} ${c.last_name}`, "candidate");
    let row = must(await db.from("candidates").select("id").ilike("email", c.email).maybeSingle(), `find ${c.email}`);
    const fields = {
      first_name: c.first_name,
      last_name: c.last_name,
      email: c.email,
      phone: c.phone,
      current_designation: c.designation,
      headline: `${c.designation} · ${c.exp} yrs`,
      total_experience: c.exp,
      current_city: c.city,
      preferred_locations: [c.city],
      notice_period_days: 30,
      current_ctc: 8 + c.exp,
      expected_ctc: 12 + c.exp,
      source: "Portal",
      status: "Available",
      user_id: userId,
      consent_at: new Date().toISOString(),
      job_alerts: true,
      open_to_work: true,
    };
    if (row) must(await db.from("candidates").update(fields).eq("id", row.id), `update ${c.email}`);
    else row = must(await db.from("candidates").insert(fields).select("id").single(), `create ${c.email}`);
    for (const [i, s] of c.skills.entries()) {
      must(await db.from("candidate_skills").upsert({ candidate_id: row.id, skill_id: await skillId(s), years: Math.max(1, c.exp - i), is_primary: i === 0 }), `skill ${s}`);
    }
    const hasCv = must(await db.from("candidate_documents").select("id").eq("candidate_id", row.id).eq("doc_type", "Resume").eq("is_archived", false).maybeSingle(), "cv");
    if (!hasCv) {
      // placeholder — there is no real file in Drive behind it (opening it shows "File unavailable")
      must(
        await db.from("candidate_documents").insert({ candidate_id: row.id, doc_type: "Resume", file_name: `${c.first_name}_${c.last_name}_CV.pdf`, mime_type: "application/pdf", size_bytes: 1024, drive_file_id: "seed-placeholder" }),
        "cv insert"
      );
    }
    await db.rpc("refresh_candidate_search", { p_id: row.id });
    candIds.push(row.id);
  }

  // jobs
  const jobIds = [];
  for (const j of DEMO.jobs) {
    let job = must(await db.from("jobs").select("id").eq("client_id", client.id).eq("title", j.title).maybeSingle(), `find ${j.title}`);
    const fields = {
      title: j.title,
      client_id: client.id,
      status: "Open",
      priority: "High",
      openings: 2,
      locations: j.locations,
      work_mode: "Hybrid",
      exp_min: j.exp_min,
      exp_max: j.exp_max,
      ctc_min: j.ctc_min,
      ctc_max: j.ctc_max,
      notice_max: 60,
      description: `Demo requirement for ${j.title.replace(" (seed)", "")}.`,
      public_description: `We're hiring a ${j.title.replace(" (seed)", "")} for a fast-growing product company. You'll build and ship features end to end, work closely with design and product, and mentor junior engineers. Must-have: ${j.skills.join(", ")}.`,
      interview_process: "HR screen → Technical round → Manager round",
      published: true,
      published_at: new Date().toISOString(),
      show_client_name: false,
    };
    if (job) must(await db.from("jobs").update(fields).eq("id", job.id), `update ${j.title}`);
    else job = must(await db.from("jobs").insert(fields).select("id").single(), `create ${j.title}`);
    for (const s of j.skills) must(await db.from("job_skills").upsert({ job_id: job.id, skill_id: await skillId(s), is_mandatory: true }), `job skill ${s}`);
    jobIds.push(job.id);
  }

  // candidate 1 applied via the portal to job 1; candidate 2 shared with the client for job 1
  const app1 = must(await db.from("applications").select("id").eq("job_id", jobIds[0]).eq("candidate_id", candIds[0]).maybeSingle(), "app1");
  if (!app1) must(await db.from("applications").insert({ job_id: jobIds[0], candidate_id: candIds[0], stage: "Applied", origin: "Candidate applied" }), "insert app1");
  let app2 = must(await db.from("applications").select("id").eq("job_id", jobIds[0]).eq("candidate_id", candIds[1]).maybeSingle(), "app2");
  if (!app2) app2 = must(await db.from("applications").insert({ job_id: jobIds[0], candidate_id: candIds[1], stage: "Submitted" }).select("id").single(), "insert app2");
  const cv2 = must(await db.from("candidate_documents").select("id").eq("candidate_id", candIds[1]).eq("doc_type", "Resume").eq("is_archived", false).limit(1).single(), "cv2");
  must(
    await db
      .from("applications")
      .update({ shared_with_client: true, shared_at: new Date().toISOString(), client_cv_document_id: cv2.id, client_decision: "Pending", share_note: "Strong full-stack profile, 30 days notice." })
      .eq("id", app2.id),
    "share app2"
  );

  console.log("\n✓ Demo data ready\n");
  console.log(`  Password for every demo login: ${DEMO.password}\n`);
  console.log(`  Client portal   : ${DEMO.client.email}  → /client  (${DEMO.clientName})`);
  for (const c of DEMO.candidates) console.log(`  Candidate portal: ${c.email}  → /portal`);
  console.log(`\n  Jobs: ${DEMO.jobs.map((j) => j.title).join(", ")}`);
  console.log("  Remove it all later with: node scripts/seed-portals.mjs --cleanup\n");
}

async function cleanup() {
  const client = must(await db.from("clients").select("id").ilike("name", DEMO.clientName).maybeSingle(), "find client");
  if (client) {
    must(await db.from("jobs").delete().eq("client_id", client.id), "delete jobs");
    must(await db.from("clients").delete().eq("id", client.id), "delete client");
  }
  for (const c of DEMO.candidates) must(await db.from("candidates").delete().ilike("email", c.email), `delete ${c.email}`);
  for (const email of [DEMO.client.email, ...DEMO.candidates.map((c) => c.email)]) {
    const u = await findUser(email);
    if (u) must(await db.auth.admin.deleteUser(u.id), `delete user ${email}`);
  }
  console.log("✓ Demo data removed");
}

const isMain = /seed-portals.mjs$/.test(process.argv[1] ?? "");
if (isMain) {
  (process.argv.includes("--cleanup") ? cleanup() : seed()).catch((e) => {
    console.error("✗", e.message);
    process.exit(1);
  });
}
