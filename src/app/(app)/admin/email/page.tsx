import Link from "next/link";
import { Mail } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { smtpConfigured } from "@/lib/email/send";
import { EMAIL_EVENTS } from "@/lib/email/events";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/misc";
import { cn, formatDateTime, timeAgo } from "@/lib/utils";
import { EmailSettingsForm } from "./email-settings-form";

export const metadata = { title: "Email settings" };

const PER_PAGE = 40;
const STATUS_STYLE: Record<string, string> = {
  sent: "bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300",
  failed: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
  skipped: "bg-stone-100 text-stone-600 dark:bg-stone-400/10 dark:text-stone-300",
};
const EVENT_LABEL: Record<string, string> = Object.fromEntries(EMAIL_EVENTS.map((e) => [e.key, e.label]));

export default async function EmailSettingsPage({ searchParams }: { searchParams: Promise<{ page?: string; status?: string; q?: string }> }) {
  const profile = await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const status = ["sent", "failed", "skipped"].includes(sp.status ?? "") ? sp.status : undefined;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const supabase = await createClient();

  let logQuery = supabase
    .from("email_log")
    .select("id, to_email, template, subject, status, error, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
  if (status) logQuery = logQuery.eq("status", status);
  if (q) logQuery = logQuery.ilike("to_email", `%${q.replace(/[%_,]/g, "")}%`);

  const [{ data: settings }, { data: log, count }] = await Promise.all([
    supabase.from("email_settings").select("sender_name, notify_emails, events, updated_at").eq("id", 1).maybeSingle(),
    logQuery,
  ]);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PER_PAGE));
  const qs = (p: Record<string, string | number | undefined>) => {
    const u = new URLSearchParams();
    const merged = { status, q: q || undefined, page, ...p };
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "" && !(k === "page" && v === 1)) u.set(k, String(v));
    const s = u.toString();
    return s ? `?${s}` : "?";
  };

  return (
    <>
      <PageHeader title="Email settings" description="Automated emails to clients, candidates and your team — turn each one on or off, and see every email that was sent." />

      {settings ? (
        <EmailSettingsForm
          initial={{ sender_name: settings.sender_name, notify_emails: settings.notify_emails ?? [], events: (settings.events as Record<string, boolean>) ?? {} }}
          smtp={{
            configured: smtpConfigured(),
            host: process.env.SMTP_HOST ?? null,
            from: process.env.MAIL_FROM || process.env.SMTP_USER || null,
            envInbox: process.env.SYNERAX_NOTIFY_EMAILS ?? null,
          }}
          myEmail={profile.email ?? ""}
        />
      ) : (
        <Card className="mb-6">
          <EmptyState
            icon={<Mail className="h-6 w-6" />}
            title="Email settings table missing"
            description="Run the latest supabase/migrations/003_portals.sql in the Supabase SQL editor (section 34), then reload."
          />
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader
          title="Email log"
          description={`${count ?? 0} email${count === 1 ? "" : "s"}`}
          action={
            <form className="flex flex-wrap items-center gap-2" action="/admin/email">
              <input name="q" defaultValue={q} placeholder="Recipient email" className="field-input h-8 w-44 text-[13px]" aria-label="Filter by recipient" />
              <select name="status" defaultValue={status ?? ""} className="field-input h-8 w-auto pr-8 text-[13px]" aria-label="Status">
                <option value="">All statuses</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="skipped">Skipped</option>
              </select>
              <button className="h-8 rounded-md border border-line px-3 text-[13px] font-medium text-ink-700 hover:bg-surface-2">Filter</button>
            </form>
          }
        />
        {(log ?? []).length === 0 ? (
          <EmptyState title="No emails yet" description="Emails appear here as soon as the app sends (or skips) one." compact />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-400">
                  <th className="px-5 py-2.5 font-medium">When</th>
                  <th className="px-3 py-2.5 font-medium">To</th>
                  <th className="px-3 py-2.5 font-medium">Email</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(log ?? []).map((l) => (
                  <tr key={l.id} className="align-top">
                    <td className="whitespace-nowrap px-5 py-2.5 text-[13px] text-ink-500" title={formatDateTime(l.created_at)}>
                      {timeAgo(l.created_at)}
                    </td>
                    <td className="px-3 py-2.5 text-[13px] text-ink-800">{l.to_email}</td>
                    <td className="px-3 py-2.5">
                      <p className="text-[13px] font-medium text-ink-800">{l.subject ?? "—"}</p>
                      <p className="text-xs text-ink-400">{EVENT_LABEL[l.template] ?? l.template}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", STATUS_STYLE[l.status] ?? STATUS_STYLE.skipped)}>{l.status}</span>
                      {l.error && <p className="mt-1 max-w-[260px] text-[11.5px] text-ink-500">{l.error}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-line px-5 py-3 text-[13px] text-ink-500">
            <span>
              Page {page} of {pages}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={qs({ page: page - 1 })} className="rounded-md border border-line px-3 py-1 hover:bg-surface-2">
                  Previous
                </Link>
              )}
              {page < pages && (
                <Link href={qs({ page: page + 1 })} className="rounded-md border border-line px-3 py-1 hover:bg-surface-2">
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
