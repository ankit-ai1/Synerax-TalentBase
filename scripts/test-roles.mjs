#!/usr/bin/env node
/**
 * Role security tests — talks to Supabase with the PUBLIC key only, exactly like a browser would.
 * Run `node scripts/seed-portals.mjs` first. Then: node scripts/test-roles.mjs
 * Exits with code 1 if any check fails.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { DEMO } from "./seed-portals.mjs";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const fresh = () => createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } });

let pass = 0;
let fail = 0;
const check = (name, ok, extra = "") => {
  if (ok) pass++;
  else fail++;
  console.log(`  ${ok ? "✓" : "✗"} ${name}${!ok && extra ? `  → ${extra}` : ""}`);
};
const empty = async (q) => {
  const { data, error } = await q;
  return { ok: !!error || (Array.isArray(data) && data.length === 0), info: error ? error.message : `${data?.length} rows` };
};
const denied = async (q) => {
  const { data, error } = await q;
  return { ok: !!error, info: error ? error.message : JSON.stringify(data).slice(0, 120) };
};
const claimRole = (session) => {
  try {
    return JSON.parse(Buffer.from(session.access_token.split(".")[1], "base64url").toString()).user_role;
  } catch {
    return null;
  }
};
const STAFF_TABLES = ["candidates", "applications", "jobs", "clients", "client_users", "candidate_documents", "interviews", "email_log", "email_settings", "activity_logs", "candidate_notes", "application_comments"];

async function signIn(email) {
  const c = fresh();
  const { data, error } = await c.auth.signInWithPassword({ email, password: DEMO.password });
  if (error) throw new Error(`sign-in ${email}: ${error.message}`);
  return { c, session: data.session, user: data.user };
}

async function noTableAccess(c, label) {
  for (const t of STAFF_TABLES) {
    const r = await empty(c.from(t).select("*").limit(5));
    check(`${label}: no direct read of ${t}`, r.ok, r.info);
  }
}

async function main() {
  // ------------------------------------------------------------ anonymous
  console.log("\nAnonymous visitor");
  const anon = fresh();
  await noTableAccess(anon, "anon");
  for (const [fn, args] of [
    ["candidate_jobs", { f: {} }],
    ["client_jobs", {}],
    ["search_candidates", { f: {} }],
    ["dashboard_stats", {}],
    ["share_with_client", { p_application_ids: [] }],
    ["job_alert_matches", {}],
  ]) {
    const r = await denied(anon.rpc(fn, args));
    check(`anon: rpc ${fn} refused`, r.ok, r.info);
  }

  // ------------------------------------------------------------ candidate
  console.log("\nCandidate (demo.candidate1)");
  const cand = await signIn(DEMO.candidates[0].email);
  check("candidate: JWT carries user_role = candidate", claimRole(cand.session) === "candidate", String(claimRole(cand.session)));
  await noTableAccess(cand.c, "candidate");
  const prof = await cand.c.rpc("candidate_my_profile");
  check("candidate: can read own profile", !prof.error && prof.data?.candidate?.first_name === DEMO.candidates[0].first_name, prof.error?.message ?? JSON.stringify(prof.data).slice(0, 100));
  const jobs = await cand.c.rpc("candidate_jobs", { f: {} });
  const jobList = jobs.data?.items ?? jobs.data ?? [];
  check("candidate: sees published jobs", !jobs.error && JSON.stringify(jobList).includes("Senior React Developer"), jobs.error?.message);
  check("candidate: job list hides the client name", !JSON.stringify(jobs.data ?? {}).includes(DEMO.clientName), "client name leaked");
  check("candidate: job list has no budget/internal notes", !/"(notes|ctc_min|ctc_max|fee_value)"/.test(JSON.stringify(jobs.data ?? {})), "internal fields present");
  const apps = await cand.c.rpc("candidate_my_applications");
  check("candidate: sees own application", !apps.error && JSON.stringify(apps.data).includes("Senior React"), apps.error?.message);
  check("candidate: no rejection reasons / client feedback in own applications", !/"(rejection_reason|client_feedback|client_reject_reason|share_note)"/.test(JSON.stringify(apps.data ?? {})), "internal fields present");
  for (const [fn, args] of [
    ["client_jobs", {}],
    ["client_me", {}],
    ["search_candidates", { f: {} }],
    ["dashboard_stats", {}],
    ["share_with_client", { p_application_ids: [] }],
    ["match_candidates", { p_job: "00000000-0000-0000-0000-000000000000" }],
    ["job_alert_matches", {}],
  ]) {
    const r = await denied(cand.c.rpc(fn, args));
    check(`candidate: rpc ${fn} refused`, r.ok, r.info);
  }
  const esc = await cand.c.from("profiles").update({ role: "admin" }).eq("id", cand.user.id).select();
  check("candidate: cannot promote self to admin", !!esc.error || (esc.data ?? []).length === 0, JSON.stringify(esc.data));
  const others = await cand.c.from("profiles").select("id");
  check("candidate: sees only own profile row", !others.error && (others.data ?? []).length === 1, `${others.data?.length} rows`);
  const notif = await cand.c.from("notifications").insert({ user_id: cand.user.id, type: "x", title: "spoof" });
  check("candidate: cannot create notifications", !!notif.error, "insert allowed");

  // ------------------------------------------------------------ client
  console.log("\nClient (demo.client)");
  const cli = await signIn(DEMO.client.email);
  check("client: JWT carries user_role = client", claimRole(cli.session) === "client", String(claimRole(cli.session)));
  await noTableAccess(cli.c, "client");
  const cj = await cli.c.rpc("client_jobs");
  const cjList = Array.isArray(cj.data) ? cj.data : cj.data?.items ?? [];
  check("client: sees own jobs", !cj.error && cjList.length >= 2, cj.error?.message ?? `${cjList.length} jobs`);
  const job1 = cjList.find((j) => j.title?.startsWith("Senior React"));
  if (job1) {
    const shared = await cli.c.rpc("client_shared_candidates", { p_job: job1.id });
    const txt = JSON.stringify(shared.data ?? {});
    check("client: sees the shared profile", !shared.error && txt.includes(DEMO.candidates[1].first_name), shared.error?.message);
    check("client: does NOT see the unshared applicant", !txt.includes(DEMO.candidates[0].email) && !txt.includes(`"${DEMO.candidates[0].last_name}"`), "unshared candidate visible");
    check("client: no candidate phone/email in shared profiles", !txt.includes(DEMO.candidates[1].phone) && !txt.includes(DEMO.candidates[1].email), "contact details leaked");
    check("client: no internal notes/owner in shared profiles", !/"(owner|notes|current_ctc|rejection_reason)"/.test(txt), "internal fields present");
  } else check("client: demo job found", false, "run seed first");
  for (const [fn, args] of [
    ["candidate_my_profile", {}],
    ["candidate_jobs", { f: {} }],
    ["search_candidates", { f: {} }],
    ["dashboard_stats", {}],
    ["share_with_client", { p_application_ids: [] }],
    ["job_alert_matches", {}],
  ]) {
    const r = await denied(cli.c.rpc(fn, args));
    check(`client: rpc ${fn} refused`, r.ok, r.info);
  }
  const foreign = await denied(cli.c.rpc("client_job", { p_job: "00000000-0000-0000-0000-000000000000" }));
  check("client: cannot open a job that isn't theirs", foreign.ok || foreign.info === "null", foreign.info);
  const esc2 = await cli.c.from("profiles").update({ role: "admin" }).eq("id", cli.user.id).select();
  check("client: cannot promote self to admin", !!esc2.error || (esc2.data ?? []).length === 0, JSON.stringify(esc2.data));

  console.log(`\n${fail ? "✗" : "✓"} ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
