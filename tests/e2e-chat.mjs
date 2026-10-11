// E2E: live chat + chatbot in two browser contexts.
// Prereqs: 005_chat.sql applied, `npm run seed:portals`, `node scripts/seed-chat.mjs`, the app running.
// usage: node tests/e2e-chat.mjs [baseUrl]      screenshots → tests/screenshots/chat (or $SHOTS)
import fs from "fs";
import path from "path";
import { chromium } from "playwright-core";
import { CHAT_DEMO, clearDemoChats, db, ids, relockStaff, signInAs } from "../scripts/seed-chat.mjs";
import { DEMO } from "../scripts/seed-portals.mjs";

const BASE = process.argv[2] ?? "http://localhost:3100";
const OUT = process.env.SHOTS ?? "tests/screenshots/chat";
fs.mkdirSync(OUT, { recursive: true });
const driveConfigured = (() => {
  const env = fs.readFileSync(".env.local", "utf8");
  return /^GOOGLE_DRIVE_ROOT_FOLDER_ID=\S+/m.test(env) && /^GOOGLE_REFRESH_TOKEN=\S+/m.test(env);
})();

let pass = 0;
let fail = 0;
const check = (name, ok, extra = "") => {
  if (ok) pass++;
  else fail++;
  console.log(`  ${ok ? "✓" : "✗"} ${name}${!ok && extra ? `  → ${extra}` : ""}`);
};
const shot = (page, name) => page.screenshot({ path: path.join(OUT, name) });
const visible = async (locator, timeout = 15000) => locator.waitFor({ state: "visible", timeout }).then(() => true, () => false);

