// npm run test:unit — email queue rules, quota alerts, bounce matching, tracking links, restore-test checks
import { test } from "node:test";
import assert from "node:assert/strict";
import { QUOTA_DEFAULTS, afterFailure, backoffMs, dueQuotaAlerts, failureAlertDue, isQuotaError, quotaStatus, sendCapacity, summarize, type QuotaSettings } from "../src/lib/email/quota-logic";
import { normMessageId, parseBounce } from "../src/lib/email/bounce-parse";
import { addTracking, clickUrl, signLink, verifyLink } from "../src/lib/email/tracking";
// @ts-expect-error — plain .mjs script, no types
import { compare } from "../scripts/backup/verify.mjs";

const NOW = Date.parse("2026-10-14T06:00:00Z");
const HOUR = 3600_000;
const q = (o: Partial<QuotaSettings> = {}): QuotaSettings => ({ ...QUOTA_DEFAULTS, ...o });
const usage = (used: number, o: Partial<{ oldest_in_window: string | null; last_hour: number; queued: number }> = {}) => ({ used, oldest_in_window: null, last_hour: 0, queued: 0, ...o });

// ------------------------------------------------------------ queue retries
test("failed sends retry with exponential backoff, then fail", () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(backoffMs), [60_000, 120_000, 240_000, 480_000, 960_000]);
  assert.equal(backoffMs(20), 6 * HOUR); // capped

  const r1 = afterFailure(1, 5, "Connection timeout", NOW);
  assert.equal(r1.update.status, "queued");
  assert.equal("next_attempt_at" in r1.update && r1.update.next_attempt_at, new Date(NOW + 60_000).toISOString());
  const r3 = afterFailure(3, 5, "Connection timeout", NOW);
  assert.equal("next_attempt_at" in r3.update && r3.update.next_attempt_at, new Date(NOW + 4 * 60_000).toISOString());
  assert.equal(afterFailure(5, 5, "550 5.1.1 user unknown", NOW).update.status, "failed");
});

test("a provider quota error re-queues without using up an attempt", () => {
  const r = afterFailure(5, 5, "454 4.7.0 Too many login attempts, please try again later", NOW);
  assert.equal(r.quota, true);
  assert.equal(r.update.status, "queued"); // even on the last attempt
  assert.equal("attempts" in r.update && r.update.attempts, 4);
  assert.ok(isQuotaError("550-5.4.5 Daily user sending limit exceeded."));
  assert.ok(isQuotaError("421 4.7.0 Try again later, closing connection."));
  assert.ok(!isQuotaError("550 5.1.1 The email account that you tried to reach does not exist."));
});

// ------------------------------------------------------------ quota
test("quota status: used / remaining / % / projection / resume time", () => {
  const st = quotaStatus(q({ daily_limit: 2000 }), usage(1500, { last_hour: 100 }), NOW);
  assert.equal(st.remaining, 500);
  assert.equal(st.pct, 75);
  assert.equal(st.projectedLimitAt?.toISOString(), new Date(NOW + 5 * HOUR).toISOString()); // 500 left at 100/h

  const full = quotaStatus(q({ daily_limit: 2000 }), usage(2000, { oldest_in_window: new Date(NOW - 20 * HOUR).toISOString() }), NOW);
  assert.equal(full.remaining, 0);
  assert.equal(full.resumeAt?.toISOString(), new Date(NOW + 4 * HOUR).toISOString()); // oldest leaves the 24h window
});

test("when the limit is reached nothing is sent (emails stay queued); a provider pause stops sending too", () => {
  assert.equal(sendCapacity(q({ daily_limit: 10 }), usage(7), NOW), 3);
  assert.equal(sendCapacity(q({ daily_limit: 10 }), usage(10), NOW), 0);
  assert.equal(sendCapacity(q({ daily_limit: 10, paused_until: new Date(NOW + HOUR).toISOString() }), usage(0), NOW), 0);
  assert.equal(sendCapacity(q({ daily_limit: 10, paused_until: new Date(NOW - 1).toISOString() }), usage(0), NOW), 10);
});

