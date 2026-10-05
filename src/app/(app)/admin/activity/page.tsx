import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { describeActivity, fieldLabel, fmtValue } from "@/lib/activity";
import { Avatar, Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { formatDateTime, timeAgo } from "@/lib/utils";

export const metadata = { title: "Activity log" };

const PER_PAGE = 50;

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ page?: string; user?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();

  let query = supabase
    .from("activity_logs")
    .select("id, action, details, created_at, candidate_id, actor_id, actor:profiles!activity_logs_actor_id_fkey(full_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
  if (sp.user) query = query.eq("actor_id", sp.user);

  const [{ data, count }, { data: users }] = await Promise.all([query, supabase.from("profiles").select("id, full_name").order("full_name")]);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PER_PAGE));
  const qs = (p: number) => `?page=${p}${sp.user ? `&user=${sp.user}` : ""}`;

  return (
    <>
      <PageHeader title="Activity log" description="Who added, edited or deleted what, and when." />
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/activity" className={`rounded-full border px-3 py-1 text-[13px] ${!sp.user ? "border-ink-800 bg-ink-900 text-surface" : "border-line bg-surface text-ink-600"}`}>
          Everyone
        </Link>
        {(users ?? []).map((u) => (
          <Link
            key={u.id}
            href={`/admin/activity?user=${u.id}`}
            className={`rounded-full border px-3 py-1 text-[13px] ${sp.user === u.id ? "border-ink-800 bg-ink-900 text-surface" : "border-line bg-surface text-ink-600"}`}
          >
            {u.full_name}
          </Link>
        ))}
      </div>
      <Card>
        {(data ?? []).length === 0 ? (
          <EmptyState title="No activity yet" />
        ) : (
          <ol className="divide-y divide-line">
            {(data ?? []).map((l: any) => {
              const changes = l.action === "updated" ? Object.entries(l.details?.changes ?? {}).slice(0, 6) : [];
              return (
                <li key={l.id} className="flex gap-3 px-5 py-3.5">
                  <Avatar name={l.actor?.full_name ?? "System"} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                      <p className="text-sm text-ink-700">
                        <span className="font-medium text-ink-800">{l.actor?.full_name ?? "System"}</span>{" "}
                        {l.candidate_id ? (
                          <Link href={`/candidates/${l.candidate_id}`} className="hover:underline">
                            {describeActivity(l)}
                          </Link>
                        ) : (
                          describeActivity(l)
                        )}
                      </p>
                      <time className="text-xs text-ink-400" dateTime={l.created_at} title={formatDateTime(l.created_at)}>
                        {timeAgo(l.created_at)}
                      </time>
                    </div>
                    {changes.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5 text-xs text-ink-500">
                        {changes.map(([k, v]: [string, any]) => (
                          <li key={k}>
                            <span className="text-ink-400">{fieldLabel(k)}:</span> {fmtValue(v.from)} <span className="text-ink-300">→</span>{" "}
                            <span className="text-ink-700">{fmtValue(v.to)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? <Link href={qs(page - 1)} className="font-medium text-jade-700">Previous</Link> : <span />}
          <span className="text-ink-400">
            Page {page} / {pages}
          </span>
          {page < pages ? <Link href={qs(page + 1)} className="font-medium text-jade-700">Next</Link> : <span />}
        </nav>
      )}
    </>
  );
}
