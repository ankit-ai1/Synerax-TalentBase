// E2E: register by uploading a sample CV → prefill + badges → submit → confirm → candidate row (+ resume_text)
// usage: node tests/e2e-register-cv.mjs [baseUrl]   (needs the app running and .env.local with the service role key)
import fs from "fs";
import path from "path";
import { chromium } from "playwright-core";

const BASE = process.argv[2] ?? "http://localhost:3100";
const OUT = process.env.SHOTS ?? "tests/screenshots";
fs.mkdirSync(OUT, { recursive: true });
const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")])
);
const SB = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const rest = (p, init = {}) => fetch(`${SB}${p}`, { ...init, headers: { ...H, ...(init.headers ?? {}) } });

const stamp = Date.now().toString().slice(-6);
const EMAIL = `synerax.e2e.${stamp}@example.com`; // never the (realistic) address printed in the sample CV
const PHONE = `98${stamp}10`.slice(0, 10);
const PASSWORD = `E2e-test-${stamp}!`;
const shot = (page, name) => page.screenshot({ path: path.join(OUT, name), fullPage: false });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
let userId = null;
try {
  await page.goto(`${BASE}/register`, { waitUntil: "networkidle" });
  await shot(page, "01-register-cv-step.png");

  await page.setInputFiles('[data-testid="cv-input"]', "tests/fixtures/aarav-sharma-single.pdf");
  await page.getByText("Reading your CV…").waitFor({ timeout: 5000 }).catch(() => {});
  await page.getByLabel("Full name").waitFor({ timeout: 30000 });
  await page.waitForFunction(() => document.querySelector("input[autocomplete=name]")?.value, null, { timeout: 30000 });
  const pre = {
    full_name: await page.getByLabel("Full name").inputValue(),
    email: await page.getByLabel("Email").inputValue(),
    phone: await page.getByLabel("Mobile number").inputValue(),
    city: await page.getByLabel("Current city").inputValue(),
    badges: await page.getByText("From your CV").count(),
    pleaseCheck: await page.getByText("Please check").count(),
  };
  console.log("account step prefill:", pre);
  await shot(page, "02-register-prefilled-account.png");

  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Mobile number").fill(PHONE);
  await page.locator("input[type=password]").first().fill(PASSWORD);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Current designation").waitFor({ timeout: 15000 });
  const pre2 = {
    exp_years: await page.getByLabel("Years of experience").inputValue(),
    designation: await page.getByLabel("Current designation").inputValue(),
    current_ctc: await page.getByLabel("Current CTC").inputValue(),
    expected_ctc: await page.getByLabel("Expected CTC").inputValue(),
    notice: await page.getByLabel("Notice period").inputValue(),
    skills: await page.locator("[data-chip], .chip, li:has(button[aria-label^='Remove'])").allInnerTexts().catch(() => []),
    badges: await page.getByText("From your CV").count(),
  };
  console.log("profile step prefill:", pre2);
  await shot(page, "03-register-prefilled-profile.png");
  await page.screenshot({ path: path.join(OUT, "03b-register-prefilled-profile-full.png"), fullPage: true });

  await page.locator("input[type=checkbox]").last().check();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByText(/check your (email|inbox)|verify/i).first().waitFor({ timeout: 60000 });
  await shot(page, "04-register-submitted.png");

  // confirm the e-mail via the admin API (stands in for clicking the link)
  const list = await (await rest(`/auth/v1/admin/users?per_page=200`)).json();
  userId = (list.users ?? []).find((u) => u.email === EMAIL)?.id;
  if (!userId) throw new Error("test user not found");
  await rest(`/auth/v1/admin/users/${userId}`, { method: "PUT", body: JSON.stringify({ email_confirm: true }) });

  // first sign-in finalises the registration (creates the candidate)
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(EMAIL);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/portal/, { timeout: 60000 });
  await page.waitForLoadState("networkidle");

  const cand = await (await rest(`/rest/v1/candidates?user_id=eq.${userId}&select=id,first_name,last_name,email,phone,current_city,total_experience,current_designation,current_ctc,expected_ctc,notice_period_days`)).json();
  console.log("candidate row:", cand);
  const rt = await rest(`/rest/v1/candidates?user_id=eq.${userId}&select=resume_text`);
  const rtj = await rt.json();
  console.log("resume_text:", rt.ok ? `${(rtj[0]?.resume_text ?? "").length} chars, starts "${(rtj[0]?.resume_text ?? "").slice(0, 60).replace(/\s+/g, " ")}…"` : `NOT AVAILABLE (${rtj.message})`);

  // portal → My profile → Fill from CV (current CV)
  await page.goto(`${BASE}/portal/profile`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Fill from CV" }).click();
  await page.getByRole("button", { name: "Use my current CV" }).click();
  await page.getByText(/Empty fields we can fill|CV says something different|already matches/).first().waitFor({ timeout: 60000 });
  await shot(page, "05-portal-fill-from-cv.png");
} catch (e) {
  console.error("E2E FAILED:", e.message);
  await shot(page, "zz-failure.png").catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
  if (!userId) userId = ((await (await rest(`/auth/v1/admin/users?per_page=500`)).json()).users ?? []).find((u) => u.email === EMAIL)?.id ?? null;
  if (userId && !process.env.KEEP) {
    const c = await (await rest(`/rest/v1/candidates?user_id=eq.${userId}&select=id`)).json();
    for (const x of c ?? []) await rest(`/rest/v1/candidates?id=eq.${x.id}`, { method: "DELETE" });
    await rest(`/auth/v1/admin/users/${userId}`, { method: "DELETE" });
    console.log("cleaned up test user + candidate row");
  }
}