test("quota alerts fire at 80%, 90% and 100% — each once per rolling window", () => {
  let s = q();
  const a79 = dueQuotaAlerts(s, 79, NOW);
  assert.deepEqual(a79.due, []);
  const a80 = dueQuotaAlerts(s, 80, NOW);
  assert.deepEqual(a80.due, [80]);
  s = q({ alerts_state: a80.state });
  assert.deepEqual(dueQuotaAlerts(s, 85, NOW + HOUR).due, []); // already sent in this window
  const a90 = dueQuotaAlerts(s, 91, NOW + 2 * HOUR);
  assert.deepEqual(a90.due, [90]);
  s = q({ alerts_state: a90.state });
  const a100 = dueQuotaAlerts(s, 100, NOW + 3 * HOUR);
  assert.deepEqual(a100.due, [100]);
  s = q({ alerts_state: a100.state });
  assert.deepEqual(dueQuotaAlerts(s, 100, NOW + 10 * HOUR).due, []);
  // next window: 80 fires again (it was first sent 24h+ ago), the others are still inside their window
  assert.deepEqual(dueQuotaAlerts(s, 100, NOW + 24 * HOUR).due, [80]);
  // a jump straight to 100% sends all three levels at once
  assert.deepEqual(dueQuotaAlerts(q(), 100, NOW).due, [80, 90, 100]);
});

test("repeated send failures alert after 5 in a row (or at once for a quota error), at most hourly", () => {
  assert.equal(failureAlertDue(q({ consecutive_failures: 4 }), NOW), false);
  assert.equal(failureAlertDue(q({ consecutive_failures: 5 }), NOW), true);
  assert.equal(failureAlertDue(q({ consecutive_failures: 1 }), NOW, true), true);
  assert.equal(failureAlertDue(q({ consecutive_failures: 9, alerts_state: { failures: new Date(NOW - 30 * 60_000).toISOString() } }), NOW), false);
  assert.equal(failureAlertDue(q({ consecutive_failures: 9, alerts_state: { failures: new Date(NOW - 61 * 60_000).toISOString() } }), NOW), true);
});

// ------------------------------------------------------------ bounces
const GMAIL_DSN = `Delivered-To: hr@synerax.in
From: Mail Delivery Subsystem <mailer-daemon@googlemail.com>
To: hr@synerax.in
Subject: Delivery Status Notification (Failure)
Message-ID: <bounce-123@mx.google.com>
Content-Type: multipart/report; report-type=delivery-status; boundary="b1"

--b1
Content-Type: text/plain; charset="UTF-8"

** Address not found **

Your message wasn't delivered to nobody.here@example.com because the address couldn't be found.

--b1
Content-Type: message/delivery-status

Reporting-MTA: dns; googlemail.com
Final-Recipient: rfc822; nobody.here@example.com
Action: failed
Status: 5.1.1
Diagnostic-Code: smtp; 550-5.1.1 The email account that you tried to reach does
 not exist. Please try double-checking the recipient's email address.

--b1
Content-Type: message/rfc822

From: "Synerax TalentBase" <hr@synerax.in>
To: nobody.here@example.com
Subject: Interview scheduled
Message-ID: <a1b2c3@synerax.in>

--b1--
`;

const OUTLOOK_NDR = `From: postmaster@outlook.com
To: hr@synerax.in
Subject: Undeliverable: Your profile was shared
X-Failed-Recipients: Someone@Contoso.com

Delivery has failed to these recipients or groups:

Someone@Contoso.com
The email address you entered couldn't be found.
`;

const DELAY = `From: Mail Delivery Subsystem <mailer-daemon@googlemail.com>
Subject: Delivery Status Notification (Delay)

Action: delayed
Status: 4.4.1
`;

