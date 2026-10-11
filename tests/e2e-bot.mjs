// E2E: the assistant as visitor, candidate, client, HR and admin — desktop + mobile, 3 typed questions each
// + one confirmed action per role. Screenshots → tests/screenshots/bot (or $SHOTS).
// Prereqs: 005 + 006 applied, `npm run seed:portals`, `npm run seed:chat`, app running (default :3100).
// Admin needs TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD in .env.local (the test never changes that password).
import fs from "fs";
import path from "path";
import { chromium } from "playwright-core";
import { CHAT_DEMO, db, relockStaff, signInAs } from "../scripts/seed-chat.mjs";
import { DEMO } from "../scripts/seed-portals.mjs";

const BASE = process.argv[2] ?? "http://localhost:3100";
const OUT = process.env.SHOTS ?? "tests/screenshots/bot";
fs.mkdirSync(OUT, { recursive: true });
const has006 = (await db.from("bot_actions").select("id").limit(1)).error == null;

let pass = 0;
let fail = 0;
let skipped = 0;
const check = (name, ok, extra = "") => {
  if (ok) pass++;
  else fail++;
  console.log(`  ${ok ? "✓" : "✗"} ${name}${!ok && extra ? `  → ${String(extra).slice(0, 200)}` : ""}`);
};
const skip = (name, why) => {
  skipped++;
  console.log(`  – ${name} (skipped: ${why})`);
};

async function login(browser, email, password, viewport) {
  const ctx = await browser.newContext({ viewport, colorScheme: "light" });
  const page = await ctx.newPage();
  if (email) {
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await page.getByLabel("Email").fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 });
  }
  return { ctx, page };
}

/** type a question and wait for a NEW bot answer; returns its text */
async function ask(bot, q) {
  const before = await bot.locator("p").count();
  await bot.locator("#bot-input").fill(q);
  await bot.locator("#bot-input").press("Enter");
  await bot.locator("p").nth(before + 1).waitFor({ timeout: 30000 }).catch(() => {});
  await bot.page().waitForTimeout(400);
  await bot.locator('[aria-label="Assistant is typing"]').waitFor({ state: "detached", timeout: 30000 }).catch(() => {});
  return (await bot.innerText()).split(q).pop() ?? "";
}
const understood = (answer) => answer.trim().length > 0 && !/didn't catch|not sure I understood|went wrong|can't reach/i.test(answer);

const ROLES = [
  { key: "visitor", home: "/", place: "site", questions: ["React jobs in Pune?", "do I have to pay to get a job?", "how fast will I get profiles"] },
  { key: "candidate", home: "/portal", email: CHAT_DEMO.candidate.email, password: DEMO.password, questions: ["how many of my applications are in interview?", "jobs for me", "what is missing in my profile"] },
  { key: "client", home: "/client", email: CHAT_DEMO.client.email, password: DEMO.password, questions: ["what's pending for me today?", "show my jobs", "upcoming interviews"] },
  { key: "hr", home: "/dashboard", staff: CHAT_DEMO.hr.email, questions: ["what's pending for me today?", "find react developers in pune", "today's interviews"] },
  { key: "admin", home: "/dashboard", email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD, questions: ["team overview", "activity this week", "did any emails fail"] },
];

