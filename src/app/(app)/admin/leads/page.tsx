import Link from "next/link";
import { Inbox, Mail, Phone } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LEAD_STATUSES, LEAD_TYPES } from "@/lib/lead-options";
import { Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { cn, formatDateTime, timeAgo } from "@/lib/utils";
import { LeadActions } from "./lead-actions";

export const metadata = { title: "Website leads" };

const PER_PAGE = 30;

const TYPE_LABEL: Record<string, string> = { contact: "Contact", employer: "Employer", candidate: "Candidate" };
const TYPE_STYLE: Record<string, string> = {
  contact: "bg-sky-50 text-sky-800 dark:bg-sky-400/10 dark:text-sky-300",
  employer: "bg-jade-50 text-jade-700",
  candidate: "bg-violet-50 text-violet-800 dark:bg-violet-400/10 dark:text-violet-300",
};
const STATUS_STYLE: Record<string, string> = {
  New: "bg-saffron-50 text-saffron-800",
  Contacted: "bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300",
  Closed: "bg-stone-100 text-stone-600 dark:bg-stone-400/10 dark:text-stone-300",
};

const DATA_LABELS: Record<string, string> = {
  enquiry: "Enquiry",
  message: "Message",
  role: "Role",
  hiringType: "Hiring type",
  openings: "Openings",
  location: "Location",
  experience: "Experience",
  budget: "Budget (LPA)",
  timeline: "Timeline",
  currentRole: "Current role",
  skills: "Skills",
  city: "City",
  resumeUrl: "Resume",
};

type Lead = {
  id: string;
  type: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  data: Record<string, string | null>;
  status: string;
  contacted_at: string | null;
  created_at: string;
  contacted_by_profile: { full_name: string } | null;
};

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ type?: string; status?: string; page?: string }> }) {
  await requireStaff();
  const sp = await searchParams;
  const type = LEAD_TYPES.includes(sp.type as never) ? sp.type : undefined;
  const status = LEAD_STATUSES.includes(sp.status as never) ? sp.status : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();

  let query = supabase
    .from("website_leads")
    .select("id, type, name, email, phone, company, data, status, contacted_at, created_at, contacted_by_profile:profiles!website_leads_contacted_by_fkey(full_name)", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
  if (type) query = query.eq("type", type);
  if (status) query = query.eq("status", status);

  const [{ data, count, error }, { count: newCount }] = await Promise.all([
    query,
    supabase.from("website_leads").select("id", { count: "exact", head: true }).eq("status", "New"),
  ]);
  const leads = (data ?? []) as unknown as Lead[];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PER_PAGE));

  const href = (next: { type?: string; status?: string; page?: number }) => {
    const p = new URLSearchParams();
    const t = "type" in next ? next.type : type;
    const s = "status" in next ? next.status : status;
    if (t) p.set("type", t);
    if (s) p.set("status", s);
    if (next.page && next.page > 1) p.set("page", String(next.page));
    const q = p.toString();
    return `/admin/leads${q ? `?${q}` : ""}`;
  };

  const chip = (active: boolean) =>
    cn("rounded-full border px-3 py-1 text-[13px]", active ? "border-ink-800 bg-ink-900 text-surface" : "border-line bg-surface text-ink-600 hover:border-line-strong");

  return (
    <>
      <PageHeader
        title="Website leads"
        description={`Enquiries from the public website forms.${newCount ? ` ${newCount} new.` : ""}`}
      />

      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-ink-400">Type</span>
          <Link href={href({ type: undefined, page: 1 })} className={chip(!type)}>
            All
          </Link>
          {LEAD_TYPES.map((t) => (
            <Link key={t} href={href({ type: t, page: 1 })} className={chip(type === t)}>
              {TYPE_LABEL[t]}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-ink-400">Status</span>
          <Link href={href({ status: undefined, page: 1 })} className={chip(!status)}>
            All
          </Link>
          {LEAD_STATUSES.map((s) => (
            <Link key={s} href={href({ status: s, page: 1 })} className={chip(status === s)}>
              {s}
            </Link>
          ))}
        </div>
      </div>

      {error ? (
        <Card className="p-6 text-sm text-red-600">
          Couldn&apos;t load leads: {error.message}. Make sure the latest <code>supabase/schema.sql</code> has been run.
        </Card>
      ) : leads.length === 0 ? (
        <Card>
          <EmptyState icon={<Inbox className="h-5 w-5" />} title="No leads yet" description="Submissions from the website's contact, employer and careers forms will appear here." />
        </Card>
      ) : (
        <ul className="space-y-3">
          {leads.map((l) => {
            const details = Object.entries(l.data ?? {}).filter(([k, v]) => v && k in DATA_LABELS);
            return (
              <li key={l.id}>
                <Card className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-[15px] font-semibold text-ink-900">{l.name}</h2>
                        {l.company && <span className="text-sm text-ink-500">· {l.company}</span>}
                        <span className={cn("rounded-full px-2 py-0.5 text-[11.5px] font-medium", TYPE_STYLE[l.type])}>{TYPE_LABEL[l.type] ?? l.type}</span>
                        <span className={cn("rounded-full px-2 py-0.5 text-[11.5px] font-medium", STATUS_STYLE[l.status])}>{l.status}</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-500">
                        <a href={`mailto:${l.email}`} className="inline-flex items-center gap-1 hover:text-ink-800">
                          <Mail className="h-3.5 w-3.5" aria-hidden /> {l.email}
                        </a>
                        {l.phone && (
                          <a href={`tel:${l.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1 hover:text-ink-800">
                            <Phone className="h-3.5 w-3.5" aria-hidden /> {l.phone}
                          </a>
                        )}
                        <time dateTime={l.created_at} title={formatDateTime(l.created_at)}>
                          {timeAgo(l.created_at)}
                        </time>
                      </div>
                    </div>
                    <LeadActions id={l.id} status={l.status} />
                  </div>

                  {details.length > 0 && (
                    <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-line pt-4 text-[13.5px] sm:grid-cols-2">
                      {details.map(([k, v]) => (
                        <div key={k} className={cn(k === "message" || k === "skills" ? "sm:col-span-2" : "")}>
                          <dt className="text-xs text-ink-400">{DATA_LABELS[k]}</dt>
                          <dd className="mt-0.5 whitespace-pre-wrap break-words text-ink-700">
                            {k === "resumeUrl" && v && /^https?:\/\//.test(v) ? (
                              <a href={v} target="_blank" rel="noopener noreferrer" className="text-jade-700 hover:underline">
                                Open resume link
                              </a>
                            ) : (
                              v
                            )}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}

                  {l.contacted_at && (
                    <p className="mt-3 text-xs text-ink-400">
                      Contacted {timeAgo(l.contacted_at)}
                      {l.contacted_by_profile?.full_name ? ` by ${l.contacted_by_profile.full_name}` : ""}
                    </p>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pagination">
          {page > 1 ? (
            <Link href={href({ page: page - 1 })} className="font-medium text-jade-700">
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-ink-400">
            Page {page} / {pages}
          </span>
          {page < pages ? (
            <Link href={href({ page: page + 1 })} className="font-medium text-jade-700">
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}
