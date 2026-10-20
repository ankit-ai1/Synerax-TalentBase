/**
 * Client teams — end to end against the real database (migration 014) and a running build.
 *   1. seeds "Teams QA" (client_admin, 2 recruiters, hiring manager, TA coordinator) + "Other QA" (1 admin);
 *      each recruiter posts a job through the real RPC with their own login; Synerax shares a candidate on job A
 *   2. access rules with REAL JWTs (list, detail, RPC, direct table reads, cross-company, contact details)
 *   3. UI: each role's dashboard (screenshots), direct URL to another recruiter's job, task assignment end to end,
 *      transfer-on-deactivate, deactivated login blocked
 *   4. existing single-login clients are client_admin
 * Everything it creates uses @example.com / "QA" names and is deleted at the end (KEEP=1 keeps it).
 *   next start -p 3100, then:  npx tsx tests/e2e-client-teams.mts [baseUrl]
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";

for (const l of fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");
const { createClient } = require("@supabase/supabase-js");

const base = process.argv[2] ?? "http://localhost:3100";
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, opts);
const SHOTS = path.resolve("client-teams-proof");
fs.mkdirSync(SHOTS, { recursive: true });

let pass = 0, fail = 0;
const check = (name: string, ok: boolean, extra = "") => {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? "✓" : "✗"} ${name}${!ok && extra ? `  → ${extra}` : ""}`);
};
const stamp = Date.now();
const PASSWORD = `Qa-${crypto.randomBytes(9).toString("base64url")}!9`;
const created = { users: [] as string[], clients: [] as string[], candidates: [] as string[] };

async function mkClient(name: string) {
  const { data, error } = await admin.from("clients").insert({ name: `${name} ${stamp}` }).select("id").single();
  if (error) throw error;
  created.clients.push(data.id);
  return data.id as string;
}
async function mkMember(clientId: string, key: string, role: string) {
  const email = `teams-${key}-${stamp}@example.com`;
  const u = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: `QA ${key}` } });
  if (u.error) throw u.error;
  created.users.push(u.data.user.id);
  await admin.from("profiles").upsert({ id: u.data.user.id, email, full_name: `QA ${key}`, role: "client", is_active: true });
  const { data, error } = await admin.from("client_users").insert({ client_id: clientId, user_id: u.data.user.id, name: `QA ${key}`, role, status: "active" }).select("id").single();
  if (error) throw error;
  const sb = createClient(URL_, ANON, opts);
  const s = await sb.auth.signInWithPassword({ email, password: PASSWORD });
  if (s.error) throw s.error;
  return { id: data.id as string, uid: u.data.user.id as string, email, sb, name: `QA ${key}` };
}
const titles = async (sb: any) => ((await sb.rpc("client_jobs")).data ?? []).map((j: any) => j.title).sort();
const refused = async (p: PromiseLike<{ error: any; data: any }>) => {
  const r = await p;
  return !!r.error && /Not allowed|VALIDATION/.test(r.error.message);
};

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  // ---------------------------------------------------------------- 1. seed
  console.log("seed");
  const co = await mkClient("Teams QA");
  const other = await mkClient("Other QA");
  const m = {
    admin: await mkMember(co, "admin", "client_admin"),
    recA: await mkMember(co, "reca", "recruiter"),
    recB: await mkMember(co, "recb", "recruiter"),
    hm: await mkMember(co, "hm", "hiring_manager"),
    ta: await mkMember(co, "ta", "ta_coordinator"),
    otherAdmin: await mkMember(other, "otheradmin", "client_admin"),
  };
  const jobA = (await m.recA.sb.rpc("client_save_job", { p: { job: { title: `QA Java developer ${stamp}` } } })).data as string;
  const jobB = (await m.recB.sb.rpc("client_save_job", { p: { job: { title: `QA Test lead ${stamp}` } } })).data as string;
  check("each recruiter posted a job through the RPC", !!jobA && !!jobB);
  await admin.from("jobs").update({ status: "Open", published: true }).in("id", [jobA, jobB]);
  const cand = await admin.from("candidates").insert({ first_name: "QA", last_name: `Candidate ${stamp}`, email: `qa-cand-${stamp}@example.com`, phone: "+919812345670", current_designation: "Java Developer" }).select("id").single();
  created.candidates.push(cand.data.id);
  const appA = (await admin.from("applications").insert({ job_id: jobA, candidate_id: cand.data.id, stage: "Submitted", shared_with_client: true, client_decision: "Pending", shared_at: new Date().toISOString() }).select("id").single()).data.id as string;
  const candB = await admin.from("candidates").insert({ first_name: "QB", last_name: `Candidate ${stamp}`, email: `qb-cand-${stamp}@example.com` }).select("id").single();
  created.candidates.push(candB.data.id);
  const appB = (await admin.from("applications").insert({ job_id: jobB, candidate_id: candB.data.id, stage: "Submitted", shared_with_client: true, client_decision: "Pending", shared_at: new Date().toISOString() }).select("id").single()).data.id as string;

  // ---------------------------------------------------------------- 2. rules with real JWTs
  console.log("access rules (real logins)");
  const { data: own } = await admin.from("jobs").select("posted_by_client_user").eq("id", jobA).single();
  check("owner set from the caller, never from the request", own.posted_by_client_user === m.recA.id);
  check("recruiter A sees only own job", JSON.stringify(await titles(m.recA.sb)) === JSON.stringify([`QA Java developer ${stamp}`]));
  check("recruiter B sees only own job", JSON.stringify(await titles(m.recB.sb)) === JSON.stringify([`QA Test lead ${stamp}`]));
  check("client_admin sees all jobs", (await titles(m.admin.sb)).length === 2);
  check("hiring manager sees nothing that isn't theirs", (await titles(m.hm.sb)).length === 0);
  check("other company sees none of them", (await titles(m.otherAdmin.sb)).length === 0);
  check("A: detail of B's job → nothing", (await m.recA.sb.rpc("client_job", { p_job: jobB })).data === null);
  check("A: B's shared profiles → refused", await refused(m.recA.sb.rpc("client_shared_candidates", { p_job: jobB })));
  check("A: approve on B's job → refused", await refused(m.recA.sb.rpc("client_decide", { p_application: appB, p_decision: "Approved" })));
  check("A: close B's job → refused", await refused(m.recA.sb.rpc("client_close_job", { p_job: jobB, p_reason: "Cancelled" })));
  check("A: direct table read of jobs → 0 rows (RLS)", ((await m.recA.sb.from("jobs").select("id").in("id", [jobA, jobB])).data ?? []).length === 0);
  check("A: direct read of client_tasks → 0 rows (RLS)", ((await m.recA.sb.from("client_tasks").select("id")).data ?? []).length === 0);
  check("other company: decide on Teams QA profile → refused", await refused(m.otherAdmin.sb.rpc("client_decide", { p_application: appA, p_decision: "Approved" })));
  check("TA cannot post a job", await refused(m.ta.sb.rpc("client_save_job", { p: { job: { title: "x" } } })));
  for (const [who, sb] of [["admin", m.admin.sb], ["recruiter A", m.recA.sb]] as const) {
    const txt = JSON.stringify((await sb.rpc("client_shared_candidates", { p_job: jobA })).data);
    check(`${who}: shared profile has no email / phone`, txt.includes("Java Developer") && !txt.includes("@example.com") && !txt.includes("9812345670"));
  }

  // ---------------------------------------------------------------- 3. UI
  const login = async (who: { email: string }) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${base}/login`);
    await page.locator('input[type="email"]').fill(who.email);
    await page.locator("#password").fill(PASSWORD);
    await page.getByRole("button", { name: /^Sign in$/ }).click();
    await page.waitForURL(/\/client/, { timeout: 30000 });
    return page;
  };
  console.log("dashboards (screenshots in client-teams-proof/)");
  for (const [key, who, marker] of [["client_admin", m.admin, "role-admin"], ["hiring_manager", m.hm, "role-member"], ["recruiter", m.recA, "role-member"], ["ta_coordinator", m.ta, "role-ta"]] as const) {
    const page = await login(who);
    await page.goto(`${base}/client`);
    await page.getByTestId(marker).waitFor({ timeout: 20000 });
    await page.screenshot({ path: path.join(SHOTS, `dashboard-${key}.png`), fullPage: true });
    check(`${key} dashboard shows its role block`, true);
    await page.context().close();
  }

  console.log("recruiter A: direct URL to B's job");
  const pa = await login(m.recA);
  const res = await pa.goto(`${base}/client/jobs/${jobB}`);
  check("B's job URL → not found for A", res?.status() === 404 || (await pa.content()).includes("could not be found") || (await pa.content()).includes("404"));
  await pa.goto(`${base}/client/jobs`);
  check("job cards show 'Posted by'", (await pa.getByTestId("posted-by").count()) > 0);
  await pa.context().close();

  console.log("task assignment end to end");
  const pAdmin = await login(m.admin);
  await pAdmin.goto(`${base}/client/jobs/${jobA}/profiles/${appA}`);
  await pAdmin.getByTestId("assign-task").first().click();
  await pAdmin.locator("select").first().selectOption({ label: `${m.ta.name} · TA coordinator` });
  await pAdmin.getByTestId("assign-task-save").click();
  await pAdmin.waitForTimeout(2500);
  const { data: task } = await admin.from("client_tasks").select("id, assigned_to").eq("client_id", co).maybeSingle();
  check("task created and assigned to the TA", task?.assigned_to === m.ta.id);
  const { count: inApp } = await admin.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", m.ta.uid).eq("type", "client_task_assigned");
  check("TA got an in-app notification", (inApp ?? 0) >= 1);
  const { count: mails } = await admin.from("emails").select("id", { count: "exact", head: true }).eq("user_id", m.ta.uid).eq("template", "client_task_assigned");
  check("TA got an email (through the queue)", (mails ?? 0) >= 1);
  const pTa = await login(m.ta);
  await pTa.goto(`${base}/client/jobs`);
  check("TA now sees exactly that job", JSON.stringify(await titles(m.ta.sb)) === JSON.stringify([`QA Java developer ${stamp}`]));
  await pTa.goto(`${base}/client/jobs/${jobA}/profiles/${appA}`);
  check("TA sees no approve/reject on the profile", (await pTa.getByRole("button", { name: /^Approve/ }).count()) === 0);
  await pTa.goto(`${base}/client/tasks`);
  await pTa.getByTestId("task-done").first().click();
  await pTa.waitForTimeout(2000);
  const { data: doneTask } = await admin.from("client_tasks").select("status").eq("id", task?.id ?? "").maybeSingle();
  check("TA completed the task", doneTask?.status === "done");
  await pTa.context().close();

  console.log("transfer on deactivate");
  await pAdmin.goto(`${base}/client/team`);
  await pAdmin.getByRole("button", { name: `Actions for ${m.recA.name}` }).click();
  await pAdmin.getByText("Deactivate…").click();
  await pAdmin.getByTestId("holdings").waitFor({ timeout: 15000 });
  check("dialog asks who receives A's job", /Transfer 1 job/.test((await pAdmin.getByTestId("holdings").textContent()) ?? ""));
  await pAdmin.locator('[role="dialog"] select').selectOption({ label: `${m.recB.name} · Recruiter (HR)` });
  await pAdmin.getByTestId("deactivate-confirm").click();
  await pAdmin.waitForTimeout(3000);
  const { data: moved } = await admin.from("jobs").select("posted_by_client_user").eq("id", jobA).single();
  check("job A now owned by B", moved.posted_by_client_user === m.recB.id);
  const { count: bNote } = await admin.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", m.recB.uid).eq("type", "client_job_transferred");
  check("B was notified", (bNote ?? 0) >= 1);
  const again = await createClient(URL_, ANON, opts).auth.signInWithPassword({ email: m.recA.email, password: PASSWORD });
  check("deactivated A cannot log in", !!again.error, again.error?.message ?? "signed in!");
  const { data: log } = await admin.from("client_activity_log").select("action").eq("client_id", co);
  const acts = (log ?? []).map((l: any) => l.action);
  check("activity logged (posted, task assigned/completed, deactivated)", ["job_posted", "task_assigned", "task_completed", "member_deactivated"].every((a) => acts.includes(a)), acts.join(","));
  await pAdmin.context().close();

  // ---------------------------------------------------------------- 4. existing clients
  console.log("existing single-login clients");
  const { data: legacy } = await admin.from("client_users").select("role, client_id").not("client_id", "in", `(${created.clients.join(",")})`);
  const byClient = new Map<string, string[]>();
  for (const r of legacy ?? []) byClient.set(r.client_id, [...(byClient.get(r.client_id) ?? []), r.role]);
  const single = [...byClient.values()].filter((rs) => rs.length === 1);
  check(`existing single-login clients are client_admin (${single.length})`, single.every((rs) => rs[0] === "client_admin"));
} catch (e) {
  check("run", false, e instanceof Error ? e.message : String(e));
} finally {
  await browser.close();
  if (process.env.KEEP !== "1") {
    for (const c of created.clients) {
      const { data: jobs } = await admin.from("jobs").select("id").eq("client_id", c);
      const ids = (jobs ?? []).map((j: any) => j.id);
      if (ids.length) {
        await admin.from("applications").delete().in("job_id", ids);
        await admin.from("jobs").delete().in("id", ids);
      }
      await admin.from("clients").delete().eq("id", c);
    }
    for (const id of created.candidates) await admin.from("candidates").delete().eq("id", id);
    for (const id of created.users) {
      await admin.from("notifications").delete().eq("user_id", id);
      await admin.from("emails").delete().eq("user_id", id);
      await admin.auth.admin.deleteUser(id);
    }
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
