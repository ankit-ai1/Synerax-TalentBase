import Link from "next/link";
import { notFound } from "next/navigation";
import { Briefcase, ChevronLeft, Globe, Mail, MapPin, MessageCircle, Pencil, Phone, Plus, Trophy } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LinkButton } from "@/components/ui/button";
import { Avatar, Card, CardHeader, ClientStatusBadge, EmptyState, StatTile } from "@/components/ui/misc";
import { Tabs } from "@/components/ui/interactive";
import { JobRow, JOB_LIST_SELECT } from "@/components/jobs/job-row";
import { DeleteClientButton } from "@/components/clients/delete-client";
import { formatDate, inr, lpa, waLink } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("clients").select("name").eq("id", id).maybeSingle();
  return { title: data?.name ?? "Client" };
}

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireStaff();
  const supabase = await createClient();
  const [{ data: c }, { data: jobs }, { data: placements }] = await Promise.all([
    supabase.from("clients").select("*, client_contacts(*), manager:profiles!clients_account_manager_fkey(full_name)").eq("id", id).maybeSingle(),
    supabase.from("jobs").select(JOB_LIST_SELECT).eq("client_id", id).order("created_at", { ascending: false }),
    supabase
      .from("applications")
      .select("id, joined_at, offered_ctc, job:jobs!inner(id, title, client_id), candidate:candidates(id, first_name, last_name, current_designation, expected_ctc)")
      .eq("stage", "Joined")
      .eq("job.client_id", id)
      .order("joined_at", { ascending: false }),
  ]);
  if (!c) notFound();

  const all = (jobs ?? []) as any[];
  const open = all.filter((j) => j.status === "Open");
  const pipeline = all.reduce((s, j) => s + (j.applications ?? []).filter((a: any) => !["Joined", "Rejected", "Dropped"].includes(a.stage)).length, 0);
  const submitted = all.reduce((s, j) => s + (j.applications ?? []).filter((a: any) => ["Submitted", "Interview", "Offered", "Joined"].includes(a.stage)).length, 0);
  const revenue = (placements ?? []).reduce((s: number, p: any) => {
    if (c.fee_type === "Fixed") return s + Number(c.fee_value ?? 0);
    const ctc = Number(p.offered_ctc ?? p.candidate?.expected_ctc ?? 0);
    return s + (ctc * 100000 * Number(c.fee_value ?? 0)) / 100;
  }, 0);
  const contacts = [...(c.client_contacts ?? [])].sort((a: any, b: any) => Number(b.is_primary) - Number(a.is_primary));

  return (
    <>
      <Link href="/clients" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-400 hover:text-ink-800">
        <ChevronLeft className="h-4 w-4" /> Clients
      </Link>

      <header className="mb-6 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <Avatar name={c.name} size="xl" square />
          <div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.02em] text-ink-900">{c.name}</h1>
              <ClientStatusBadge status={c.status} />
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-500">
              <span className="font-mono text-xs text-ink-400">{c.client_code}</span>
              {c.industry && <span>{c.industry}</span>}
              {c.city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {[c.city, c.state].filter(Boolean).join(", ")}
                </span>
              )}
              {c.website && (
                <a href={c.website.startsWith("http") ? c.website : `https://${c.website}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-jade-700 hover:underline">
                  <Globe className="h-3.5 w-3.5" />
                  {c.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </p>
            {(c as any).manager?.full_name && <p className="mt-1 text-[13px] text-ink-400">Account manager: {(c as any).manager.full_name}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <LinkButton href={`/jobs/new?client=${c.id}`}>
            <Plus className="h-4 w-4" /> New job
          </LinkButton>
          <LinkButton href={`/clients/${c.id}/edit`} variant="secondary">
            <Pencil className="h-4 w-4" /> Edit
          </LinkButton>
          {profile.role === "admin" && <DeleteClientButton id={c.id} name={c.name} />}
        </div>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="Open jobs" value={open.length} hint={`${open.reduce((s, j) => s + j.openings, 0)} positions`} />
        <StatTile label="In pipeline" value={pipeline} />
        <StatTile label="Profiles submitted" value={submitted} />
        <StatTile label="Placements" value={(placements ?? []).length} accent />
        <StatTile label="Est. revenue" value={inr(revenue)} hint={c.fee_type === "Fixed" ? `${inr(Number(c.fee_value ?? 0))} per hire` : `${c.fee_value ?? 0}% of CTC`} />
      </div>

      <Tabs
        tabs={[
          {
            id: "jobs",
            label: "Jobs",
            count: all.length,
            content:
              all.length === 0 ? (
                <Card>
                  <EmptyState
                    icon={<Briefcase className="h-5 w-5" />}
                    title="No jobs for this client"
                    action={
                      <LinkButton href={`/jobs/new?client=${c.id}`}>
                        <Plus className="h-4 w-4" /> Create the first job
                      </LinkButton>
                    }
                  />
                </Card>
              ) : (
                <div className="space-y-3">
                  {all.map((j) => (
                    <JobRow key={j.id} job={j} />
                  ))}
                </div>
              ),
          },
          {
            id: "contacts",
            label: "Contacts",
            count: contacts.length,
            content: (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {contacts.length === 0 && <p className="text-sm text-ink-400">No contacts. Edit the client to add one.</p>}
                {contacts.map((p: any) => {
                  const wa = waLink(p.phone);
                  return (
                    <Card key={p.id} className="p-5">
                      <div className="flex items-start gap-3">
                        <Avatar name={p.name} />
                        <div className="min-w-0">
                          <p className="font-semibold text-ink-900">{p.name}</p>
                          <p className="text-[13px] text-ink-400">{p.designation ?? "—"}</p>
                          {p.is_primary && <p className="mt-1 text-[11px] font-medium text-saffron-600">Primary contact</p>}
                        </div>
                      </div>
                      <div className="mt-4 space-y-1.5 text-sm">
                        {p.email && (
                          <a href={`mailto:${p.email}`} className="flex items-center gap-2 text-jade-700 hover:underline">
                            <Mail className="h-4 w-4 text-ink-400" /> {p.email}
                          </a>
                        )}
                        {p.phone && (
                          <a href={`tel:${p.phone}`} className="flex items-center gap-2 text-jade-700 hover:underline">
                            <Phone className="h-4 w-4 text-ink-400" /> {p.phone}
                          </a>
                        )}
                        {wa && (
                          <a href={wa} target="_blank" rel="noopener" className="flex items-center gap-2 text-jade-700 hover:underline">
                            <MessageCircle className="h-4 w-4 text-ink-400" /> WhatsApp
                          </a>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            ),
          },
          {
            id: "placements",
            label: "Placements",
            count: (placements ?? []).length,
            content: (
              <Card>
                {(placements ?? []).length === 0 ? (
                  <EmptyState icon={<Trophy className="h-5 w-5" />} title="No placements yet" description="Candidates who reach the 'Joined' stage will appear here." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px] text-sm">
                      <thead>
                        <tr className="border-b border-line text-left text-xs text-ink-400">
                          <th className="px-5 py-3 font-medium">Candidate</th>
                          <th className="px-3 py-3 font-medium">Job</th>
                          <th className="px-3 py-3 font-medium">CTC</th>
                          <th className="px-5 py-3 text-right font-medium">Joined</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {(placements ?? []).map((p: any) => (
                          <tr key={p.id}>
                            <td className="px-5 py-3">
                              <Link href={`/candidates/${p.candidate.id}`} className="flex items-center gap-2.5 font-medium text-ink-900 hover:text-jade-700">
                                <Avatar name={`${p.candidate.first_name} ${p.candidate.last_name ?? ""}`} size="xs" />
                                {p.candidate.first_name} {p.candidate.last_name}
                              </Link>
                            </td>
                            <td className="px-3 py-3 text-ink-600">
                              <Link href={`/jobs/${p.job.id}`} className="hover:underline">
                                {p.job.title}
                              </Link>
                            </td>
                            <td className="px-3 py-3 tabular text-ink-700">{lpa(p.offered_ctc ?? p.candidate.expected_ctc)}</td>
                            <td className="px-5 py-3 text-right text-ink-500">{formatDate(p.joined_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            ),
          },
          {
            id: "agreement",
            label: "Agreement & notes",
            content: (
              <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
                <Card>
                  <CardHeader title="Commercial terms" />
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-4 p-5 text-sm">
                    <D label="Fee" value={c.fee_value ? (c.fee_type === "Fixed" ? `${inr(Number(c.fee_value))} per hire` : `${c.fee_value}% of annual CTC`) : null} span />
                    <D label="Payment terms" value={c.payment_terms_days ? `${c.payment_terms_days} days` : null} />
                    <D label="Replacement" value={c.replacement_days ? `${c.replacement_days} days` : null} />
                    <D label="Agreement start" value={c.agreement_start ? formatDate(c.agreement_start) : null} />
                    <D label="Agreement end" value={c.agreement_end ? formatDate(c.agreement_end) : null} />
                    <D label="GSTIN" value={c.gstin} />
                    <D label="Address" value={c.address} span />
                  </dl>
                </Card>
                <Card>
                  <CardHeader title="Notes" />
                  <p className="whitespace-pre-wrap p-5 text-sm leading-relaxed text-ink-700">{c.notes || <span className="text-ink-400">No notes.</span>}</p>
                </Card>
              </div>
            ),
          },
        ]}
      />
    </>
  );
}

function D({ label, value, span }: { label: string; value: React.ReactNode; span?: boolean }) {
  return (
    <div className={span ? "col-span-2" : undefined}>
      <dt className="text-xs text-ink-400">{label}</dt>
      <dd className="mt-0.5 text-ink-800">{value || <span className="text-ink-300">—</span>}</dd>
    </div>
  );
}