const browser = await chromium.launch({ channel: "chrome", headless: true });
const cleanup = [];
try {
  for (const role of ROLES) {
    console.log(`\n${role.key.toUpperCase()}`);
    if (role.key === "admin" && !role.email) {
      skip("admin", "set TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD in .env.local");
      continue;
    }
    for (const [vp, tag] of [[{ width: 1440, height: 900 }, "desktop"], [{ width: 390, height: 844 }, "mobile"]]) {
      let email = role.email;
      let password = role.password;
      if (role.staff) ({ password } = await signInAs(role.staff)), (email = role.staff);
      const { ctx, page } = await login(browser, email, password, vp);
      await page.goto(`${BASE}${role.home}`, { waitUntil: "networkidle" });
      await page.getByTestId("chat-launcher").click();
      const bot = page.getByTestId("chatbot");
      // the welcome comes from the server, which decides the mode from the session
      await page.waitForFunction(() => document.querySelector('[data-testid="chatbot"]')?.getAttribute("data-mode"), null, { timeout: 30000 });
      await page.waitForTimeout(300);
      check(`${tag}: assistant opens in ${role.key} mode (from the session)`, (await bot.getAttribute("data-mode")) === role.key, await bot.getAttribute("data-mode"));
      const qs = tag === "desktop" ? role.questions : role.questions.slice(0, 3);
      for (const q of qs) {
        const a = await ask(bot, q);
        check(`${tag}: "${q}" answered`, understood(a), a.slice(0, 160));
      }
      await page.screenshot({ path: path.join(OUT, `${role.key}-${tag}.png`) });

      // one confirmed action (desktop only)
      if (tag === "desktop") {
        if (!has006) skip(`${role.key}: confirmed action`, "run 006_bot.sql");
        else if (role.key === "visitor") {
          await ask(bot, "we need 3 java developers in pune");
          const form = bot.getByTestId("bot-form").last();
          await form.getByLabel(/Your name/).fill("E2E Bot Lead");
          await form.getByLabel(/Company/).fill("E2E Test Co");
          await form.getByLabel(/Phone/).fill("9000000099");
          await form.getByLabel(/Work email/).fill("e2e.bot.lead@example.com");
          const req = form.getByLabel(/Requirement/);
          if (!(await req.inputValue())) await req.fill("3 Java developers in Pune (e2e test)");
          await form.getByRole("button", { name: "Review" }).click();
          await bot.getByTestId("bot-confirm").last().waitFor({ timeout: 20000 });
          await page.screenshot({ path: path.join(OUT, `${role.key}-confirm.png`) });
          await bot.getByTestId("bot-confirm").last().getByRole("button", { name: "Send" }).click();
          check("visitor: lead saved only after Confirm", await bot.getByText(/Thank you/).waitFor({ timeout: 20000 }).then(() => true, () => false));
          cleanup.push(() => db.from("website_leads").delete().eq("email", "e2e.bot.lead@example.com"));
        } else if (role.key === "candidate") {
          const { data: before } = await db.from("candidates").select("id, notice_period_days").ilike("email", CHAT_DEMO.candidate.email).single();
          await ask(bot, "change my notice period to 45 days");
          await bot.getByTestId("bot-confirm").last().waitFor({ timeout: 20000 });
          const mid = (await db.from("candidates").select("notice_period_days").eq("id", before.id).single()).data.notice_period_days;
          check("candidate: nothing changes before Confirm", mid === before.notice_period_days, String(mid));
          await page.screenshot({ path: path.join(OUT, `${role.key}-confirm.png`) });
          await bot.getByTestId("bot-confirm").last().getByRole("button", { name: "Update" }).click();
          await bot.getByText(/Updated/).waitFor({ timeout: 20000 }).catch(() => {});
          const after = (await db.from("candidates").select("notice_period_days").eq("id", before.id).single()).data.notice_period_days;
          check("candidate: notice period updated after Confirm", after === 45, String(after));
          cleanup.push(() => db.from("candidates").update({ notice_period_days: before.notice_period_days }).eq("id", before.id));
        } else if (role.key === "client") {
          await ask(bot, "post a new job for a QA Engineer Bot E2E with 3-5 years in Pune");
          let card = bot.getByTestId("bot-confirm").last();
          if (!(await card.isVisible().catch(() => false))) {
            const form = bot.getByTestId("bot-form").last();
            await form.getByLabel(/Job title/).fill("QA Engineer Bot E2E");
            await form.getByRole("button", { name: "Review" }).click();
            card = bot.getByTestId("bot-confirm").last();
          }
          await card.waitFor({ timeout: 20000 });
          await page.screenshot({ path: path.join(OUT, `${role.key}-confirm.png`) });
          await card.getByRole("button", { name: "Post job" }).click();
          check("client: job posted (Pending review) after Confirm", await bot.getByText(/Pending review/).last().waitFor({ timeout: 20000 }).then(() => true, () => false));
          cleanup.push(() => db.from("jobs").delete().ilike("title", "%Bot E2E%"));
        } else {
          await ask(bot, "remind me to check the bot e2e references tomorrow");
          await bot.getByTestId("bot-confirm").last().waitFor({ timeout: 20000 });
          await page.screenshot({ path: path.join(OUT, `${role.key}-confirm.png`) });
          await bot.getByTestId("bot-confirm").last().getByRole("button", { name: "Create task" }).click();
          check(`${role.key}: task created after Confirm`, await bot.getByText(/Task created/).waitFor({ timeout: 20000 }).then(() => true, () => false));
          cleanup.push(() => db.from("tasks").delete().ilike("title", "%bot e2e%"));
        }
      }
      await ctx.close();
    }
  }

  // staff Messages page: launcher hidden
  const { password } = await signInAs(CHAT_DEMO.hr.email);
  const { ctx, page } = await login(browser, CHAT_DEMO.hr.email, password, { width: 1440, height: 900 });
  await page.goto(`${BASE}/messages`, { waitUntil: "networkidle" });
  check("staff: assistant hidden on the Messages page", (await page.getByTestId("chat-launcher").count()) === 0);
  await ctx.close();
} catch (e) {
  fail++;
  console.error("E2E FAILED:", e.message);
} finally {
  await browser.close();
  for (const c of cleanup) await c().catch(() => {});
  await relockStaff().catch(() => {});
  console.log(`\n${fail ? "✗" : "✓"} ${pass} passed, ${fail} failed, ${skipped} skipped — screenshots in ${OUT}\n`);
  process.exit(fail ? 1 : 0);
}
