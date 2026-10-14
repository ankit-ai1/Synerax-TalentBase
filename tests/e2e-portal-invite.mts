/**
 * Portal invites + self-registration linking — end to end against a running build and the real database.
 *   1. imported candidate → inviteCandidates() → invite link → /auth/set-password → password + consent → /portal
 *      shows THEIR existing profile (no duplicate candidate), invite stored + logged
 *   2. an existing candidate login with the same email → linked + "sign-in link" (no new user)
 *   3. self-registration with an imported candidate's email → after verification the account is linked to that row
 * Test rows/accounts use @example.com and are deleted at the end. Local SMTP is off, so no email is really sent.
 *   npm run start (or next start) then:  npx tsx --conditions=react-server tests/e2e-portal-invite.mts [baseUrl]
 */
import fs from "node:fs";
import { createRequire } from "node:module";

for (const l of fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");
const { createClient } = require("@supabase/supabase-js");
const { inviteCandidates } = await import("../src/lib/candidates/invite");

const base = process.argv[2] ?? "http://localhost:3100";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
let pass = 0, fail = 0;
const check = (name: string, ok: boolean, extra = "") => {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? "✓" : "✗"} ${name}${!ok && extra ? `  → ${extra}` : ""}`);
};

const stamp = Date.now();
const emails = { a: `invite-a-${stamp}@example.com`, b: `invite-b-${stamp}@example.com`, c: `reg-c-${stamp}@example.com` };
const candIds: string[] = [];
const userIds: string[] = [];
const { data: staff } = await admin.from("profiles").select("id").eq("role", "admin").limit(1).single();

async function imported(email: string, first: string) {
  const { data, error } = await admin.from("candidates").insert({ first_name: first, last_name: "Imported", email, current_city: "Pune", source: "Import", status: "New" }).select("id").single();
  if (error) throw error;
  candIds.push(data.id);
  return data.id as string;
}
const rowsFor = async (email: string) => (await admin.from("candidates").select("id, user_id, consent_at, invited_at, invited_by, invite_count").ilike("email", email)).data ?? [];

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  // ---------------------------------------------------------------- 1. invite → set password → portal
  console.log("1. invite an imported candidate");
  const idA = await imported(emails.a, "Asha");
  const [rA] = await inviteCandidates([idA], staff!.id, { returnLinks: true });
  check("invite created", rA.status === "invited", JSON.stringify(rA));
  const linkA = rA.status === "invited" ? rA.link! : "";
  const afterInvite = (await rowsFor(emails.a))[0];
  if (afterInvite?.user_id) userIds.push(afterInvite.user_id);
  check("existing candidate row linked to the new login (user_id)", !!afterInvite?.user_id);
  check("invited_at / invited_by / invite_count stored", !!afterInvite?.invited_at && afterInvite?.invited_by === staff!.id && afterInvite?.invite_count === 1, JSON.stringify(afterInvite));
  const { data: prof } = await admin.from("profiles").select("role").eq("id", afterInvite?.user_id ?? "").maybeSingle();
  check("new login has role candidate", prof?.role === "candidate", JSON.stringify(prof));
  const { data: logs } = await admin.from("activity_logs").select("action").eq("candidate_id", idA);
  check("activity logged", (logs ?? []).some((l: { action: string }) => l.action === "Portal invite sent"), JSON.stringify(logs));

  const page = await (await browser.newContext()).newPage();
  await page.goto(linkA.replace(/^https?:\/\/[^/]+/, base));
  await page.waitForURL(/\/auth\/set-password/, { timeout: 20000 });
  check("invite link lands on /auth/set-password", true);
  await page.getByTestId("set-password-form").waitFor({ timeout: 15000 });
  const pw = page.locator('input[type="password"]');
  await pw.nth(0).fill("short");
  await pw.nth(1).fill("short");
  await page.getByTestId("invite-consent").check();
  await page.getByRole("button", { name: /Set password/ }).click();
  await page.waitForTimeout(800);
  check("rejects a password under 8 characters", /set-password/.test(page.url()));
  await pw.nth(0).fill("Invite-Test-123");
  await pw.nth(1).fill("Invite-Test-123");
  await page.getByRole("button", { name: /Set password/ }).click();
  await page.waitForURL(/\/portal/, { timeout: 30000 });
  await page.getByTestId("invite-welcome").waitFor({ timeout: 20000 });
  check("lands on /portal with the profile-completion prompt", true);
  check("portal shows the existing profile (name)", (await page.content()).includes("Asha"));
  const finalA = await rowsFor(emails.a);
  check("still exactly one candidate for that email", finalA.length === 1, `${finalA.length} rows`);
  check("consent recorded", !!finalA[0]?.consent_at);
  const login = await createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email: emails.a, password: "Invite-Test-123" });
  check("candidate can sign in with the new password", !login.error, login.error?.message);
  const [again] = await inviteCandidates([idA], staff!.id);
  check("inviting again skips an active candidate", again.status === "skipped" && /active/i.test((again as { reason: string }).reason), JSON.stringify(again));

  // ---------------------------------------------------------------- 2. existing login → link + sign-in link
  console.log("2. existing candidate login with the same email");
  const ub = await admin.auth.admin.createUser({ email: emails.b, password: "Existing-123!", email_confirm: true });
  if (ub.error) throw ub.error;
  userIds.push(ub.data.user.id);
  const idB = await imported(emails.b, "Bilal");
  const [rB] = await inviteCandidates([idB], staff!.id);
  check("sends a sign-in link instead of an invite", rB.status === "signin_link", JSON.stringify(rB));
  const rowB = (await rowsFor(emails.b))[0];
  check("linked to the existing login (no new user)", rowB?.user_id === ub.data.user.id, JSON.stringify(rowB));

  // ---------------------------------------------------------------- 3. self-registration links to the imported row
  console.log("3. self-registration with an imported candidate's email");
  const idC = await imported(emails.c, "Chetan");
  const uc = await admin.auth.admin.createUser({ email: emails.c, password: "SelfReg-123!", email_confirm: true });
  if (uc.error) throw uc.error;
  userIds.push(uc.data.user.id);
  // what /api/portal/register stores before verification (CV skipped here — it goes to Google Drive)
  await admin.auth.admin.updateUserById(uc.data.user.id, {
    app_metadata: {
      pending_registration: {
        full_name: "Chetan Self", email: emails.c, phone: `+9198${String(stamp).slice(-8)}`, current_city: "Pune", exp_years: 4, exp_months: 0,
        current_designation: "QA Engineer", skills: ["Java", "SQL", "Selenium"], current_ctc: 8, expected_ctc: 12, notice_period_days: 30,
        serving_notice: false, last_working_day: "", consent_at: new Date().toISOString(), cv: null,
      },
    },
  });
  const p3 = await (await browser.newContext()).newPage();
  await p3.goto(`${base}/login`);
  await p3.locator('input[type="email"]').fill(emails.c);
  await p3.locator("#password").fill("SelfReg-123!");
  await p3.getByRole("button", { name: /^Sign in$/ }).click();
  await p3.waitForURL(/\/portal/, { timeout: 30000 });
  await p3.waitForLoadState("networkidle");
  const rowsC = await rowsFor(emails.c);
  check("no duplicate: still one candidate for that email", rowsC.length === 1, `${rowsC.length} rows`);
  check("the imported row is now linked to the new account", rowsC[0]?.id === idC && rowsC[0]?.user_id === uc.data.user.id, JSON.stringify(rowsC));
  check("portal shows the profile", !(await p3.content()).includes("setting up your profile"));
} catch (e) {
  check("run", false, e instanceof Error ? e.message : String(e));
} finally {
  await browser.close();
  // cleanup
  for (const id of candIds) {
    await admin.from("activity_logs").delete().eq("candidate_id", id);
    await admin.from("emails").delete().eq("candidate_id", id);
    await admin.from("candidate_skills").delete().eq("candidate_id", id);
    await admin.from("candidates").delete().eq("id", id);
  }
  for (const e of Object.values(emails)) {
    const { data } = await admin.from("candidates").select("id").ilike("email", e);
    for (const r of data ?? []) await admin.from("candidates").delete().eq("id", r.id);
    const { data: p } = await admin.from("profiles").select("id").ilike("email", e);
    for (const r of p ?? []) if (!userIds.includes(r.id)) userIds.push(r.id);
  }
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