async function login(browser, email, password, viewport = { width: 1440, height: 900 }) {
  const ctx = await browser.newContext({ viewport, colorScheme: "light" });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 });
  return { ctx, page };
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
const createdJobs = [];
try {
  const { candidateId } = await ids();
  await clearDemoChats();
  await db.from("chat_settings").update({ hr_can_chat_candidates: false }).eq("id", 1);
  const adminPw = (await signInAs(CHAT_DEMO.admin.email)).password;

  // ---------------------------------------------------------------- admin ↔ candidate
  console.log("\nAdmin ↔ candidate (live)");
  const A = await login(browser, CHAT_DEMO.admin.email, adminPw);
  const C = await login(browser, CHAT_DEMO.candidate.email, DEMO.password);

  await A.page.goto(`${BASE}/candidates/${candidateId}`, { waitUntil: "networkidle" });
  await A.page.getByTestId("message-candidate").first().click();
  await A.page.waitForURL(/\/messages\?c=/, { timeout: 20000 });
  await A.page.locator("#chat-composer").fill("Hi Aarav, this is Synerax. Are you open to a Senior React role in Bengaluru?");
  await A.page.keyboard.press("Enter");
  check("admin: message sent from the inbox", await visible(A.page.getByText("Are you open to a Senior React role")));

  await C.page.goto(`${BASE}/portal`, { waitUntil: "networkidle" });
  check("candidate: unread badge in the header", await visible(C.page.getByTestId("messages-badge").first()));
  await shot(C.page, "01-candidate-unread-badge.png");
  await C.page.goto(`${BASE}/portal/messages`, { waitUntil: "networkidle" });
  check("candidate: sees the recruiter's message", await visible(C.page.getByText("Are you open to a Senior React role")));
  check("candidate: has no 'new chat' button", (await C.page.getByRole("button", { name: /new (chat|message|conversation)/i }).count()) === 0);
  check("admin: sees 'Seen' after the candidate opened it", await visible(A.page.getByTestId("seen").last(), 20000));

  await C.page.locator("#chat-composer").pressSequentially("Yes, I'm interested", { delay: 60 });
  check("admin: typing indicator shows live", await visible(A.page.getByTestId("typing"), 10000));
  await shot(A.page, "02-admin-typing-indicator.png");
  await C.page.keyboard.press("Enter");
  check("admin: reply arrives live (no reload)", await visible(A.page.getByText("Yes, I'm interested")));
  await C.page.locator("#chat-composer").fill("Line one\nLine two");
  await C.page.keyboard.press("Enter");
  check("candidate: Shift+Enter / Enter behaviour (multi-line message)", await visible(A.page.getByText("Line two")));
  await shot(A.page, "03-admin-inbox-thread.png");
  await shot(C.page, "04-candidate-thread.png");

  // attachments
  if (driveConfigured) {
    await A.page.getByTestId("chat-file").setInputFiles("tests/fixtures/aarav-sharma-single.pdf");
    await A.page.getByRole("button", { name: "Send message" }).click();
    check("candidate: attachment arrives live", await visible(C.page.getByText("aarav-sharma-single.pdf"), 30000));
    const href = await C.page.getByRole("link", { name: /aarav-sharma-single\.pdf/ }).getAttribute("href");
    const res = await C.page.request.get(`${BASE}${href}`);
    check("candidate: can download the attachment", res.ok(), String(res.status()));
    const resAnon = await fetch(`${BASE}${href}`, { redirect: "manual" });
    check("anonymous: attachment link refused", resAnon.status === 401, String(resAnon.status));
    const K0 = await login(browser, CHAT_DEMO.client.email, DEMO.password);
    const resClient = await K0.page.request.get(`${BASE}${href}`);
    check("client: candidate-chat attachment refused", resClient.status() === 404, String(resClient.status()));
    await K0.ctx.close();
    await shot(C.page, "05-candidate-attachment.png");
  } else {
    console.log("  – attachments skipped: Google Drive isn't configured in .env.local");
  }

  // ---------------------------------------------------------------- admin ↔ client
  console.log("\nAdmin ↔ client (live)");
  const K = await login(browser, CHAT_DEMO.client.email, DEMO.password);
  await K.page.goto(`${BASE}/client/messages`, { waitUntil: "networkidle" });
  await K.page.locator("#chat-composer").fill("Hi Synerax — can we get two more React profiles this week?");
  await K.page.keyboard.press("Enter");
  check("client: first message creates the company thread", await visible(K.page.getByText("two more React profiles")));
  await A.page.goto(`${BASE}/messages`, { waitUntil: "networkidle" });
  await A.page.getByRole("tab", { name: "Clients" }).click();
  const row = A.page.getByTestId("conversation").filter({ hasText: CHAT_DEMO.clientName });
  check("admin: client thread appears under Clients with unread", await visible(row));
  await shot(A.page, "06-admin-inbox-clients-tab.png");
  await row.click();
  await A.page.locator("#chat-composer").fill("Sure — sharing two more by Thursday.");
  await A.page.keyboard.press("Enter");
  check("client: Synerax reply arrives live", await visible(K.page.getByText("sharing two more by Thursday")));
  await shot(K.page, "07-client-thread.png");
  const ctxPanel = await visible(A.page.getByText("Open jobs").first(), 8000);
  check("admin: context panel shows the client's open jobs", ctxPanel);

  // client can't see candidates — direct Supabase queries with the client's JWT
  const cliJwt = await signInAs(CHAT_DEMO.client.email);
  const leak = await cliJwt.c.from("conversations").select("id").eq("type", "candidate");
  check("client JWT: zero candidate conversations", !leak.error && leak.data.length === 0, JSON.stringify(leak.data ?? leak.error));
  const leak2 = await cliJwt.c.from("messages").select("body").ilike("body", "%Senior React role%");
  check("client JWT: candidate messages invisible", !leak2.error && leak2.data.length === 0, JSON.stringify(leak2.data ?? leak2.error));

  // ---------------------------------------------------------------- candidate without a thread
  console.log("\nCandidate without a thread");
  const C2 = await login(browser, CHAT_DEMO.candidate2.email, DEMO.password);
  await C2.page.goto(`${BASE}/portal/messages`, { waitUntil: "networkidle" });
  check("candidate 2: empty state, no composer (can't start a chat)", (await C2.page.locator("#chat-composer").count()) === 0 && (await visible(C2.page.getByText("No messages yet"))));
  await shot(C2.page, "08-candidate-no-thread.png");

  // ---------------------------------------------------------------- chatbot
  console.log("\nChatbot");
  await C.page.goto(`${BASE}/portal`, { waitUntil: "networkidle" });
  await C.page.getByTestId("chat-launcher").click();
  const bot = C.page.getByTestId("chatbot");
  await bot.getByRole("button", { name: /Recommended jobs/ }).first().click();
  const applyBtn = bot.getByRole("button", { name: "Apply" }).first();
  if (await visible(applyBtn, 15000)) {
    await applyBtn.click();
    check("bot (candidate): asks for confirmation before applying", await visible(bot.getByRole("button", { name: "Yes, apply" })));
    await shot(C.page, "09-bot-apply-confirm.png");
    await bot.getByRole("button", { name: "Yes, apply" }).click();
    check("bot (candidate): applied via candidate_apply", await visible(bot.getByText(/^Applied to/)));
  } else check("bot (candidate): recommended jobs listed", false, "no job cards");
  await bot.locator("#bot-input").fill("do i have to pay any fee?");
  await bot.locator("#bot-input").press("Enter");
  check("bot (candidate): answers an FAQ (fuzzy)", await visible(bot.getByText(/never charges candidates/)));
  await shot(C.page, "10-bot-faq.png");

  await K.page.goto(`${BASE}/client`, { waitUntil: "networkidle" });
  await K.page.getByTestId("chat-launcher").click();
  const kbot = K.page.getByTestId("chatbot");
  await kbot.getByRole("button", { name: /Post a new job/ }).first().click();
  await kbot.getByLabel(/Job title/).fill("QA Engineer (chatbot test)");
  await kbot.getByLabel(/Location/).fill("Pune");
  await kbot.getByLabel(/Key skills/).fill("Selenium, Java");
  await kbot.getByRole("button", { name: "Review" }).click();
  check("bot (client): shows a summary and asks to confirm", await visible(kbot.getByRole("button", { name: "Yes, post it" })));
  await shot(K.page, "11-bot-post-job-confirm.png");
  await kbot.getByRole("button", { name: "Yes, post it" }).click();
  check("bot (client): job saved as Pending review", await visible(kbot.getByText(/Pending review/)));
  const { data: job } = await db.from("jobs").select("id, status, posted_by_client").eq("title", "QA Engineer (chatbot test)").maybeSingle();
  if (job) createdJobs.push(job.id);
  check("DB: job row is 'Pending review' and client-posted", job?.status === "Pending review" && job?.posted_by_client === true, JSON.stringify(job));
  await kbot.getByRole("button", { name: /Talk to Synerax/ }).first().click();
  await K.page.waitForURL(/\/client\/messages/, { timeout: 20000 });
  check("bot (client): 'Talk to Synerax' hands over to the thread", await visible(K.page.getByText(/Asked to talk to the Synerax team/)));
  await shot(K.page, "12-client-handoff.png");

  const V = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const vp = await V.newPage();
  await vp.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await vp.getByTestId("chat-launcher").click();
  await vp.getByTestId("chatbot").locator("#bot-input").fill("how fast will i get profiles");
  await vp.getByTestId("chatbot").locator("#bot-input").press("Enter");
  check("bot (visitor): answers on the public website", await visible(vp.getByText(/72 hours/)));
  await shot(vp, "13-visitor-bot.png");

  // mobile list → thread
  const M = await login(browser, CHAT_DEMO.admin.email, (await signInAs(CHAT_DEMO.admin.email)).password, { width: 390, height: 844 });
  await M.page.goto(`${BASE}/messages`, { waitUntil: "networkidle" });
  await shot(M.page, "14-mobile-list.png");
  await M.page.getByTestId("conversation").first().click();
  check("mobile: list → thread navigation", await visible(M.page.getByRole("button", { name: "Back to conversations" })));
  await shot(M.page, "15-mobile-thread.png");
} catch (e) {
  fail++;
  console.error("E2E FAILED:", e.message);
} finally {
  await browser.close();
  for (const id of createdJobs) await db.from("jobs").delete().eq("id", id);
  if (!process.env.KEEP) await clearDemoChats().catch(() => {});
  await relockStaff().catch(() => {});
  console.log(`\n${fail ? "✗" : "✓"} ${pass} passed, ${fail} failed — screenshots in ${OUT}\n`);
  process.exit(fail ? 1 : 0);
}
