/**
 * Automatic portal invites on bulk import — end to end through the real import screen.
 *   import 3 rows (1 new with email, 1 duplicate of an existing candidate, 1 without email), checkbox ON
 *   → exactly 1 invite queued (only the newly created candidate with an email)
 *   → the invite link → set password → the candidate sees their existing profile
 *   → on the staff profile an Active candidate has no invite button
 * Needs a staff login: TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD in .env.local (never changed by this test).
 * Test rows use @example.com and are deleted at the end.
 *   next start -p 3100, then:  npm run test:e2e:import-invite
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

const base = process.argv[2] ?? "http://localhost:3100";
const { TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD } = process.env;
if (!TEST_ADMIN_EMAIL || !TEST_ADMIN_PASSWORD) {
  console.log("Set TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD (a staff login) in .env.local to run this test.");
  process.exit(2);
}
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
let pass = 0, fail = 0;
const check = (name: string, ok: boolean, extra = "") => {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? "✓" : "✗"} ${name}${!ok && extra ? `  → ${extra}` : ""}`);
};

const stamp = Date.now();
const d8 = String(stamp).slice(-8);
const newEmail = `import-new-${stamp}@example.com`;
const dupEmail = `import-dup-${stamp}@example.com`;
const tracked: string[] = [newEmail, dupEmail];
const noEmailPhone = `+9197${d8}`;
const browser = await chromium.launch({ channel: "chrome", headless: true });

try {
  // an existing candidate the import will collide with
  const dup = await admin.from("candidates").insert({ first_name: "Dup", last_name: "Existing", email: dupEmail, source: "Import", status: "New" }).select("id").single();
  if (dup.error) throw dup.error;

  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${base}/login`);
  await page.locator('input[type="email"]').fill(TEST_ADMIN_EMAIL);
  await page.locator("#password").fill(TEST_ADMIN_PASSWORD);
  await page.getByRole("button", { name: /^Sign in$/ }).click();
  await page.waitForURL((u: URL) => !u.pathname.startsWith("/login"), { timeout: 30000 });

  // ---------------------------------------------------------------- import
  console.log("import 3 rows with the invite checkbox ON");
  const csv = ["Full name,Email,Phone,City", `Neha New,${newEmail},+9198${d8},Pune`, `Dup Again,${dupEmail},+9196${d8},Pune`, `Nomail Person,,${noEmailPhone},Pune`].join("\n");
  await page.goto(`${base}/import`);
  await page.locator('input[type="file"]').setInputFiles({ name: "import-test.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  const box = page.getByTestId("invite-checkbox");
  await box.waitFor({ timeout: 20000 });
  check("invite checkbox is ON by default", await box.isChecked());
  await page.getByRole("button", { name: /^Import \d+ candidates$/ }).click();
  const report = page.getByTestId("import-invites");
  await report.waitFor({ timeout: 60000 });
  const reportText = (await report.textContent()) ?? "";
  check("import report says exactly 1 invite queued", /\b1 portal invite queued\b/.test(reportText), reportText);

  const { data: created } = await admin.from("candidates").select("id, email, user_id, invited_at, invite_count").or(`email.ilike.${newEmail},phone.eq.${noEmailPhone}`);
  const fresh = (created ?? []).find((r: { email: string | null }) => r.email === newEmail);
  const noMail = (created ?? []).find((r: { email: string | null }) => !r.email);
  check("new candidate created and invited", !!fresh?.invited_at && fresh?.invite_count === 1 && !!fresh?.user_id, JSON.stringify(fresh));
  check("candidate without email: created, not invited", !!noMail && !noMail.invited_at, JSON.stringify(noMail));
  const { data: dupRow } = await admin.from("candidates").select("invited_at, user_id").eq("id", dup.data.id).single();
  check("duplicate row: existing candidate untouched, not invited", !dupRow?.invited_at && !dupRow?.user_id, JSON.stringify(dupRow));
  const { count: dupCount } = await admin.from("candidates").select("id", { count: "exact", head: true }).ilike("email", dupEmail);
  check("no duplicate candidate created", dupCount === 1, `${dupCount}`);
  const ids = [fresh?.id, noMail?.id, dup.data.id].filter(Boolean);
  const { data: mails } = await admin.from("emails").select("template, candidate_id").eq("template", "candidate_portal_invite").in("candidate_id", ids);
  check("exactly 1 invite email in the queue", (mails ?? []).length === 1 && mails?.[0].candidate_id === fresh?.id, JSON.stringify(mails));

  // ---------------------------------------------------------------- the invite link
  console.log("invite link → set password → portal");
  const { data: gen } = await admin.auth.admin.generateLink({ type: "invite", email: newEmail });
  const cand = await (await browser.newContext()).newPage();
  await cand.goto(`${base}/auth/callback?token_hash=${gen.properties.hashed_token}&type=invite&next=${encodeURIComponent("/auth/set-password")}`);
  await cand.getByTestId("set-password-form").waitFor({ timeout: 20000 });
  const pw = cand.locator('input[type="password"]');
  await pw.nth(0).fill("Import-Test-123");
  await pw.nth(1).fill("Import-Test-123");
  await cand.getByTestId("invite-consent").check();
  await cand.getByRole("button", { name: /Set password/ }).click();
  await cand.waitForURL(/\/portal/, { timeout: 30000 });
  await cand.getByTestId("invite-welcome").waitFor({ timeout: 20000 });
  check("candidate lands on the portal with their existing profile", (await cand.content()).includes("Neha"));

  // ---------------------------------------------------------------- staff view: active → no invite button
  await page.goto(`${base}/candidates/${fresh!.id}`);
  const access = page.getByTestId("portal-access");
  await access.waitFor({ timeout: 20000 });
  check("profile shows Active", /Active/.test((await access.textContent()) ?? ""));
  check("Active candidate has no invite button", (await page.getByTestId("send-portal-invite").count()) === 0);
  await page.goto(`${base}/candidates/${noMail!.id}`);
  await page.getByTestId("portal-access").waitFor({ timeout: 20000 });
  check("no-email candidate: invite button disabled ('Add an email first')", (await page.getByTestId("send-portal-invite").isDisabled()) && (await page.content()).includes("Add an email first"));
} catch (e) {
  check("run", false, e instanceof Error ? e.message : String(e));
} finally {
  await browser.close();
  const { data: rows } = await admin.from("candidates").select("id, user_id").or(`email.ilike.${newEmail},email.ilike.${dupEmail},phone.eq.${noEmailPhone}`);
  for (const r of rows ?? []) {
    await admin.from("activity_logs").delete().eq("candidate_id", r.id);
    await admin.from("emails").delete().eq("candidate_id", r.id);
    await admin.from("candidates").delete().eq("id", r.id);
  }
  for (const e of tracked) {
    const { data: p } = await admin.from("profiles").select("id").ilike("email", e);
    for (const x of p ?? []) await admin.auth.admin.deleteUser(x.id);
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
