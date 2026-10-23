// npm run test:unit — email analytics: funnel, best/worst, heatmap, links, providers, cold recipients, spikes, unsubscribe
import { test } from "node:test";
import assert from "node:assert/strict";
import { bestWindow, bestWorst, cleanUrl, domainGroup, domains, endOfIstDay, heatmap, istSlot, linkClicks, neverOpened, spike, templateStats, trend, type AEmail, type Audience } from "../src/lib/email/analytics";
import { addTracking, addUnsubscribe, unsubscribeUrl, verifyUnsubscribe } from "../src/lib/email/tracking";

process.env.EMAIL_LINK_SECRET ??= "test-secret-for-unit-tests";
const aud = (t: string): Audience => (t.startsWith("cand") ? "candidate" : t.startsWith("client") ? "client" : "synerax");
let n = 0;
const em = (o: Partial<AEmail> = {}): AEmail => ({ id: `e${++n}`, template: "cand_a", to_email: `p${n}@gmail.com`, status: "sent", queued_at: "2026-10-13T04:00:00Z", sent_at: "2026-10-13T04:00:00Z", opened_at: null, clicked_at: null, bounced_at: null, ...o });

test("istSlot: Monday 04:30 UTC = Monday 10:00 IST; Sunday 20:00 UTC = Monday 01:30 IST", () => {
  assert.deepEqual(istSlot("2026-10-12T04:30:00Z"), { day: 0, hour: 10 });
  assert.deepEqual(istSlot("2026-10-11T20:00:00Z"), { day: 0, hour: 1 });
});

test("templateStats: funnel counts, rates, skipped ignored, actions only for candidate/client", () => {
  const list = [
    em({ opened_at: "x", clicked_at: "x" }),
    em({ opened_at: "x" }),
    em(),
    em({ status: "bounced", bounced_at: "x" }),
    em({ status: "skipped", sent_at: null }),
    em({ template: "staff_x" }),
  ];
  const rows = templateStats(list, aud, new Set([list[0].id]));
  const c = rows.find((r) => r.template === "cand_a")!;
  assert.equal(c.total, 4);
  assert.equal(c.sent, 4);
  assert.equal(c.opened, 2);
  assert.equal(c.clicked, 1);
  assert.equal(c.bounced, 1);
  assert.equal(c.actions, 1);
  assert.equal(c.openRate, 50);
  assert.equal(c.ctr, 25);
  assert.equal(c.clickToOpen, 50);
  assert.equal(c.bounceRate, 25);
  assert.equal(c.actionRate, 25);
  const s = rows.find((r) => r.template === "staff_x")!;
  assert.equal(s.actions, null);
  assert.equal(s.actionRate, null);
});

test("bestWorst needs 2 templates with 5+ sends; trend needs 3+ sends both periods", () => {
  const good = Array.from({ length: 6 }, () => em({ template: "cand_good", opened_at: "x", clicked_at: "x" }));
  const bad = Array.from({ length: 6 }, () => em({ template: "cand_bad" }));
  const tiny = [em({ template: "cand_tiny", opened_at: "x", clicked_at: "x" })];
  const rows = templateStats([...good, ...bad, ...tiny], aud, new Set());
  assert.deepEqual(bestWorst(rows), { best: "cand_good", worst: "cand_bad" });
  assert.deepEqual(bestWorst(rows.filter((r) => r.template !== "cand_bad")), { best: null, worst: null });
  const prev = templateStats(Array.from({ length: 4 }, (_, i) => em({ template: "cand_good", opened_at: i < 2 ? "x" : null })), aud, new Set());
  assert.equal(trend(rows.find((r) => r.template === "cand_good")!, prev[0]), 50);
  assert.equal(trend(rows.find((r) => r.template === "cand_tiny")!, prev[0]), null);
  assert.equal(trend(rows[0], undefined), null);
});

test("heatmap uses events, falls back to first open for emails without events; bestWindow", () => {
  const a = em({ opened_at: "2026-10-13T04:30:00Z" }); // Tue 10:00 IST
  const b = em({ opened_at: "2026-10-13T04:30:00Z" });
  const events = Array.from({ length: 12 }, () => ({ email_id: a.id, kind: "open" as const, at: "2026-10-14T05:30:00Z" })); // Wed 11:00
  const h = heatmap([a, b], events);
  assert.equal(h.opens[2][11], 12);
  assert.equal(h.opens[1][10], 1); // b's fallback; a's first-open is not double counted
  assert.equal(h.sends[1][9], 2); // sent 04:00Z = 09:30 IST Tue
  const w = bestWindow(h)!;
  assert.match(w.label, /^Wed.* · (10|11):00–(12|13):00 IST$/);
  assert.equal(bestWindow(heatmap([b], [])), null); // too little data
});