test("bounces are parsed: recipient, original Message-ID, reason", () => {
  const b = parseBounce(GMAIL_DSN)!;
  assert.equal(b.recipient, "nobody.here@example.com");
  assert.equal(normMessageId(b.messageId), "a1b2c3@synerax.in"); // the ORIGINAL email's id, not the bounce's own
  assert.match(b.reason, /550-5\.1\.1 The email account that you tried to reach does not exist/);
  assert.equal(b.permanent, true);

  const o = parseBounce(OUTLOOK_NDR)!;
  assert.equal(o.recipient, "someone@contoso.com");
  assert.match(o.reason, /couldn't be found/);

  assert.equal(parseBounce(DELAY), null); // just delayed — not a bounce
  assert.equal(parseBounce("From: friend@example.com\nSubject: Hello\n\nHi!"), null);
  assert.equal(normMessageId("<ABC@x.com>"), "abc@x.com");
});

// ------------------------------------------------------------ tracking
test("click links are signed — tampered or non-http URLs are not redirected", () => {
  const key = "test-secret";
  const tok = "0123456789abcdef0123456789abcdef";
  const url = "https://staffing.synerax.in/portal/jobs/42?ref=email&x=1";
  const sig = signLink(tok, url, key);
  assert.equal(verifyLink(tok, url, sig, key), true);
  assert.equal(verifyLink(tok, "https://evil.example.com/", sig, key), false);
  assert.equal(verifyLink("ffffffffffffffffffffffffffffffff", url, sig, key), false);
  assert.equal(verifyLink(tok, url, sig.slice(0, -1) + "x", key), false);
  const js = "javascript:alert(1)";
  assert.equal(verifyLink(tok, js, signLink(tok, js, key), key), false);

  const u = new URL(clickUrl("https://app.test", tok, url, key));
  assert.equal(u.pathname, `/api/e/c/${tok}`);
  assert.equal(u.searchParams.get("u"), url);
  assert.equal(verifyLink(tok, u.searchParams.get("u")!, u.searchParams.get("s")!, key), true);
});

test("tracking rewrites http(s) links, keeps mailto/tel, and adds the open pixel", () => {
  const tok = "0123456789abcdef0123456789abcdef";
  const html = `<html><body><a href="https://x.test/a?b=1&amp;c=2">Go</a> <a href="mailto:hr@synerax.in">Mail</a> <a href="tel:+91">Call</a></body></html>`;
  const out = addTracking(html, "https://app.test", tok, "k");
  assert.match(out, /href="https:\/\/app\.test\/api\/e\/c\/0123456789abcdef0123456789abcdef\?u=https%3A%2F%2Fx\.test%2Fa%3Fb%3D1%26c%3D2&amp;s=/);
  assert.match(out, /href="mailto:hr@synerax\.in"/);
  assert.match(out, /href="tel:\+91"/);
  assert.match(out, /<img src="https:\/\/app\.test\/api\/e\/o\/0123456789abcdef0123456789abcdef"[^>]*><\/body>/);
});

// ------------------------------------------------------------ dashboard
test("summary: delivered includes bounced; open rate and CTR are per delivered email; skipped are not counted", () => {
  const base = { template: "t1", queued_at: "2026-10-13T10:00:00Z", sent_at: null, opened_at: null, clicked_at: null, bounced_at: null };
  const s = summarize([
    { ...base, status: "sent", sent_at: "x", opened_at: "x", clicked_at: "x" },
    { ...base, status: "sent", sent_at: "x", opened_at: "x" },
    { ...base, status: "sent", sent_at: "x" },
    { ...base, status: "bounced", sent_at: "x", bounced_at: "x" },
    { ...base, status: "failed" },
    { ...base, status: "queued" },
    { ...base, status: "skipped" },
  ]);
  assert.equal(s.total, 6);
  assert.equal(s.sent, 4);
  assert.equal(s.failed, 1);
  assert.equal(s.bounced, 1);
  assert.equal(s.queued, 1);
  assert.equal(s.openRate, 50);
  assert.equal(s.ctr, 25);
  assert.deepEqual(s.daily, [{ day: "2026-10-13", sent: 3, failed: 1, bounced: 1, queued: 1 }]);
});

// ------------------------------------------------------------ restore test
test("restore checks: PASS within ±5%, FAIL on missing rows, tables or functions", () => {
  const manifest = {
    taken_at: "2026-10-14T20:30:00Z",
    counts: { "public.candidates": 200, "public.applications": 80, "public.jobs": 6, "public.clients": 3, "public.profiles": 20, "public.candidate_documents": 150, "public.activity_logs": 900, "auth.users": 20 },
    latest: { candidates: "2026-10-14T19:00:00Z", applications: "2026-10-14T18:00:00Z", auth_users: "2026-10-14T17:00:00Z" },
    functions: ["add_to_job", "candidate_apply", "candidate_completion", "save_candidate", "search_candidates"],
  };
  const ok = compare(manifest, { ...manifest, counts: { ...manifest.counts, "public.activity_logs": 940 } }); // +4.4%
  assert.equal(ok.pass, true, ok.failed_checks.join("; "));

  const bad = compare(manifest, {
    counts: { ...manifest.counts, "public.candidates": 150, "auth.users": undefined },
    latest: { ...manifest.latest, applications: null },
    functions: manifest.functions.filter((f: string) => f !== "candidate_apply"),
  });
  assert.equal(bad.pass, false);
  const failed = bad.failed_checks.join(" | ");
  assert.match(failed, /rows public\.candidates: 150 restored vs 200/);
  assert.match(failed, /latest applications timestamp/);
  assert.match(failed, /function candidate_apply/);
});
