/**
 * Dashboard KPI drill-downs: click each card (and its sub-text link) and check that the number on the card
 * equals the number of rows on the page it opens. Read-only — changes nothing.
 * Needs a staff login: TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD in .env.local.
 *   next start -p 3100, then:  npm run test:e2e:kpis [baseUrl]
 */
import fs from "node:fs";
import { createRequire } from "node:module";

for (const l of fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");
const base = process.argv[2] ?? "http://localhost:3100";
const { TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD } = process.env;
if (!TEST_ADMIN_EMAIL || !TEST_ADMIN_PASSWORD) {
  console.log("Set TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD (a staff login) in .env.local to run this test.");
  process.exit(2);
}
let pass = 0, fail = 0;
const check = (name: string, ok: boolean, extra = "") => {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? "✓" : "✗"} ${name}${!ok && extra ? `  → ${extra}` : ""}`);
};
const num = (s: string | null | undefined) => Number(String(s ?? "").replace(/[^\d]/g, "") || 0);

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
try {
  await page.goto(`${base}/login`);
  await page.locator('input[type="email"]').fill(TEST_ADMIN_EMAIL);
  await page.locator("#password").fill(TEST_ADMIN_PASSWORD);
  await page.getByRole("button", { name: /^Sign in$/ }).click();
  await page.waitForURL((u: URL) => !u.pathname.startsWith("/login"), { timeout: 30000 });

  const dash = async () => {
    await page.goto(`${base}/dashboard`);
    await page.locator("[data-kpi]").first().waitFor({ timeout: 20000 });
  };
  const cardValue = async (id: string) => num(await page.locator(`[data-kpi="${id}"] [data-kpi-value]`).textContent());
  const hintValue = async (id: string) => num(await page.locator(`[data-kpi="${id}"] [data-kpi-hint]`).textContent());
  /** rows on the opened page: [data-total] (candidates / pipeline) or [data-rows] (jobs / interviews); an empty state counts as 0 */
  const rowsOnPage = async () => {
    await page.waitForLoadState("networkidle");
    const total = page.locator("[data-total]").first();
    if (await total.count()) return num(await total.getAttribute("data-total"));
    const rows = page.locator("[data-rows]").first();
    return (await rows.count()) ? num(await rows.getAttribute("data-rows")) : 0;
  };
  const viaCard = async (id: string, path: RegExp) => {
    await dash();
    const v = await cardValue(id);
    await page.locator(`[data-kpi="${id}"] > a[aria-label]`).click();
    await page.waitForURL(path, { timeout: 20000 });
    return [v, await rowsOnPage()] as const;
  };
  const viaHint = async (id: string, path: RegExp) => {
    await dash();
    const v = await hintValue(id);
    await page.locator(`[data-kpi="${id}"] [data-kpi-hint]`).click();
    await page.waitForURL(path, { timeout: 20000 });
    return [v, await rowsOnPage()] as const;
  };

  let [v, n] = await viaCard("total", /\/candidates$/);
  check(`Total candidates: card ${v} = list ${n}`, v === n);
  [v, n] = await viaCard("pipeline", /\/pipeline$/);
  check(`Active pipeline: card ${v} = rows ${n}`, v === n);
  [v, n] = await viaHint("open", /\/jobs\?status=Open/);
  check(`Open jobs: card ${v} = rows ${n}`, v === n);
  await dash();
  const badge = num(await page.locator('[data-badge="jobs"]').first().textContent().catch(() => "0"));
  check(`Sidebar Jobs badge ${badge} = open jobs ${v}`, badge === v);
  [v, n] = await viaCard("interviews", /\/interviews\?range=7d/);
  check(`Interviews (7 days): card ${v} = rows ${n}`, v === n);
  [v, n] = await viaHint("interviews", /\/interviews\?range=today/);
  check(`Interviews today: card ${v} = rows ${n}`, v === n);
  [v, n] = await viaCard("placed", /\/candidates\?segment=placed_month/);
  check(`Placed this month: card ${v} = list ${n}`, v === n);
  [v, n] = await viaHint("placed", /\/candidates\?segment=immediate/);
  check(`Immediate joiners: card ${v} = list ${n}`, v === n);
  check("filter chip shown on a segment", (await page.getByTestId("filter-chip").count()) > 0);
  await page.getByTestId("filter-chip").getByRole("link").click();
  await page.waitForURL(/\/candidates$/, { timeout: 20000 });
  check("removing the chip shows all candidates", true);
} catch (e) {
  check("run", false, e instanceof Error ? e.message : String(e));
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
