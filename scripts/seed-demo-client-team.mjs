#!/usr/bin/env node
/**
 * Test company for trying client teams by hand: "Demo Client (Test)" with one login per role.
 *   node scripts/seed-demo-client-team.mjs           → create (prints the logins once)
 *   node scripts/seed-demo-client-team.mjs --delete  → remove the company, its jobs and all its logins
 */
import { readFileSync } from "node:fs";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, opts);
const NAME = "Demo Client (Test)";
const PEOPLE = [
  ["admin", "Demo Admin", "client_admin"],
  ["recruiter1", "Demo Recruiter One", "recruiter"],
  ["recruiter2", "Demo Recruiter Two", "recruiter"],
  ["manager", "Demo Hiring Manager", "hiring_manager"],
  ["ta", "Demo TA Coordinator", "ta_coordinator"],
];
const emailOf = (k) => `demo.${k}@example.com`;

async function remove() {
  const { data: c } = await admin.from("clients").select("id").eq("name", NAME).maybeSingle();
  if (c) {
    const { data: jobs } = await admin.from("jobs").select("id").eq("client_id", c.id);
    const ids = (jobs ?? []).map((j) => j.id);
    if (ids.length) {
      await admin.from("applications").delete().in("job_id", ids);
      await admin.from("jobs").delete().in("id", ids);
    }
    await admin.from("clients").delete().eq("id", c.id);
  }
  await admin.from("candidates").delete().like("email", "demo.candidate%@example.com");
  for (const [k] of PEOPLE) {
    const { data: p } = await admin.from("profiles").select("id").eq("email", emailOf(k)).maybeSingle();
    if (p) {
      await admin.from("notifications").delete().eq("user_id", p.id);
      await admin.auth.admin.deleteUser(p.id);
    }
  }
}

if (process.argv.includes("--delete")) {
  await remove();
  console.log("Demo company and its logins deleted.");
  process.exit(0);
}

await remove(); // start clean
const password = `Demo-${crypto.randomBytes(6).toString("base64url")}-26`;
const { data: client, error: cErr } = await admin.from("clients").insert({ name: NAME, city: "Noida", industry: "IT Services" }).select("id").single();
if (cErr) throw cErr;
const members = {};
for (const [k, name, role] of PEOPLE) {
  const email = emailOf(k);
  const u = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } });
  if (u.error) throw u.error;
  await admin.from("profiles").upsert({ id: u.data.user.id, email, full_name: name, role: "client", is_active: true });
  const { data: cu, error } = await admin.from("client_users").insert({ client_id: client.id, user_id: u.data.user.id, name, role, status: "active", designation: role.replace("_", " ") }).select("id").single();
  if (error) throw error;
  members[k] = { id: cu.id, email };
}

// each recruiter posts a job with their own login (owner is set by the database), then Synerax "publishes" it
async function post(k, title) {
  const sb = createClient(URL_, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, opts);
  await sb.auth.signInWithPassword({ email: emailOf(k), password });
  const { data, error } = await sb.rpc("client_save_job", { p: { job: { title, openings: 2, locations: ["Noida"], work_mode: "Hybrid", exp_min: 3, exp_max: 7, description: "Demo job for testing client teams." } } });
  if (error) throw error;
  await admin.from("jobs").update({ status: "Open", published: true, published_at: new Date().toISOString() }).eq("id", data);
  return data;
}
const job1 = await post("recruiter1", "Java Developer (demo)");
await post("recruiter2", "QA Lead (demo)");
const { data: cand } = await admin.from("candidates").insert({ first_name: "Demo", last_name: "Candidate", email: "demo.candidate1@example.com", current_designation: "Senior Java Developer", total_experience: 5, current_city: "Noida", notice_period_days: 30, expected_ctc: 18 }).select("id").single();
await admin.from("applications").insert({ job_id: job1, candidate_id: cand.id, stage: "Submitted", shared_with_client: true, client_decision: "Pending", shared_at: new Date().toISOString(), share_note: "Strong Spring Boot background." });

console.log(`\nCompany: ${NAME}\nLogin at: https://staffing.synerax.in/login\nPassword (all): ${password}\n`);
for (const [k, name, role] of PEOPLE) console.log(`${role.padEnd(15)} ${emailOf(k).padEnd(30)} ${name}`);
console.log("\nDelete everything later:  node scripts/seed-demo-client-team.mjs --delete");