test("linkClicks groups by template + cleaned link, counts unique recipients", () => {
  const a = em({ template: "cand_a" });
  const b = em({ template: "cand_a" });
  const ev = (id: string, url: string) => ({ email_id: id, kind: "click" as const, at: "2026-10-13T05:00:00Z", url });
  const rows = linkClicks([a, b], [ev(a.id, "https://x.in/jobs?utm_source=e"), ev(a.id, "https://x.in/jobs"), ev(b.id, "https://x.in/jobs?utm_medium=m"), ev(b.id, "https://x.in/profile"), { email_id: "unknown", kind: "click", at: "x", url: "https://x.in/jobs" }]);
  assert.deepEqual(rows[0], { template: "cand_a", url: "x.in/jobs", clicks: 3, unique: 2 });
  assert.equal(rows.length, 2);
  assert.equal(cleanUrl("https://x.in/c/123e4567-e89b-12d3-a456-426614174000?token=abc"), "x.in/c/:id");
});

test("domains: provider grouping with delivery and open rates", () => {
  assert.equal(domainGroup("a@GMail.com"), "Gmail");
  assert.equal(domainGroup("a@outlook.in"), "Outlook / Hotmail");
  assert.equal(domainGroup("a@yahoo.co.in"), "Yahoo");
  assert.equal(domainGroup("a@synerax.in"), "Corporate / other");
  const rows = domains([em({ opened_at: "x" }), em({ status: "bounced" }), em({ to_email: "x@acme.com" }), em({ to_email: "y@corp.io" }), em({ status: "skipped" })]);
  const g = rows.find((r) => r.group === "Gmail")!;
  assert.equal(g.total, 2);
  assert.equal(g.deliveryRate, 50);
  assert.equal(g.openRate, 50);
  assert.equal(rows.find((r) => r.group === "Corporate / other")!.domains, 2);
});

test("neverOpened: last 5 sent emails all unopened", () => {
  const day = (d: number) => `2026-10-${String(d).padStart(2, "0")}T05:00:00Z`;
  const cold = [1, 2, 3, 4, 5].map((d) => em({ to_email: "Cold@x.com", sent_at: day(d) }));
  const warm = [1, 2, 3, 4, 5, 6].map((d) => em({ to_email: "warm@x.com", sent_at: day(d), opened_at: d === 1 ? "x" : null })); // opened only the 6th-latest → cold too
  const recent = [1, 2, 3, 4, 5].map((d) => em({ to_email: "ok@x.com", sent_at: day(d), opened_at: d === 5 ? "x" : null }));
  const few = [1, 2].map((d) => em({ to_email: "new@x.com", sent_at: day(d) }));
  const out = neverOpened([...cold, ...warm, ...recent, ...few]).map((r) => r.email).sort();
  assert.deepEqual(out, ["cold@x.com", "warm@x.com"]);
});

test("spike: 3× the 7-day average with minimum volume", () => {
  assert.equal(spike({ total: 4, bad: 4 }, { total: 1000, bad: 10 }), null); // too few
  assert.equal(spike({ total: 20, bad: 0 }, { total: 1000, bad: 10 }), null);
  assert.equal(spike({ total: 20, bad: 1 }, { total: 1000, bad: 20 }), null); // 5% vs 2% = 2.5×
  assert.deepEqual(spike({ total: 20, bad: 2 }, { total: 1000, bad: 20 }), { rate: 10, avg: 2, factor: 5 });
  assert.equal(spike({ total: 20, bad: 4 }, { total: 0, bad: 0 })?.factor, null); // no history, 20% → alert
  assert.equal(spike({ total: 20, bad: 3 }, { total: 0, bad: 0 }), null);
});

test("endOfIstDay is 23:59:59 IST of the current IST day", () => {
  assert.equal(endOfIstDay(Date.parse("2026-10-13T20:00:00Z")).toISOString(), "2026-10-14T18:29:59.999Z");
  assert.equal(endOfIstDay(Date.parse("2026-10-13T10:00:00Z")).toISOString(), "2026-10-13T18:29:59.999Z");
});

test("unsubscribe links are signed, footer link is not click-tracked", () => {
  const url = unsubscribeUrl("https://app.example.com", "Person@Example.com");
  const u = new URL(url);
  assert.equal(u.pathname, "/e/unsubscribe");
  assert.ok(verifyUnsubscribe(u.searchParams.get("e")!, u.searchParams.get("s")!));
  assert.ok(!verifyUnsubscribe("other@example.com", u.searchParams.get("s")!));
  const html = addTracking(addUnsubscribe("<html><body><a href=\"https://x.in/jobs\">Jobs</a></body></html>", url), "tok", "https://app.example.com");
  assert.ok(html.includes(url.replace(/&/g, "&amp;")) || html.includes(url));
  assert.ok(!/\/api\/e\/c\/tok\?u=[^"]*unsubscribe/.test(html));
});
