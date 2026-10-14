#!/usr/bin/env node
/**
 * Apply rules (migration 008) against the real database:
 *   1. a candidate below the threshold cannot apply — direct RPC call with THEIR JWT → PROFILE_INCOMPLETE
 *   2. staff can still add the same candidate to the job → applications.below_threshold + an "Override" activity entry
 * Creates a temporary candidate account + job and deletes them afterwards.
 * Step 2 needs an existing staff login: TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD (never changed by this script).
 *   node scripts/test-apply-rules.mjs
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, opts);
const anon = () => createClient(URL_, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, opts);

let pass = 0, fail = 0;
const check = (name, ok, extra = "") => {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? "✓" : "✗"} ${name}${!ok && extra ? `  → ${extra}` : ""}`);
};

const stamp = Date.now();
const email = `apply-rules-test-${stamp}@example.com`;
const password = `T${stamp}!aA`;
let userId, candId, jobId;

try {
  const { data: min } = await admin.rpc("min_completion_to_apply");
  console.log(`threshold: ${min}%`);

  // temporary candidate: basic + contact + notice only (≈ 30–40%)
  const u = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: "Apply Test" } });
  if (u.error) throw u.error;
  userId = u.data.user.id;
  await admin.from("profiles").update({ role: "candidate", full_name: "Apply Test" }).eq("id", userId);
  const c = await admin
    .from("candidates")
    .insert({ first_name: "Apply", last_name: "Test", email, phone: `+97150${String(stamp).slice(-7)}`, current_city: "Dubai", notice_period_days: 30, user_id: userId, source: "Portal", status: "New" })
    .select("id")
    .single();
  if (c.error) throw c.error;
  candId = c.data.id;

  const j = await admin.from("jobs").insert({ title: `Apply rules test ${stamp}`, status: "Open", published: true }).select("id").single();
  if (j.error) throw j.error;
  jobId = j.data.id;

  // 1. candidate's own JWT
  const cand = anon();
  const s = await cand.auth.signInWithPassword({ email, password });
  check("temporary candidate can sign in", !s.error, s.error?.message);
  const { data: comp } = await cand.rpc("candidate_completion", { p_candidate: candId });
  check(`candidate is below the threshold (${comp?.percent}% < ${min}%)`, comp && comp.percent < min && comp.threshold === min, JSON.stringify(comp));
  const ap = await cand.rpc("candidate_apply", { p_job: jobId });
  check("candidate_apply is refused with PROFILE_INCOMPLETE", !!ap.error && ap.error.message.includes("PROFILE_INCOMPLETE"), ap.error?.message ?? "applied!");
  const { count } = await admin.from("applications").select("id", { count: "exact", head: true }).eq("job_id", jobId).eq("candidate_id", candId);
  check("no application row was created", count === 0, `${count} rows`);

  // 2. staff override
  if (process.env.TEST_ADMIN_EMAIL && process.env.TEST_ADMIN_PASSWORD) {
    const staff = anon();
    const ss = await staff.auth.signInWithPassword({ email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD });
    check("staff can sign in", !ss.error, ss.error?.message);
    const add = await staff.rpc("add_to_job", { p_job: jobId, p_candidates: [candId], p_stage: "Sourced" });
    check("staff add_to_job is NOT blocked", !add.error && add.data === 1, add.error?.message ?? String(add.data));
    const { data: app } = await admin.from("applications").select("id, below_threshold, completion_at_add").eq("job_id", jobId).eq("candidate_id", candId).maybeSingle();
    check(`application flagged below threshold (${app?.completion_at_add}%)`, app?.below_threshold === true, JSON.stringify(app));
    const { data: logs } = await admin.from("activity_logs").select("action").eq("entity_id", app?.id ?? "00000000-0000-0000-0000-000000000000");
    check("activity entry 'Override: added below completion threshold'", (logs ?? []).some((l) => l.action === "Override: added below completion threshold"), JSON.stringify(logs));
  } else {
    console.log("  – staff override checks skipped (set TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD to run them)");
  }
} catch (e) {
  check("setup", false, e?.message ?? String(e));
} finally {
  if (jobId) {
    const { data: apps } = await admin.from("applications").select("id").eq("job_id", jobId);
    if (apps?.length) await admin.from("activity_logs").delete().in("entity_id", apps.map((a) => a.id));
    await admin.from("applications").delete().eq("job_id", jobId);
    await admin.from("jobs").delete().eq("id", jobId);
  }
  if (candId) await admin.from("candidates").delete().eq("id", candId);
  if (userId) await admin.auth.admin.deleteUser(userId);
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
