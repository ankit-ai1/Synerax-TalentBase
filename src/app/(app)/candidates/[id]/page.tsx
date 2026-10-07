import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Briefcase,
  ChevronLeft,
  GraduationCap,
  Link2,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Star,
  Globe,
  KeyRound,
} from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { getCandidate } from "@/lib/data";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { describeActivity } from "@/lib/activity";
import { Avatar, Badge, Card, CardHeader, EmptyState } from "@/components/ui/misc";
import { JoiningTimeline } from "@/components/candidate/joining-timeline";
import { DocumentsPanel } from "@/components/candidate/documents-panel";
import { NotesPanel } from "@/components/candidate/notes-panel";
import { MoreActions, ProfileTabs, RatingControl, Sensitive, StatusControl } from "@/components/candidate/profile-client";
import { age, cn, formatDate, formatDateTime, fullName, lpa, timeAgo, years } from "@/lib/utils";
import type { CandidateDocument } from "@/lib/types";
import { INTERVIEW_SELECT } from "@/lib/selects";
import { CandidateInterviews, CandidateJobs, CandidateQuickActions, CandidateTasks, ShortlistChips } from "@/components/candidate/candidate-actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("candidates").select("first_name, last_name").eq("id", id).maybeSingle();
  return { title: data ? fullName(data) : "Candidate" };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function CandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireStaff();
  const c = await getCandidate(id);
  if (!c) notFound();

  const supabase = await createClient();
  const [docs, notes, logs, apps, ivs, tks, sls, comp, portal] = await Promise.all([
    supabase
      .from("candidate_documents")
      .select("*, uploader:profiles!candidate_documents_uploaded_by_fkey(full_name)")
      .eq("candidate_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("candidate_notes")
      .select("id, content, created_at, author_id, author:profiles!candidate_notes_author_id_fkey(full_name)")
      .eq("candidate_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("activity_logs")
      .select("id, action, details, created_at, actor:profiles!activity_logs_actor_id_fkey(full_name)")
      .eq("candidate_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("applications")
      .select("id, stage, match_score, stage_changed_at, offered_ctc, expected_joining, joined_at, rejection_reason, created_at, owner:profiles!applications_owner_id_fkey(full_name), job:jobs(id, title, status, client:clients(name)), interviews(id, scheduled_at, round_name, status, result)")
      .eq("candidate_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("interviews").select(INTERVIEW_SELECT).eq("application.candidate_id", id).order("scheduled_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("id, title, due_at, status, priority, assignee:profiles!tasks_assigned_to_fkey(full_name)")
      .eq("candidate_id", id)
      .order("status", { ascending: false })
      .order("due_at", { ascending: true }),
    supabase.from("shortlist_candidates").select("shortlist:shortlists(id, name)").eq("candidate_id", id),
    supabase.rpc("candidate_completion", { p_candidate: id }),
    portalLogin(c.user_id as string | null),
  ]);

  const isAdmin = profile.role === "admin";
  const name = fullName(c);
  const cand = { id: c.id, first_name: c.first_name, last_name: c.last_name, phone: c.phone, email: c.email };
  const checks = [
    c.email || c.phone, c.dob, c.gender, c.current_city, c.headline || c.current_designation, c.total_experience,
    c.current_ctc != null, c.expected_ctc != null, c.notice_period_days != null, (c.candidate_skills ?? []).length > 0,
    (c.candidate_job_roles ?? []).length > 0, (c.candidate_experiences ?? []).length > 0, (c.candidate_educations ?? []).length > 0,
    (c.preferred_locations ?? []).length > 0, c.source, c.highest_qualification,
  ];
  const completion = comp.data as { percent: number; missing: { label: string }[] } | null;
  const completeness = completion?.percent ?? Math.round((checks.filter(Boolean).length / checks.length) * 100);
  const selfRegistered = !!c.user_id || c.source === "Portal";
  const skills = [...(c.candidate_skills ?? [])]
    .filter((s: any) => s.skill)
    .sort((a: any, b: any) => Number(b.is_primary) - Number(a.is_primary) || (Number(b.years) || 0) - (Number(a.years) || 0));
  const roles = (c.candidate_job_roles ?? []).filter((r: any) => r.job_role);
  const maxYears = Math.max(1, ...skills.map((s: any) => Number(s.years) || 0));
  const hike =
    c.current_ctc && c.expected_ctc && Number(c.current_ctc) > 0
      ? Math.round(((Number(c.expected_ctc) - Number(c.current_ctc)) / Number(c.current_ctc)) * 100)
      : null;
  const resume = (docs.data ?? []).find((d: any) => d.doc_type === "Resume" && !d.is_archived);
  const waNumber = (c.whatsapp || c.phone || "").replace(/[^0-9]/g, "");

  const facts = [
    { label: "Experience", value: years(c.total_experience), sub: c.relevant_experience ? `${years(c.relevant_experience)} relevant` : undefined },
    { label: "Current CTC", value: lpa(c.current_ctc), sub: c.current_fixed_ctc ? `Fixed ${lpa(c.current_fixed_ctc)}` : undefined },
    {
      label: "Expected CTC",
      value: lpa(c.expected_ctc),
      sub: hike !== null ? `${hike > 0 ? "+" : ""}${hike}% hike${c.ctc_negotiable ? ", negotiable" : ""}` : c.ctc_negotiable ? "Negotiable" : undefined,
    },
    { label: "Location", value: c.current_city || "—", sub: c.willing_to_relocate ? "Open to relocation" : undefined },
  ];

  const overview = (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="min-w-0 space-y-6">
        <JoiningTimeline
          noticeDays={c.notice_period_days}
          servingNotice={c.serving_notice}
          lastWorkingDay={c.last_working_day}
          availableFrom={c.available_from}
          currentlyEmployed={c.currently_employed}
        />

        <Card>
          <CardHeader title="Skills" description={roles.length ? undefined : "No roles tagged"} />
          <div className="p-5">
            {roles.length > 0 && (
              <div className="mb-5 flex flex-wrap gap-2">
                {roles.map((r: any) => (
                  <span
                    key={r.job_role.id}
                    className={cn(
                      "rounded-full px-3 py-1 text-[13px]",
                      r.is_primary ? "bg-ink-900 text-surface" : "border border-line text-ink-700"
                    )}
                  >
                    {r.job_role.name}
                  </span>
                ))}
              </div>
            )}
            {skills.length === 0 ? (
              <p className="text-sm text-ink-400">No skills added. Edit the profile to add skills, otherwise this candidate won't show up in search.</p>
            ) : (
              <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {skills.map((s: any) => (
                  <li key={s.skill.id}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="flex items-center gap-1.5 font-medium text-ink-800">
                        {s.is_primary && <Star className="h-3.5 w-3.5 fill-saffron text-saffron" aria-label="Primary skill" />}
                        {s.skill.name}
                      </span>
                      <span className="text-xs text-ink-400">
                        {s.years ? `${Number(s.years)} yrs` : ""}
                        {s.level ? ` · ${s.level}` : ""}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1 rounded-full bg-canvas">
                      <div
                        className={cn("h-full rounded-full", s.is_primary ? "bg-saffron" : "bg-ink-300")}
                        style={{ width: `${Math.max(6, ((Number(s.years) || 0) / maxYears) * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {c.summary && (
          <Card>
            <CardHeader title="Summary" />
            <p className="whitespace-pre-wrap p-5 text-sm leading-relaxed text-ink-700">{c.summary}</p>
          </Card>
        )}

        <Card>
          <CardHeader title="Work history" />
          {(c.candidate_experiences ?? []).length === 0 ? (
            <EmptyState icon={<Briefcase className="h-5 w-5" />} title="No work history added" />
          ) : (
            <ol className="relative p-5">
              {c.candidate_experiences.map((e: any, i: number) => (
                <li key={e.id} className="relative pb-6 pl-7 last:pb-0">
                  {i < c.candidate_experiences.length - 1 && <span className="absolute left-[5px] top-3 h-full w-px bg-line" />}
                  <span className={cn("absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border-2", e.is_current ? "border-jade bg-jade" : "border-ink-300 bg-surface")} />
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <p className="text-[15px] font-semibold text-ink-800">
                      {e.designation || "—"} <span className="font-normal text-ink-400">at</span> {e.company}
                    </p>
                    <p className="text-[13px] tabular text-ink-400">
                      {formatDate(e.start_date, { month: "short", year: "numeric" })} – {e.is_current ? "Present" : formatDate(e.end_date, { month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <p className="mt-0.5 text-[13px] text-ink-400">
                    {[e.employment_type, e.location, e.ctc ? lpa(e.ctc) : null].filter(Boolean).join(" · ")}
                  </p>
                  {e.responsibilities && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">{e.responsibilities}</p>}
                  {e.reason_for_leaving && (
                    <p className="mt-2 text-[13px] text-ink-500">
                      <span className="text-ink-400">Reason for leaving:</span> {e.reason_for_leaving}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
          {(c.reason_for_change || c.career_gap) && (
            <div className="grid gap-4 border-t border-line p-5 sm:grid-cols-2">
              {c.reason_for_change && <Detail label="Reason for job change" value={c.reason_for_change} />}
              {c.career_gap && <Detail label="Career gap" value={c.career_gap_details || "Yes"} />}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Education" description={c.highest_qualification ? `Highest: ${c.highest_qualification}` : undefined} />
          {(c.candidate_educations ?? []).length === 0 ? (
            <EmptyState icon={<GraduationCap className="h-5 w-5" />} title="No education added" />
          ) : (
            <ul className="divide-y divide-line">
              {c.candidate_educations.map((e: any) => (
                <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-ink-800">
                      {[e.degree, e.specialization].filter(Boolean).join(", ") || e.level}
                    </p>
                    <p className="text-[13px] text-ink-400">{[e.institute, e.university, e.education_mode].filter(Boolean).join(" · ")}</p>
                  </div>
                  <p className="text-[13px] tabular text-ink-500">
                    {e.end_year ?? ""}
                    {e.grade ? ` · ${e.grade}${e.grade_type === "Percentage" ? "%" : e.grade_type ? ` ${e.grade_type}` : ""}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {((c.candidate_certifications ?? []).length > 0 || (c.candidate_projects ?? []).length > 0) && (
          <Card>
            <CardHeader title="Certifications & projects" />
            <div className="divide-y divide-line">
              {c.candidate_certifications.map((x: any) => (
                <div key={x.id} className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-ink-800">{x.name}</p>
                    <p className="text-[13px] text-ink-400">{[x.issuer, x.credential_id && `ID ${x.credential_id}`].filter(Boolean).join(" · ")}</p>
                  </div>
                  <div className="text-right text-[13px] text-ink-500">
                    {x.issue_date && formatDate(x.issue_date, { month: "short", year: "numeric" })}
                    {x.expiry_date && ` – ${formatDate(x.expiry_date, { month: "short", year: "numeric" })}`}
                    {x.credential_url && (
                      <a href={x.credential_url} target="_blank" rel="noopener" className="ml-2 text-jade-700 hover:underline">
                        Verify
                      </a>
                    )}
                  </div>
                </div>
              ))}
              {c.candidate_projects.map((p: any) => (
                <div key={p.id} className="px-5 py-3.5">
                  <p className="text-sm font-medium text-ink-800">
                    {p.title} {p.client && <span className="font-normal text-ink-400">for {p.client}</span>}
                  </p>
                  <p className="text-[13px] text-ink-400">{[p.role, p.technologies].filter(Boolean).join(" · ")}</p>
                  {p.description && <p className="mt-1.5 text-sm text-ink-700">{p.description}</p>}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* right rail */}
      <div className="space-y-6">
        <Card>
          <CardHeader title="Contact" />
          <dl className="space-y-3 p-5 text-sm">
            <Row icon={<Mail className="h-4 w-4" />} value={c.email ? <a className="text-jade-700 hover:underline" href={`mailto:${c.email}`}>{c.email}</a> : null} />
            {c.alt_email && <Row icon={<Mail className="h-4 w-4" />} value={c.alt_email} muted />}
            <Row icon={<Phone className="h-4 w-4" />} value={c.phone ? <a className="text-jade-700 hover:underline" href={`tel:${c.phone}`}>{c.phone}</a> : null} />
            {c.alt_phone && <Row icon={<Phone className="h-4 w-4" />} value={c.alt_phone} muted />}
            {waNumber && (
              <Row
                icon={<MessageCircle className="h-4 w-4" />}
                value={
                  <a className="text-jade-700 hover:underline" target="_blank" rel="noopener" href={`https://wa.me/${waNumber.length === 10 ? "91" + waNumber : waNumber}`}>
                    Message on WhatsApp
                  </a>
                }
              />
            )}
            {[c.linkedin_url, c.github_url, c.portfolio_url].filter(Boolean).map((u: string) => (
              <Row
                key={u}
                icon={<Link2 className="h-4 w-4" />}
                value={
                  <a className="truncate text-jade-700 hover:underline" target="_blank" rel="noopener" href={u.startsWith("http") ? u : `https://${u}`}>
                    {u.replace(/^https?:\/\/(www\.)?/, "")}
                  </a>
                }
              />
            ))}
            <Row
              icon={<MapPin className="h-4 w-4" />}
              value={[c.current_address, c.current_city, c.current_state, c.current_pincode].filter(Boolean).join(", ") || null}
            />
          </dl>
        </Card>

        <Card>
          <CardHeader title="Personal" />
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 p-5">
            <Detail label="DOB" value={c.dob ? `${formatDate(c.dob)} (${age(c.dob)} yrs)` : null} span />
            <Detail label="Gender" value={c.gender} />
            <Detail label="Marital status" value={c.marital_status} />
            <Detail label="Father's name" value={c.father_name} />
            <Detail label="Nationality" value={c.nationality} />
            <Detail label="Languages" value={(c.languages ?? []).join(", ")} span />
            {c.permanent_address || c.permanent_city ? (
              <Detail label="Permanent address" value={[c.permanent_address, c.permanent_city, c.permanent_state, c.permanent_pincode].filter(Boolean).join(", ")} span />
            ) : null}
          </dl>
        </Card>

        <Card>
          <CardHeader title="Preferences" />
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 p-5">
            <Detail label="Preferred locations" value={(c.preferred_locations ?? []).join(", ")} span />
            <Detail label="Work mode" value={c.work_mode_preference} />
            <Detail label="Job type" value={c.job_type_preference} />
            <Detail label="Shift" value={c.shift_preference} />
            <Detail label="Travel" value={c.willing_to_travel ? "Ready" : "No"} />
            <Detail label="Offers in hand" value={c.offers_in_hand ? String(c.offers_in_hand) : "0"} />
            <Detail label="Notice buyout" value={c.notice_buyout ? "Possible" : "No"} />
            {c.offer_details && <Detail label="Offer details" value={c.offer_details} span />}
            {c.last_hike_date && <Detail label="Last hike" value={`${formatDate(c.last_hike_date, { month: "short", year: "numeric" })}${c.last_hike_percent ? ` (${Number(c.last_hike_percent)}%)` : ""}`} span />}
          </dl>
        </Card>

        <Card>
          <CardHeader title="IDs & verification" />
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 p-5">
            <Detail label="PAN" value={<Sensitive value={c.pan_number} />} />
            <Detail label="UAN" value={<Sensitive value={c.uan_number} />} />
            <Detail label="Passport" value={<Sensitive value={c.passport_number} />} />
            <Detail label="Valid till" value={c.passport_valid_till ? formatDate(c.passport_valid_till) : null} />
            <Detail label="Visa" value={c.visa_status} />
            <Detail
              label="BGV"
              value={
                <Badge tone={c.bgv_status === "Cleared" ? "jade" : c.bgv_status === "Failed" ? "red" : "neutral"}>{c.bgv_status ?? "Not started"}</Badge>
              }
            />
          </dl>
        </Card>

        <Card>
          <CardHeader title="Source & tags" />
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 p-5">
            <Detail label="Source" value={c.source} />
            <Detail label="Referred by" value={c.referred_by} />
            <Detail
              label="Tags"
              span
              value={
                (c.tags ?? []).length ? (
                  <span className="flex flex-wrap gap-1.5">
                    {c.tags.map((t: string) => (
                      <Link key={t} href={`/candidates?tag=${encodeURIComponent(t)}`}>
                        <Badge>{t}</Badge>
                      </Link>
                    ))}
                  </span>
                ) : null
              }
            />
            <Detail label="Added by" value={`${(c as any).creator?.full_name ?? "—"}, ${formatDate(c.created_at)}`} span />
            <Detail label="Last updated" value={`${(c as any).editor?.full_name ?? "—"}, ${timeAgo(c.updated_at)}`} span />
          </dl>
        </Card>

        {(c.candidate_references ?? []).length > 0 && (
          <Card>
            <CardHeader title="References" />
            <ul className="divide-y divide-line">
              {c.candidate_references.map((r: any) => (
                <li key={r.id} className="px-5 py-3">
                  <p className="text-sm font-medium text-ink-800">{r.name}</p>
                  <p className="text-[13px] text-ink-400">{[r.designation, r.company, r.relation].filter(Boolean).join(" · ")}</p>
                  <p className="mt-0.5 text-[13px] text-ink-600">{[r.phone, r.email].filter(Boolean).join(" · ")}</p>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );

  const activity = (
    <Card>
      {(logs.data ?? []).length === 0 ? (
        <EmptyState title="No activity" />
      ) : (
        <ol className="divide-y divide-line">
          {(logs.data ?? []).map((l: any) => (
            <li key={l.id} className="flex items-start justify-between gap-4 px-5 py-3 text-sm">
              <p className="text-ink-700">
                <span className="font-medium text-ink-800">{l.actor?.full_name ?? "System"}</span> {describeActivity(l)}
              </p>
              <time className="shrink-0 text-xs text-ink-400" dateTime={l.created_at} title={formatDateTime(l.created_at)}>
                {timeAgo(l.created_at)}
              </time>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );

  return (
    <>
      <Link href="/candidates" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-400 hover:text-ink-800">
        <ChevronLeft className="h-4 w-4" /> Candidates
      </Link>

      {c.is_archived && (
        <div className="mb-4 rounded-lg border border-saffron/40 bg-saffron-50 px-4 py-2.5 text-sm text-saffron-800">
          This candidate is archived — hidden from search.
        </div>
      )}

      {/* dossier header */}
      <header className="relative mb-6 overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(80%_100%_at_0%_0%,rgb(var(--jade)/0.10),transparent_70%),radial-gradient(50%_100%_at_100%_0%,rgb(var(--saffron)/0.10),transparent_70%)]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="relative">
              <Avatar name={name} size="2xl" className="ring-4 ring-surface" />
              <svg className="absolute -inset-1.5 -rotate-90" viewBox="0 0 100 100" aria-label={`Profile ${completeness}% complete`}>
                <circle cx="50" cy="50" r="47" fill="none" strokeWidth="3" className="stroke-surface-3" />
                <circle cx="50" cy="50" r="47" fill="none" strokeWidth="3" strokeLinecap="round" strokeDasharray={295} strokeDashoffset={295 * (1 - completeness / 100)} className={completeness >= 80 ? "stroke-jade" : "stroke-saffron"} />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.02em] text-ink-900">{name}</h1>
                <span className="font-mono text-xs text-ink-400">{c.candidate_code}</span>
                {selfRegistered && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2 py-0.5 text-[11px] font-medium text-cyan-800 dark:bg-cyan-400/10 dark:text-cyan-300">
                    <Globe className="h-3 w-3" /> Self-registered
                  </span>
                )}
              </div>
              <p className="mt-1 text-[15px] text-ink-600">
                {c.headline ||
                  [c.current_designation, c.current_company && `at ${c.current_company}`].filter(Boolean).join(" ") ||
                  (c.currently_employed ? "—" : "Not currently employed")}
              </p>
              {c.headline && c.current_designation && (
                <p className="text-[13px] text-ink-400">
                  {c.current_designation}
                  {c.current_company ? ` at ${c.current_company}` : ""}
                  {c.current_payroll ? ` (payroll: ${c.current_payroll})` : ""}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <StatusControl id={c.id} status={c.status} />
                <RatingControl id={c.id} rating={c.rating} />
                <span
                  className="text-xs text-ink-400"
                  title={completion?.missing?.length ? `Missing: ${completion.missing.map((m) => m.label).join(", ")}` : undefined}
                >
                  Profile {completeness}% complete
                </span>
                {portal && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                      !portal.active
                        ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                        : portal.confirmed
                          ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300"
                          : "bg-saffron-50 text-saffron-800"
                    )}
                    title={portal.email ?? undefined}
                  >
                    <KeyRound className="h-3 w-3" />
                    {!portal.active
                      ? "Portal login disabled"
                      : !portal.confirmed
                        ? "Portal login · email not verified"
                        : portal.lastSignIn
                          ? `Portal login · last seen ${timeAgo(portal.lastSignIn)}`
                          : "Portal login · never signed in"}
                  </span>
                )}
              </div>
              <div className="mt-2">
                <ShortlistChips lists={(sls.data ?? []).map((x: any) => x.shortlist).filter(Boolean)} />
              </div>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            {resume && (
              <a
                href={`/api/documents/${resume.id}`}
                target="_blank"
                rel="noopener"
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-medium text-ink-800 shadow-card hover:bg-canvas"
              >
                View resume
              </a>
            )}
            <Link href={`/candidates/${c.id}/edit`} className="inline-flex h-10 items-center gap-2 rounded-lg bg-ink-900 px-4 text-sm font-medium text-surface shadow-sm hover:bg-ink-800">
              <Pencil className="h-4 w-4" /> Edit
            </Link>
            <MoreActions id={c.id} archived={c.is_archived} isAdmin={isAdmin} name={name} />
          </div>
        </div>

        <div className="relative mt-5 border-t border-line pt-4">
          <CandidateQuickActions c={{ id: c.id, first_name: c.first_name, last_name: c.last_name, phone: c.phone, email: c.email }} />
        </div>
      </header>

      <div className="mb-6">
        <dl className="grid grid-cols-2 overflow-hidden rounded-xl border border-line bg-surface shadow-card lg:grid-cols-4">
          {facts.map((f, i) => (
            <div key={f.label} className={cn("px-5 py-4", i > 0 && "border-line lg:border-l", i % 2 === 1 && "border-l", i >= 2 && "border-t lg:border-t-0")}>
              <dt className="text-[13px] text-ink-400">{f.label}</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular tracking-tight text-ink-800">{f.value}</dd>
              {f.sub && <dd className="text-xs text-ink-400">{f.sub}</dd>}
            </div>
          ))}
        </dl>
      </div>

      <ProfileTabs
        tabs={[
          { id: "overview", label: "Profile", content: overview },
          {
            id: "jobs",
            label: "Jobs",
            count: (apps.data ?? []).length,
            content: <CandidateJobs cand={cand} apps={(apps.data ?? []) as any[]} />,
          },
          {
            id: "interviews",
            label: "Interviews",
            count: (ivs.data ?? []).length,
            content: <CandidateInterviews cand={cand} interviews={(ivs.data ?? []) as any[]} />,
          },
          {
            id: "tasks",
            label: "Follow-ups",
            count: (tks.data ?? []).filter((t: any) => t.status === "Open").length,
            content: <CandidateTasks cand={cand} tasks={(tks.data ?? []) as any[]} />,
          },
          {
            id: "documents",
            label: "Documents",
            count: (docs.data ?? []).filter((d: any) => !d.is_archived).length,
            content: <DocumentsPanel candidateId={c.id} documents={(docs.data ?? []) as CandidateDocument[]} isAdmin={isAdmin} />,
          },
          {
            id: "notes",
            label: "Notes",
            count: (notes.data ?? []).length,
            content: <NotesPanel candidateId={c.id} notes={(notes.data ?? []) as any} currentUserId={profile.id} isAdmin={isAdmin} />,
          },
          { id: "activity", label: "History", content: activity },
        ]}
      />
    </>
  );
}

function Detail({ label, value, span }: { label: string; value: React.ReactNode; span?: boolean }) {
  return (
    <div className={span ? "col-span-2" : undefined}>
      <dt className="text-xs text-ink-400">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-ink-800">{value || <span className="text-ink-300">—</span>}</dd>
    </div>
  );
}

function Row({ icon, value, muted }: { icon: React.ReactNode; value: React.ReactNode; muted?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-ink-400">{icon}</span>
      <span className={cn("min-w-0 break-words", muted ? "text-ink-500" : "text-ink-800")}>{value || <span className="text-ink-300">—</span>}</span>
    </div>
  );
}

/** Portal account state for a self-registered candidate (service role — staff-only page) */
async function portalLogin(userId: string | null) {
  if (!userId) return null;
  try {
    const admin = createAdminClient();
    const [{ data: u }, { data: p }] = await Promise.all([
      admin.auth.admin.getUserById(userId),
      admin.from("profiles").select("is_active").eq("id", userId).maybeSingle(),
    ]);
    if (!u.user) return null;
    return {
      email: u.user.email ?? null,
      confirmed: !!u.user.email_confirmed_at,
      lastSignIn: u.user.last_sign_in_at ?? null,
      active: p?.is_active !== false,
    };
  } catch {
    return null;
  }
}
