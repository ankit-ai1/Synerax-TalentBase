import Link from "next/link";
import { BarChart3, Download } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EMAIL_EVENTS } from "@/lib/email/events";
import { QUOTA_DEFAULTS, quotaStatus, summarize, type EmailRow, type QuotaSettings, type QuotaUsage } from "@/lib/email/quota-logic";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/misc";
import { cn, formatDateTime } from "@/lib/utils";
import { QuotaSettingsForm } from "./quota-settings-form";

export const metadata = { title: "Email analytics" };

const LABEL: Record<string, string> = { ...Object.fromEntries(EMAIL_EVENTS.map((e) => [e.key, e.label])), system_alert: "System alert" };
const istDay = (d: Date) => new Date(d.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);
const when = (d: Date | null) => (d ? d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

type Row = EmailRow & { id: string; to_email: string; subject: string | null; last_error: string | null; bounce_reason: string | null; attempts: number };

export default async function EmailAnalyticsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const today = istDay(new Date());
  const to = /^\d{4}-\d{2}-\d{2}$/.test(sp.to ?? "") ? sp.to! : today;
  const from = /^\d{4}-\d{2}-\d{2}$/.test(sp.from ?? "") ? sp.from! : istDay(new Date(Date.now() - 29 * 86400_000));
  const fromIso = new Date(`${from}T00:00:00+05:30`).toISOString();
  const toIso = new Date(`${to}T23:59:59.999+05:30`).toISOString();
  const supabase = await createClient();

  const rows: Row[] = [];
  for (let page = 0; page < 20; page++) {
    const { data } = await supabase
      .from("emails")
      .select("id, status, template, to_email, subject, last_error, bounce_reason, attempts, queued_at, sent_at, opened_at, clicked_at, bounced_at")
      .gte("queued_at", fromIso)
      .lte("queued_at", toIso)
      .order("queued_at", { ascending: false })
      .range(page * 1000, page * 1000 + 999);
    rows.push(...((data ?? []) as Row[]));
    if (!data || data.length < 1000) break;
  }
  const s = summarize(rows);
  const failures = rows.filter((r) => r.status === "failed" || r.status === "bounced").slice(0, 100);

  const [{ data: q }, { data: u }] = await Promise.all([supabase.from("email_quota").select("*").eq("id", 1).maybeSingle(), supabase.rpc("email_quota_usage")]);
  const settings: QuotaSettings = { ...QUOTA_DEFAULTS, ...(q ?? {}), alerts_state: (q?.alerts_state as Record<string, string>) ?? {} };
  const usage: QuotaUsage = { used: 0, oldest_in_window: null, last_hour: 0, queued: 0, ...((u ?? {}) as Partial<QuotaUsage>) };
  const qs = quotaStatus(settings, usage);
  const maxDay = Math.max(1, ...s.daily.map((d) => d.sent + d.failed + d.bounced + d.queued));

  const cards = [
    { label: "Total", value: s.total },
    { label: "Delivered", value: s.sent, hint: "accepted by the mail server" },
    { label: "Failed", value: s.failed, tone: s.failed ? "text-red-600" : "" },
    { label: "Bounced", value: s.bounced, tone: s.bounced ? "text-amber-700" : "" },
    { label: "Queued", value: s.queued },
    { label: "Opened", value: s.opened, hint: `${s.openRate}% open rate · approximate` },
    { label: "Clicked", value: s.clicked, hint: `${s.ctr}% CTR` },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email analytics"
        description="Delivered = accepted by the mail server (not proof it reached the inbox). Opens are approximate — many mail apps block or pre-load images."
        actions={
          <Link href="/admin/email" className="text-[13px] font-medium text-jade-700 hover:underline">
            Email settings & log →
          </Link>
        }
      />

      {/* quota */}
      <Card>
        <CardHeader title={`Sending quota · ${settings.provider_name}`} description={`Rolling ${settings.window_hours}-hour window. When the limit is reached, emails stay queued and go out automatically as capacity frees up.`} />
        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto]">
          <div>
            <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
              <Stat label="Limit" value={qs.limit.toLocaleString("en-IN")} />
              <Stat label={`Used (last ${settings.window_hours}h)`} value={qs.used.toLocaleString("en-IN")} />
              <Stat label="Remaining" value={qs.remaining.toLocaleString("en-IN")} />
              <Stat label="Waiting in queue" value={qs.queued.toLocaleString("en-IN")} />
              <Stat label={qs.remaining === 0 ? "Sending resumes" : "Projected to hit limit"} value={qs.remaining === 0 ? when(qs.resumeAt) : qs.projectedLimitAt ? when(qs.projectedLimitAt) : "Not at this pace"} />
            </div>
            <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={qs.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Quota used">
              <div className={cn("h-full rounded-full", qs.pct >= 90 ? "bg-red-500" : qs.pct >= 80 ? "bg-amber-500" : "bg-jade")} style={{ width: `${qs.pct}%` }} />
            </div>
            <p className="mt-1.5 text-[12.5px] text-ink-500">
              {qs.pct}% used · {qs.perHour}/hour recently
              {qs.paused && qs.pausedUntil ? ` · paused by the mail server until ${when(new Date(qs.pausedUntil))}` : ""}
            </p>
          </div>
        </div>
        <QuotaSettingsForm initial={{ provider_name: settings.provider_name, daily_limit: settings.daily_limit, window_hours: settings.window_hours, thresholds: settings.thresholds, alert_emails: settings.alert_emails, failure_alert_after: settings.failure_alert_after }} />
      </Card>

      {/* range */}
      <form className="flex flex-wrap items-end gap-3" action="/admin/email/analytics">
        <label className="text-[12.5px] text-ink-500">
          From
          <input type="date" name="from" defaultValue={from} max={today} className="field-input mt-1 block h-9 w-auto text-[13px]" />
        </label>
        <label className="text-[12.5px] text-ink-500">
          To
          <input type="date" name="to" defaultValue={to} max={today} className="field-input mt-1 block h-9 w-auto text-[13px]" />
        </label>
        <button className="h-9 rounded-md border border-line px-3 text-[13px] font-medium text-ink-700 hover:bg-surface-2">Apply</button>
        <a href={`/api/admin/email/export?from=${from}&to=${to}`} className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-md border border-line px-3 text-[13px] font-medium text-ink-700 hover:bg-surface-2">
          <Download className="h-4 w-4" aria-hidden /> Export CSV
        </a>
      </form>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {cards.map((c) => (
          <Card key={c.label} className="p-4">
            <p className="text-[12px] font-medium text-ink-500">{c.label}</p>
            <p className={cn("mt-1 text-[24px] font-semibold tabular text-ink-900", c.tone)}>{c.value.toLocaleString("en-IN")}</p>
            {c.hint && <p className="mt-0.5 text-[11.5px] text-ink-400">{c.hint}</p>}
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="Per day" description="Delivered · failed · bounced · queued (by the day the email was created, IST)" />
        {s.daily.length === 0 ? (
          <EmptyState icon={<BarChart3 />} title="No emails in this range" compact />
        ) : (
          <div className="overflow-x-auto p-5">
            <div className="flex h-44 min-w-max items-end gap-1.5">
              {s.daily.map((d) => {
                const total = d.sent + d.failed + d.bounced + d.queued;
                return (
                  <div key={d.day} className="flex w-7 flex-col items-center gap-1" title={`${d.day}: ${d.sent} delivered, ${d.failed} failed, ${d.bounced} bounced, ${d.queued} queued`}>
                    <div className="flex w-full flex-col-reverse overflow-hidden rounded-t" style={{ height: `${(total / maxDay) * 140}px` }}>
                      <div className="bg-jade" style={{ flex: d.sent }} />
                      <div className="bg-amber-500" style={{ flex: d.bounced }} />
                      <div className="bg-red-500" style={{ flex: d.failed }} />
                      <div className="bg-sky-400" style={{ flex: d.queued }} />
                    </div>
                    <span className="text-[10px] tabular text-ink-400">{d.day.slice(8)}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 flex flex-wrap gap-4 text-[11.5px] text-ink-500">
              <Legend c="bg-jade" t="Delivered" /> <Legend c="bg-amber-500" t="Bounced" /> <Legend c="bg-red-500" t="Failed" /> <Legend c="bg-sky-400" t="Queued" />
            </p>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="By template" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-[13px]">
            <thead className="text-left text-[11.5px] uppercase tracking-wide text-ink-400">
              <tr>
                <th className="px-5 py-2.5 font-medium">Email</th>
                <th className="px-3 py-2.5 text-right font-medium">Total</th>
                <th className="px-3 py-2.5 text-right font-medium">Delivered</th>
                <th className="px-3 py-2.5 text-right font-medium">Failed</th>
                <th className="px-3 py-2.5 text-right font-medium">Bounced</th>
                <th className="px-3 py-2.5 text-right font-medium">Opened</th>
                <th className="px-5 py-2.5 text-right font-medium">Clicked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line tabular">
              {s.byTemplate.map((t) => (
                <tr key={t.template}>
                  <td className="px-5 py-2 text-ink-800">{LABEL[t.template] ?? t.template}</td>
                  <td className="px-3 py-2 text-right">{t.total}</td>
                  <td className="px-3 py-2 text-right">{t.sent}</td>
                  <td className="px-3 py-2 text-right">{t.failed || "—"}</td>
                  <td className="px-3 py-2 text-right">{t.bounced || "—"}</td>
                  <td className="px-3 py-2 text-right">{t.sent ? `${t.opened} (${Math.round((t.opened / t.sent) * 100)}%)` : "—"}</td>
                  <td className="px-5 py-2 text-right">{t.sent ? `${t.clicked} (${Math.round((t.clicked / t.sent) * 100)}%)` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader title="Failures & bounces" description={failures.length ? `Latest ${failures.length}` : undefined} />
        {failures.length === 0 ? (
          <EmptyState title="No failed or bounced emails in this range" compact />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-[13px]">
              <thead className="text-left text-[11.5px] uppercase tracking-wide text-ink-400">
                <tr>
                  <th className="px-5 py-2.5 font-medium">When</th>
                  <th className="px-3 py-2.5 font-medium">To</th>
                  <th className="px-3 py-2.5 font-medium">Email</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line align-top">
                {failures.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap px-5 py-2 text-ink-600">{formatDateTime(r.bounced_at ?? r.queued_at)}</td>
                    <td className="px-3 py-2 text-ink-700">{r.to_email}</td>
                    <td className="px-3 py-2 text-ink-700">
                      {LABEL[r.template] ?? r.template}
                      <span className="block max-w-[260px] truncate text-[12px] text-ink-400">{r.subject}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn("rounded-full px-2 py-0.5 text-[11.5px] font-semibold capitalize", r.status === "bounced" ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-700")}>{r.status}</span>
                      <span className="block text-[11.5px] text-ink-400">{r.attempts} attempt{r.attempts === 1 ? "" : "s"}</span>
                    </td>
                    <td className="max-w-[380px] px-5 py-2 text-[12.5px] text-ink-600">{r.bounce_reason ?? r.last_error ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[12px] text-ink-500">{label}</p>
      <p className="text-[18px] font-semibold tabular text-ink-900">{value}</p>
    </div>
  );
}
function Legend({ c, t }: { c: string; t: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2.5 w-2.5 rounded-sm", c)} /> {t}
    </span>
  );
}
