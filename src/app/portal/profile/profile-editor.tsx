"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  Image as ImageIcon,
  Loader2,

  Pencil,
  Phone,
  Plus,
  Settings2,
  Sparkles,
  Star,
  Trash2,
  UploadCloud,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  CITIES,
  EDU_LEVELS,
  EMPLOYMENT_TYPES,
  GENDERS,
  GRADE_TYPES,
  INDIAN_STATES,
  INDUSTRIES,
  JOB_TYPES,
  LANGUAGES,
  MARITAL,
  NOTICE_OPTIONS,
  QUALIFICATIONS,
  SHIFTS,
  SKILL_LEVELS,
  WORK_MODES,
} from "@/lib/constants";
import { profileLevel, type MyProfile } from "@/lib/portal-types";
import { Chip, MatchRing, SkillChip } from "@/components/portal-ui/kit";
import { ChipInput, SelectField, Switch, TextArea, TextField } from "@/components/ui/fields";
import { JobAlertsToggle, OpenToWorkToggle } from "@/components/portal/profile-toggles";
import { cn, fileSize, formatDate, friendlyError } from "@/lib/utils";
import { CvAutofill, type CvKey, type CvSuggestion } from "@/components/resume/cv-autofill";

type Row = Record<string, string | boolean>;
const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const b = (v: unknown, d = false) => (typeof v === "boolean" ? v : d);
const arr = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);

const SECTIONS: [string, string, LucideIcon][] = [
  ["basic", "Basic details", UserRound],
  ["contact", "Contact & address", Phone],
  ["professional", "Current job & salary", Briefcase],
  ["skills", "Skills", Sparkles],
  ["experience", "Work history", Briefcase],
  ["education", "Education", GraduationCap],
  ["preferences", "Job preferences", Settings2],
  ["documents", "CV & documents", FileText],
];
const SECTION_ICON = Object.fromEntries(SECTIONS.map(([id, , icon]) => [id, icon])) as Record<string, LucideIcon>;
/** completion weight still missing in a section */
const missingWeight = (section: string, missing: MyProfile["completion"]["missing"]) => missing.filter((m) => m.section === section).reduce((t, m) => t + m.weight, 0);

function Section({
  id,
  title,
  description,
  children,
  onSave,
  saving,
  missing,
  summary,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  onSave?: () => unknown;
  saving?: boolean;
  missing?: boolean;
  /** read-only view; when given, the section opens in view mode (edit mode if incomplete) */
  summary?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(!summary || !!missing);
  const Icon = SECTION_ICON[id] ?? FileText;
  return (
    <section id={id} className="portal-card scroll-mt-28">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4 sm:px-6">
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset", missing ? "bg-saffron-50 text-saffron-800 ring-saffron/30" : "bg-jade-50 text-jade-700 ring-jade/20")}>
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="flex flex-wrap items-center gap-2 text-[16px] font-semibold text-ink-900">
            {title}
            {missing ? <Chip tone="saffron">Incomplete</Chip> : <Chip tone="jade">Complete</Chip>}
          </h2>
          {description && <p className="mt-0.5 text-[13px] text-ink-500">{description}</p>}
        </div>
        {onSave &&
          (editing ? (
            <div className="flex gap-2">
              {summary && !missing && (
                <button onClick={() => setEditing(false)} className="inline-flex h-9 items-center rounded-lg px-3 text-[13px] font-medium text-ink-600 hover:bg-surface-3">
                  Cancel
                </button>
              )}
              <button
                onClick={async () => {
                  const ok = await onSave();
                  if (ok === true && summary) setEditing(false);
                }}
                disabled={saving}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-jade px-4 text-[13.5px] font-semibold text-white hover:brightness-110 disabled:opacity-60"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                Save
              </button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3.5 text-[13px] font-medium text-ink-700 hover:border-line-strong hover:bg-surface-2">
              <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
            </button>
          ))}
      </div>
      <div className="p-5 sm:p-6">{editing || !summary ? children : summary}</div>
    </section>
  );
}

/** label / value grid for view mode */
function View({ rows }: { rows: [string, React.ReactNode][] }) {
  const shown = rows.filter(([, v]) => v !== "" && v !== null && v !== undefined && v !== false);
  if (!shown.length) return <p className="text-[13.5px] text-ink-500">Nothing added yet.</p>;
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
      {shown.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-[11.5px] text-ink-400">{k}</dt>
          <dd className="break-words text-[14px] font-medium text-ink-800">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

const grid = "grid gap-4 sm:grid-cols-2";

export function ProfileEditor({ me, skillsMaster }: { me: MyProfile; skillsMaster: string[] }) {
  const router = useRouter();
  const c0 = me.candidate;
  const missingSections = new Set(me.completion.missing.map((m) => m.section));
  const [saving, setSaving] = useState<string | null>(null);

  const [c, setC] = useState<Record<string, string | boolean | string[]> & { languages: string[]; preferred_locations: string[] }>({
    first_name: s(c0.first_name),
    middle_name: s(c0.middle_name),
    last_name: s(c0.last_name),
    gender: s(c0.gender),
    dob: s(c0.dob),
    marital_status: s(c0.marital_status),
    nationality: s(c0.nationality),
    headline: s(c0.headline),
    summary: s(c0.summary),
    phone: s(c0.phone),
    alt_phone: s(c0.alt_phone),
    whatsapp: s(c0.whatsapp),
    linkedin_url: s(c0.linkedin_url),
    github_url: s(c0.github_url),
    portfolio_url: s(c0.portfolio_url),
    current_address: s(c0.current_address),
    current_city: s(c0.current_city),
    current_state: s(c0.current_state),
    current_pincode: s(c0.current_pincode),
    currently_employed: b(c0.currently_employed, true),
    current_designation: s(c0.current_designation),
    current_company: s(c0.current_company),
    current_employment_type: s(c0.current_employment_type),
    industry: s(c0.industry),
    total_experience: s(c0.total_experience),
    relevant_experience: s(c0.relevant_experience),
    highest_qualification: s(c0.highest_qualification),
    career_gap: b(c0.career_gap),
    career_gap_details: s(c0.career_gap_details),
    reason_for_change: s(c0.reason_for_change),
    current_ctc: s(c0.current_ctc),
    current_fixed_ctc: s(c0.current_fixed_ctc),
    current_variable_ctc: s(c0.current_variable_ctc),
    expected_ctc: s(c0.expected_ctc),
    ctc_negotiable: b(c0.ctc_negotiable),
    notice_period_days: s(c0.notice_period_days),
    serving_notice: b(c0.serving_notice),
    last_working_day: s(c0.last_working_day),
    available_from: s(c0.available_from),
    notice_buyout: b(c0.notice_buyout),
    offers_in_hand: s(c0.offers_in_hand),
    willing_to_relocate: b(c0.willing_to_relocate),
    work_mode_preference: s(c0.work_mode_preference),
    job_type_preference: s(c0.job_type_preference),
    shift_preference: s(c0.shift_preference),
    willing_to_travel: b(c0.willing_to_travel),
    languages: arr(c0.languages),
    preferred_locations: arr(c0.preferred_locations),
  });
  const set = (k: string, v: string | boolean | string[]) => setC((p) => ({ ...p, [k]: v }));

  const [skills, setSkills] = useState(me.skills.map((x) => ({ name: x.name, years: s(x.years), level: x.level ?? "Intermediate", is_primary: x.is_primary })));
  const [newSkill, setNewSkill] = useState("");
  const [exps, setExps] = useState<Row[]>(
    me.experiences.map((e) => ({
      company: s(e.company),
      designation: s(e.designation),
      employment_type: s(e.employment_type),
      location: s(e.location),
      start_date: s(e.start_date),
      end_date: s(e.end_date),
      is_current: b(e.is_current),
      responsibilities: s(e.responsibilities),
    }))
  );
  const [edus, setEdus] = useState<Row[]>(
    me.educations.map((e) => ({
      level: s(e.level),
      degree: s(e.degree),
      specialization: s(e.specialization),
      institute: s(e.institute),
      university: s(e.university),
      start_year: s(e.start_year),
      end_year: s(e.end_year),
      grade: s(e.grade),
      grade_type: s(e.grade_type),
    }))
  );
  const [certs, setCerts] = useState<Row[]>(
    me.certifications.map((e) => ({ name: s(e.name), issuer: s(e.issuer), issue_date: s(e.issue_date), expiry_date: s(e.expiry_date), credential_url: s(e.credential_url) }))
  );

  async function save(section: string, p: Record<string, unknown>) {
    setSaving(section);
    const { data, error } = await createClient().rpc("candidate_update_profile", { p });
    setSaving(null);
    if (error) {
      toast.error(friendlyError(error.message));
      return false;
    }
    const pct = (data as { percent?: number } | null)?.percent;
    toast.success(pct !== undefined ? `Saved — profile ${pct}% complete` : "Saved");
    router.refresh();
    return true;
  }

  const pick = (keys: string[]) => Object.fromEntries(keys.map((k) => [k, c[k as keyof typeof c]]));

  const saveBasic = () => {
    if (!s(c.first_name).trim()) return toast.error("First name is required");
    return save("basic", { candidate: pick(["first_name", "middle_name", "last_name", "gender", "dob", "marital_status", "nationality", "headline", "summary", "languages"]) });
  };
  const saveContact = () => {
    const phone = s(c.phone).replace(/[\s-]/g, "");
    if (phone && !/^[6-9]\d{9}$/.test(phone)) return toast.error("Enter a valid 10-digit mobile number");
    return save("contact", {
      candidate: { ...pick(["alt_phone", "whatsapp", "linkedin_url", "github_url", "portfolio_url", "current_address", "current_city", "current_state", "current_pincode"]), phone },
    });
  };
  const saveProfessional = () => {
    if (c.serving_notice && !c.last_working_day) return toast.error("Please add your last working day");
    return save("professional", {
      candidate: pick([
        "currently_employed",
        "current_designation",
        "current_company",
        "current_employment_type",
        "industry",
        "total_experience",
        "relevant_experience",
        "highest_qualification",
        "career_gap",
        "career_gap_details",
        "reason_for_change",
        "current_ctc",
        "current_fixed_ctc",
        "current_variable_ctc",
        "expected_ctc",
        "ctc_negotiable",
        "notice_period_days",
        "serving_notice",
        "last_working_day",
        "available_from",
        "notice_buyout",
        "offers_in_hand",
      ]),
    });
  };
  const saveSkills = () => {
    if (skills.length < 3) return toast.error("Add at least 3 skills");
    return save("skills", { skills: skills.map((x) => ({ name: x.name, years: x.years, level: x.level, is_primary: x.is_primary })) });
  };
  const savePreferences = () =>
    save("preferences", { candidate: pick(["preferred_locations", "willing_to_relocate", "work_mode_preference", "job_type_preference", "shift_preference", "willing_to_travel"]) });

  const addSkill = (raw: string) => {
    const name = raw.trim();
    if (!name) return;
    if (skills.some((x) => x.name.toLowerCase() === name.toLowerCase())) return setNewSkill("");
    setSkills((p) => [...p, { name, years: "", level: "Intermediate", is_primary: p.filter((x) => x.is_primary).length < 3 }]);
    setNewSkill("");
  };

  // "Fill from CV": empty fields only (after the candidate confirms), or one accepted "CV says" value
  const CV_KEYS: CvKey[] = ["first_name", "last_name", "dob", "phone", "linkedin_url", "github_url", "portfolio_url", "current_city", "total_experience", "current_designation", "current_company", "highest_qualification", "notice_period_days", "serving_notice", "last_working_day", "current_ctc", "expected_ctc"];
  const applyCv = async (values: CvSuggestion[], newSkills: string[] = []) => {
    const candidate = Object.fromEntries(values.map((v) => [v.key, v.value]));
    const merged = [...skills, ...newSkills.map((name, i) => ({ name, years: "", level: "Intermediate", is_primary: skills.filter((x) => x.is_primary).length + i < 3 }))];
    const p: Record<string, unknown> = {};
    if (values.length) p.candidate = candidate;
    if (newSkills.length) p.skills = merged.map((x) => ({ name: x.name, years: x.years, level: x.level, is_primary: x.is_primary }));
    if (!Object.keys(p).length) return;
    if (await save("cv", p)) {
      setC((prev) => ({ ...prev, ...candidate }));
      if (newSkills.length) setSkills(merged);
    }
  };

  const updateRow = (setter: React.Dispatch<React.SetStateAction<Row[]>>, i: number, k: string, v: string | boolean) =>
    setter((p) => p.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const removeRow = (setter: React.Dispatch<React.SetStateAction<Row[]>>, i: number) => setter((p) => p.filter((_, j) => j !== i));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
      {/* section nav */}
      <nav className="hidden lg:block" aria-label="Profile sections">
        <div className="sticky top-24 space-y-4">
          <div className="portal-card flex items-center gap-3 p-4">
            <MatchRing value={me.completion.percent} size={64} stroke={6} label={null} />
            <div>
              <p className="text-[12px] font-medium text-ink-400">Profile strength</p>
              <Chip tone={profileLevel(me.completion.percent).tone} className="mt-1">
                {profileLevel(me.completion.percent).label}
              </Chip>
            </div>
          </div>
          <ul className="portal-card space-y-0.5 p-2">
            {SECTIONS.map(([id, label, Icon]) => {
              const w = missingWeight(id, me.completion.missing);
              return (
                <li key={id}>
                  <a href={`#${id}`} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-ink-600 hover:bg-surface-3 hover:text-ink-900">
                    <Icon className="h-4 w-4 shrink-0 text-ink-400" aria-hidden />
                    <span className="flex-1 truncate">{label}</span>
                    {w ? <span className="text-[11px] font-semibold text-saffron-600">+{w}%</span> : missingSections.has(id) ? <Circle className="h-3.5 w-3.5 text-ink-300" /> : <CheckCircle2 className="h-3.5 w-3.5 text-jade" aria-label="Complete" />}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      <div className="min-w-0 space-y-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <OpenToWorkToggle initial={c0.open_to_work} />
          <div className="rounded-2xl border border-line bg-surface px-4 py-3 shadow-card">
            <JobAlertsToggle initial={c0.job_alerts} />
          </div>
        </div>

        <CvAutofill
          allowCurrentCv={me.documents.some((d) => d.doc_type === "Resume")}
          keys={CV_KEYS}
          current={c as Partial<Record<CvKey, unknown>>}
          currentSkills={skills.map((x) => x.name)}
          onFillEmpty={(values, newSkills) => applyCv(values, newSkills)}
          onAccept={(v) => applyCv([v])}
        />

        <Section
          id="basic"
          title="Basic details"
          onSave={saveBasic}
          saving={saving === "basic"}
          missing={missingSections.has("basic")}
          summary={
            <div className="space-y-4">
              {(c.headline || c.summary) && (
                <div>
                  {c.headline && <p className="text-[15px] font-semibold text-ink-900">{s(c.headline)}</p>}
                  {c.summary && <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed text-ink-600">{s(c.summary)}</p>}
                </div>
              )}
              <View rows={[["Name", [c.first_name, c.middle_name, c.last_name].filter(Boolean).join(" ")], ["Gender", s(c.gender)], ["Date of birth", c.dob ? formatDate(s(c.dob)) : ""], ["Marital status", s(c.marital_status)], ["Nationality", s(c.nationality)], ["Languages", c.languages.join(", ")]]} />
            </div>
          }
        >
          <div className={grid}>
            <TextField label="First name" required value={s(c.first_name)} onChange={(v) => set("first_name", v)} />
            <TextField label="Last name" value={s(c.last_name)} onChange={(v) => set("last_name", v)} />
            <TextField label="Middle name" value={s(c.middle_name)} onChange={(v) => set("middle_name", v)} />
            <SelectField label="Gender" value={s(c.gender)} onChange={(v) => set("gender", v)} options={GENDERS} />
            <TextField label="Date of birth" type="date" value={s(c.dob)} onChange={(v) => set("dob", v)} />
            <SelectField label="Marital status" value={s(c.marital_status)} onChange={(v) => set("marital_status", v)} options={MARITAL} />
            <TextField label="Nationality" value={s(c.nationality)} onChange={(v) => set("nationality", v)} />
            <ChipInput label="Languages" value={c.languages} onChange={(v) => set("languages", v)} suggestions={LANGUAGES} />
            <TextField className="sm:col-span-2" label="Headline" value={s(c.headline)} onChange={(v) => set("headline", v)} placeholder="e.g. Java developer with 6 years in banking" />
            <TextArea className="sm:col-span-2" label="Summary" rows={4} value={s(c.summary)} onChange={(v) => set("summary", v)} placeholder="A short introduction recruiters will read first" />
          </div>
        </Section>

        <Section
          id="contact"
          title="Contact & address"
          onSave={saveContact}
          saving={saving === "contact"}
          missing={missingSections.has("contact")}
          summary={<View rows={[["Email", s(c0.email)], ["Mobile", s(c.phone)], ["WhatsApp", s(c.whatsapp)], ["LinkedIn", s(c.linkedin_url)], ["City", [c.current_city, c.current_state].filter(Boolean).join(", ")], ["Pincode", s(c.current_pincode)]]} />}
        >
          <div className={grid}>
            <TextField label="Email" value={s(c0.email)} onChange={() => {}} disabled hint="Your sign-in email. Contact Synerax to change it." />
            <TextField label="Mobile number" value={s(c.phone)} onChange={(v) => set("phone", v)} inputMode="numeric" />
            <TextField label="Alternate mobile" value={s(c.alt_phone)} onChange={(v) => set("alt_phone", v)} inputMode="numeric" />
            <TextField label="WhatsApp" value={s(c.whatsapp)} onChange={(v) => set("whatsapp", v)} inputMode="numeric" />
            <TextField label="LinkedIn URL" value={s(c.linkedin_url)} onChange={(v) => set("linkedin_url", v)} type="url" />
            <TextField label="GitHub URL" value={s(c.github_url)} onChange={(v) => set("github_url", v)} type="url" />
            <TextField className="sm:col-span-2" label="Portfolio URL" value={s(c.portfolio_url)} onChange={(v) => set("portfolio_url", v)} type="url" />
            <TextField className="sm:col-span-2" label="Address" value={s(c.current_address)} onChange={(v) => set("current_address", v)} />
            <div>
              <TextField label="City" value={s(c.current_city)} onChange={(v) => set("current_city", v)} list="pf-cities" />
              <datalist id="pf-cities">
                {CITIES.map((x) => (
                  <option key={x} value={x} />
                ))}
              </datalist>
            </div>
            <SelectField label="State" value={s(c.current_state)} onChange={(v) => set("current_state", v)} options={INDIAN_STATES} />
            <TextField label="Pincode" value={s(c.current_pincode)} onChange={(v) => set("current_pincode", v.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" />
          </div>
        </Section>

        <Section
          id="professional"
          title="Current job, salary & notice"
          onSave={saveProfessional}
          saving={saving === "professional"}
          missing={missingSections.has("professional")}
          summary={
            <View
              rows={[
                ["Current role", c.currently_employed ? [c.current_designation, c.current_company].filter(Boolean).join(" at ") : "Not currently employed"],
                ["Total experience", c.total_experience ? `${s(c.total_experience)} years` : ""],
                ["Industry", s(c.industry)],
                ["Highest qualification", s(c.highest_qualification)],
                ["Current CTC", c.current_ctc ? `₹${s(c.current_ctc)} LPA` : ""],
                ["Expected CTC", c.expected_ctc ? `₹${s(c.expected_ctc)} LPA${c.ctc_negotiable ? " (negotiable)" : ""}` : ""],
                ["Notice period", c.serving_notice ? `Serving notice${c.last_working_day ? ` · LWD ${formatDate(s(c.last_working_day))}` : ""}` : c.notice_period_days !== "" ? `${s(c.notice_period_days)} days` : ""],
                ["Available from", c.available_from ? formatDate(s(c.available_from)) : ""],
              ]}
            />
          }
        >
          <div className="mb-4">
            <Switch checked={!!c.currently_employed} onChange={(v) => set("currently_employed", v)} label="I'm currently employed" />
          </div>
          <div className={grid}>
            {c.currently_employed && (
              <>
                <TextField label="Current designation" value={s(c.current_designation)} onChange={(v) => set("current_designation", v)} />
                <TextField label="Current company" value={s(c.current_company)} onChange={(v) => set("current_company", v)} />
                <SelectField label="Employment type" value={s(c.current_employment_type)} onChange={(v) => set("current_employment_type", v)} options={EMPLOYMENT_TYPES} />
              </>
            )}
            <SelectField label="Industry" value={s(c.industry)} onChange={(v) => set("industry", v)} options={INDUSTRIES} />
            <TextField label="Total experience" value={s(c.total_experience)} onChange={(v) => set("total_experience", v.replace(/[^\d.]/g, ""))} suffix="years" inputMode="decimal" />
            <TextField label="Relevant experience" value={s(c.relevant_experience)} onChange={(v) => set("relevant_experience", v.replace(/[^\d.]/g, ""))} suffix="years" inputMode="decimal" />
            <SelectField label="Highest qualification" value={s(c.highest_qualification)} onChange={(v) => set("highest_qualification", v)} options={QUALIFICATIONS} />
            <TextArea className="sm:col-span-2" label="Reason for job change" rows={2} value={s(c.reason_for_change)} onChange={(v) => set("reason_for_change", v)} />
            <div className="sm:col-span-2">
              <Switch checked={!!c.career_gap} onChange={(v) => set("career_gap", v)} label="I have a career gap" />
              {c.career_gap && <TextArea className="mt-3" rows={2} value={s(c.career_gap_details)} onChange={(v) => set("career_gap_details", v)} placeholder="Gap period and reason" />}
            </div>
          </div>
          <h3 className="mb-3 mt-7 text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-400">Salary (Lakhs per annum)</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField label="Current CTC" value={s(c.current_ctc)} onChange={(v) => set("current_ctc", v.replace(/[^\d.]/g, ""))} suffix="LPA" inputMode="decimal" />
            <TextField label="Fixed" value={s(c.current_fixed_ctc)} onChange={(v) => set("current_fixed_ctc", v.replace(/[^\d.]/g, ""))} suffix="LPA" inputMode="decimal" />
            <TextField label="Variable" value={s(c.current_variable_ctc)} onChange={(v) => set("current_variable_ctc", v.replace(/[^\d.]/g, ""))} suffix="LPA" inputMode="decimal" />
            <TextField label="Expected CTC" value={s(c.expected_ctc)} onChange={(v) => set("expected_ctc", v.replace(/[^\d.]/g, ""))} suffix="LPA" inputMode="decimal" />
            <div className="flex items-end pb-2 sm:col-span-2">
              <Switch checked={!!c.ctc_negotiable} onChange={(v) => set("ctc_negotiable", v)} label="Expected CTC is negotiable" />
            </div>
          </div>
          <h3 className="mb-3 mt-7 text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-400">Notice & availability</h3>
          <div className={grid}>
            <SelectField label="Notice period" value={s(c.notice_period_days)} onChange={(v) => set("notice_period_days", v)} options={NOTICE_OPTIONS} />
            <div className="flex items-end pb-2">
              <Switch checked={!!c.serving_notice} onChange={(v) => set("serving_notice", v)} label="I'm serving notice" />
            </div>
            {c.serving_notice && <TextField label="Last working day" type="date" value={s(c.last_working_day)} onChange={(v) => set("last_working_day", v)} />}
            <TextField label="Available to join from" type="date" value={s(c.available_from)} onChange={(v) => set("available_from", v)} />
            <TextField label="Offers in hand" value={s(c.offers_in_hand)} onChange={(v) => set("offers_in_hand", v.replace(/\D/g, ""))} inputMode="numeric" />
            <div className="flex items-end pb-2">
              <Switch checked={!!c.notice_buyout} onChange={(v) => set("notice_buyout", v)} label="Notice buyout possible" />
            </div>
          </div>
        </Section>

        <Section id="skills" title="Skills" description="Add at least 3. Star up to 3 as your primary skills." onSave={saveSkills}
          saving={saving === "skills"}
          missing={missingSections.has("skills")}
          summary={
            skills.length ? (
              <ul className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                {skills.map((sk) => (
                  <li key={sk.name}>
                    <div className="mb-1 flex items-center justify-between text-[13px]">
                      <span className="flex items-center gap-1.5 font-medium text-ink-800">
                        {sk.is_primary && <Star className="h-3.5 w-3.5 fill-saffron text-saffron" aria-label="Primary skill" />}
                        {sk.name} <span className="text-[11px] font-normal text-ink-400">{sk.level}</span>
                      </span>
                      <span className="tabular text-ink-500">{sk.years ? `${sk.years} yrs` : "—"}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                      <div className={cn("h-full rounded-full", sk.is_primary ? "bg-jade" : "bg-ink-400")} style={{ width: `${Math.min(100, ((Number(sk.years) || 0.5) / Math.max(1, ...skills.map((x) => Number(x.years) || 0))) * 100)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : undefined
          }
        >
          <div className="flex gap-2">
            <input
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addSkill(newSkill);
                }
              }}
              list="pf-skills"
              placeholder="Type a skill and press Enter"
              className="field-input"
              aria-label="Add a skill"
            />
            <datalist id="pf-skills">
              {skillsMaster.map((x) => (
                <option key={x} value={x} />
              ))}
            </datalist>
            <button onClick={() => addSkill(newSkill)} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-line px-3 text-[13.5px] font-medium text-ink-700 hover:bg-surface-2">
              <Plus className="h-4 w-4" aria-hidden /> Add
            </button>
          </div>
          {skills.length > 0 && (
            <ul className="mt-4 space-y-2">
              {skills.map((sk, i) => (
                <li key={sk.name} className="flex flex-wrap items-center gap-2 rounded-xl border border-line px-3 py-2">
                  <button
                    onClick={() => setSkills((p) => p.map((x, j) => (j === i ? { ...x, is_primary: !x.is_primary } : x)))}
                    aria-pressed={sk.is_primary}
                    aria-label={sk.is_primary ? `Unmark ${sk.name} as primary` : `Mark ${sk.name} as primary`}
                    className={cn("rounded p-1", sk.is_primary ? "text-saffron" : "text-ink-300 hover:text-ink-500")}
                  >
                    <Star className={cn("h-4 w-4", sk.is_primary && "fill-current")} />
                  </button>
                  <span className="min-w-[120px] flex-1 text-[14px] font-medium text-ink-800">{sk.name}</span>
                  <input
                    value={sk.years}
                    onChange={(e) => setSkills((p) => p.map((x, j) => (j === i ? { ...x, years: e.target.value.replace(/[^\d.]/g, "") } : x)))}
                    placeholder="Years"
                    inputMode="decimal"
                    className="field-input h-9 w-20"
                    aria-label={`Years of ${sk.name}`}
                  />
                  <select
                    value={sk.level}
                    onChange={(e) => setSkills((p) => p.map((x, j) => (j === i ? { ...x, level: e.target.value } : x)))}
                    className="field-input h-9 w-36"
                    aria-label={`${sk.name} level`}
                  >
                    {SKILL_LEVELS.map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                  </select>
                  <button onClick={() => setSkills((p) => p.filter((_, j) => j !== i))} className="rounded p-1.5 text-ink-400 hover:text-red-600" aria-label={`Remove ${sk.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          id="experience"
          title="Work history"
          description="Most recent first."
          onSave={() => save("experience", { experiences: exps.filter((e) => s(e.company).trim()) })}
          saving={saving === "experience"}
          missing={missingSections.has("experience")}
          summary={
            exps.length ? (
              <ol className="relative space-y-4 border-l border-line pl-5">
                {exps.map((e, i) => (
                  <li key={i} className="relative">
                    <span className={cn("absolute -left-[26px] top-1 h-3 w-3 rounded-full ring-4 ring-surface", e.is_current ? "bg-jade" : "bg-line-strong")} aria-hidden />
                    <p className="text-[14px] font-semibold text-ink-900">{s(e.designation) || "—"}</p>
                    <p className="text-[13px] text-ink-600">{[s(e.company), s(e.location)].filter(Boolean).join(" · ")}</p>
                    <p className="text-[12px] text-ink-400">
                      {e.start_date ? formatDate(s(e.start_date), { month: "short", year: "numeric" }) : "?"} – {e.is_current ? "Present" : e.end_date ? formatDate(s(e.end_date), { month: "short", year: "numeric" }) : "?"}
                    </p>
                  </li>
                ))}
              </ol>
            ) : undefined
          }
        >
          <div className="space-y-4">
            {exps.map((e, i) => (
              <div key={i} className="rounded-2xl border border-line p-4">
                <div className={grid}>
                  <TextField label="Company" required value={s(e.company)} onChange={(v) => updateRow(setExps, i, "company", v)} />
                  <TextField label="Designation" value={s(e.designation)} onChange={(v) => updateRow(setExps, i, "designation", v)} />
                  <SelectField label="Employment type" value={s(e.employment_type)} onChange={(v) => updateRow(setExps, i, "employment_type", v)} options={EMPLOYMENT_TYPES} />
                  <TextField label="Location" value={s(e.location)} onChange={(v) => updateRow(setExps, i, "location", v)} />
                  <TextField label="Start date" type="date" value={s(e.start_date)} onChange={(v) => updateRow(setExps, i, "start_date", v)} />
                  {!e.is_current && <TextField label="End date" type="date" value={s(e.end_date)} onChange={(v) => updateRow(setExps, i, "end_date", v)} />}
                  <div className="flex items-end pb-2">
                    <Switch checked={!!e.is_current} onChange={(v) => updateRow(setExps, i, "is_current", v)} label="I currently work here" />
                  </div>
                  <TextArea className="sm:col-span-2" label="Responsibilities" rows={3} value={s(e.responsibilities)} onChange={(v) => updateRow(setExps, i, "responsibilities", v)} />
                </div>
                <div className="mt-3 flex justify-end">
                  <button onClick={() => removeRow(setExps, i)} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-500 hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" aria-hidden /> Remove
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={() => setExps((p) => [...p, { company: "", designation: "", employment_type: "", location: "", start_date: "", end_date: "", is_current: p.length === 0, responsibilities: "" }])}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line-strong px-4 py-2.5 text-[13.5px] font-medium text-ink-700 hover:border-jade/50"
            >
              <Plus className="h-4 w-4" aria-hidden /> Add a job
            </button>
          </div>
        </Section>

        <Section
          id="education"
          title="Education & certifications"
          onSave={() => save("education", { educations: edus, certifications: certs.filter((x) => s(x.name).trim()) })}
          saving={saving === "education"}
          missing={missingSections.has("education")}
          summary={
            edus.length || certs.length ? (
              <ul className="space-y-3">
                {edus.map((e, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-3 text-ink-500">
                      <GraduationCap className="h-4 w-4" aria-hidden />
                    </span>
                    <div>
                      <p className="text-[14px] font-semibold text-ink-900">{[s(e.degree), s(e.specialization)].filter(Boolean).join(", ") || s(e.level) || "—"}</p>
                      <p className="text-[13px] text-ink-600">{[s(e.institute), s(e.end_year)].filter(Boolean).join(" · ")}</p>
                    </div>
                  </li>
                ))}
                {certs.map((x, i) => (
                  <li key={`c${i}`} className="text-[13px] text-ink-600">
                    🏅 <b className="font-semibold text-ink-800">{s(x.name)}</b>
                    {x.issuer ? ` · ${s(x.issuer)}` : ""}
                  </li>
                ))}
              </ul>
            ) : undefined
          }
        >
          <div className="space-y-4">
            {edus.map((e, i) => (
              <div key={i} className="rounded-2xl border border-line p-4">
                <div className={grid}>
                  <SelectField label="Level" value={s(e.level)} onChange={(v) => updateRow(setEdus, i, "level", v)} options={EDU_LEVELS} />
                  <TextField label="Degree" value={s(e.degree)} onChange={(v) => updateRow(setEdus, i, "degree", v)} placeholder="e.g. B.Tech" />
                  <TextField label="Specialization" value={s(e.specialization)} onChange={(v) => updateRow(setEdus, i, "specialization", v)} />
                  <TextField label="Institute" value={s(e.institute)} onChange={(v) => updateRow(setEdus, i, "institute", v)} />
                  <TextField label="University / board" value={s(e.university)} onChange={(v) => updateRow(setEdus, i, "university", v)} />
                  <div className="grid grid-cols-2 gap-3">
                    <TextField label="Start year" value={s(e.start_year)} onChange={(v) => updateRow(setEdus, i, "start_year", v.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" />
                    <TextField label="End year" value={s(e.end_year)} onChange={(v) => updateRow(setEdus, i, "end_year", v.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" />
                  </div>
                  <TextField label="Grade" value={s(e.grade)} onChange={(v) => updateRow(setEdus, i, "grade", v)} />
                  <SelectField label="Grade type" value={s(e.grade_type)} onChange={(v) => updateRow(setEdus, i, "grade_type", v)} options={GRADE_TYPES} />
                </div>
                <div className="mt-3 flex justify-end">
                  <button onClick={() => removeRow(setEdus, i)} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-500 hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" aria-hidden /> Remove
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={() => setEdus((p) => [...p, { level: "", degree: "", specialization: "", institute: "", university: "", start_year: "", end_year: "", grade: "", grade_type: "" }])}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line-strong px-4 py-2.5 text-[13.5px] font-medium text-ink-700 hover:border-jade/50"
            >
              <Plus className="h-4 w-4" aria-hidden /> Add education
            </button>

            <h3 className="pt-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-400">Certifications</h3>
            {certs.map((e, i) => (
              <div key={i} className="rounded-2xl border border-line p-4">
                <div className={grid}>
                  <TextField label="Certification" value={s(e.name)} onChange={(v) => updateRow(setCerts, i, "name", v)} />
                  <TextField label="Issued by" value={s(e.issuer)} onChange={(v) => updateRow(setCerts, i, "issuer", v)} />
                  <TextField label="Issue date" type="date" value={s(e.issue_date)} onChange={(v) => updateRow(setCerts, i, "issue_date", v)} />
                  <TextField label="Expiry date" type="date" value={s(e.expiry_date)} onChange={(v) => updateRow(setCerts, i, "expiry_date", v)} />
                  <TextField className="sm:col-span-2" label="Credential URL" type="url" value={s(e.credential_url)} onChange={(v) => updateRow(setCerts, i, "credential_url", v)} />
                </div>
                <div className="mt-3 flex justify-end">
                  <button onClick={() => removeRow(setCerts, i)} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-500 hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" aria-hidden /> Remove
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={() => setCerts((p) => [...p, { name: "", issuer: "", issue_date: "", expiry_date: "", credential_url: "" }])}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line-strong px-4 py-2.5 text-[13.5px] font-medium text-ink-700 hover:border-jade/50"
            >
              <Plus className="h-4 w-4" aria-hidden /> Add certification
            </button>
          </div>
        </Section>

        <Section
          id="preferences"
          title="Job preferences"
          onSave={savePreferences}
          saving={saving === "preferences"}
          missing={missingSections.has("preferences")}
          summary={
            <View
              rows={[
                ["Preferred locations", c.preferred_locations.length ? <span className="flex flex-wrap gap-1">{c.preferred_locations.map((l) => <SkillChip key={l} name={l} />)}</span> : ""],
                ["Work mode", s(c.work_mode_preference)],
                ["Job type", s(c.job_type_preference)],
                ["Shift", s(c.shift_preference)],
                ["Relocation", c.willing_to_relocate ? "Willing to relocate" : ""],
                ["Travel", c.willing_to_travel ? "Willing to travel" : ""],
              ]}
            />
          }
        >
          <div className={grid}>
            <ChipInput className="sm:col-span-2" label="Preferred locations" value={c.preferred_locations} onChange={(v) => set("preferred_locations", v)} suggestions={CITIES} />
            <SelectField label="Work mode" value={s(c.work_mode_preference)} onChange={(v) => set("work_mode_preference", v)} options={WORK_MODES} />
            <SelectField label="Job type" value={s(c.job_type_preference)} onChange={(v) => set("job_type_preference", v)} options={JOB_TYPES} />
            <SelectField label="Shift" value={s(c.shift_preference)} onChange={(v) => set("shift_preference", v)} options={SHIFTS} />
            <div className="space-y-3 pt-1">
              <Switch checked={!!c.willing_to_relocate} onChange={(v) => set("willing_to_relocate", v)} label="Willing to relocate" />
              <Switch checked={!!c.willing_to_travel} onChange={(v) => set("willing_to_travel", v)} label="Willing to travel" />
            </div>
          </div>
        </Section>

        <DocumentsSection docs={me.documents} missingCv={me.completion.missing.some((m) => m.key === "cv")} />
      </div>
    </div>
  );
}

function DocumentsSection({ docs, missingCv }: { docs: MyProfile["documents"]; missingCv: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [otherType, setOtherType] = useState("Education Certificate");
  const cvRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const otherRef = useRef<HTMLInputElement>(null);
  const cv = docs.find((d) => d.doc_type === "Resume");
  const [preview, setPreview] = useState(false);
  const photo = docs.find((d) => d.doc_type === "Photo");
  const others = docs.filter((d) => d.doc_type !== "Resume" && d.doc_type !== "Photo");

  async function upload(file: File | undefined, docType: string) {
    if (!file) return;
    setBusy(docType);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("doc_type", docType);
    const res = await fetch("/api/portal/documents", { method: "POST", body: fd });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return toast.error(json.error ?? "Upload failed");
    toast.success(docType === "Resume" ? "CV updated" : "Uploaded");
    router.refresh();
  }

  async function remove(id: string) {
    setBusy(id);
    const res = await fetch(`/api/portal/documents/${id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return toast.error(json.error ?? "Couldn't remove");
    toast.success("Removed");
    router.refresh();
  }

  const DocRow = ({ d, removable }: { d: MyProfile["documents"][number]; removable?: boolean }) => (
    <li className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
      <FileText className="h-5 w-5 shrink-0 text-jade" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-ink-800">{d.file_name}</p>
        <p className="text-[12px] text-ink-400">
          {d.doc_type} · {fileSize(d.size_bytes)} · {formatDate(d.created_at)}
        </p>
      </div>
      <a href={`/api/portal/documents/${d.id}`} target="_blank" rel="noopener" className="rounded-lg p-2 text-ink-400 hover:bg-surface-3 hover:text-ink-800" aria-label={`View ${d.file_name}`}>
        <Eye className="h-4 w-4" />
      </a>
      {removable && (
        <button onClick={() => remove(d.id)} disabled={busy === d.id} className="rounded-lg p-2 text-ink-400 hover:text-red-600 disabled:opacity-50" aria-label={`Remove ${d.file_name}`}>
          {busy === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </button>
      )}
    </li>
  );

  return (
    <Section id="documents" title="CV & documents" description="PDF, Word or images · max 4 MB each" missing={missingCv}>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-[13px] font-semibold text-ink-700">CV / resume</h3>
          {cv ? (
            <div className="overflow-hidden rounded-2xl border border-line">
              <div className="flex items-center gap-3 bg-gradient-to-br from-jade-50 to-surface p-4">
                <span className="flex h-12 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-[10px] font-bold uppercase text-red-500 shadow-sm">{cv.file_name.split(".").pop()}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-ink-900">{cv.file_name}</p>
                  <p className="text-[12px] text-ink-500">
                    {fileSize(cv.size_bytes)} · uploaded {formatDate(cv.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-line p-3">
                {cv.file_name.toLowerCase().endsWith(".pdf") && (
                  <button onClick={() => setPreview((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12.5px] font-medium text-ink-700 hover:bg-surface-2">
                    {preview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} {preview ? "Hide preview" : "Preview"}
                  </button>
                )}
                <a href={`/api/portal/documents/${cv.id}?download`} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12.5px] font-medium text-ink-700 hover:bg-surface-2">
                  <FileText className="h-3.5 w-3.5" /> Download
                </a>
              </div>
              {preview && <iframe src={`/api/portal/documents/${cv.id}`} title="CV preview" className="h-[520px] w-full border-t border-line bg-white" />}
            </div>
          ) : (
            <p className="rounded-xl bg-saffron-50 px-3 py-2.5 text-[13.5px] text-saffron-800">No CV yet — you need one to apply.</p>
          )}
          <input ref={cvRef} type="file" accept=".pdf,.doc,.docx" className="sr-only" onChange={(e) => upload(e.target.files?.[0], "Resume")} aria-label="Upload CV" />
          <button
            onClick={() => cvRef.current?.click()}
            disabled={busy === "Resume"}
            className="mt-2 inline-flex items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-[13.5px] font-medium text-ink-700 hover:bg-surface-2 disabled:opacity-60"
          >
            {busy === "Resume" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            {cv ? "Replace CV" : "Upload CV"}
          </button>
        </div>
        <div>
          <h3 className="mb-2 text-[13px] font-semibold text-ink-700">Profile photo (optional)</h3>
          {photo ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/portal/documents/${photo.id}`} alt="Your profile photo" className="h-16 w-16 rounded-full object-cover ring-2 ring-line" />
              <button onClick={() => remove(photo.id)} className="text-[13px] font-medium text-ink-500 hover:text-red-600">
                Remove
              </button>
            </div>
          ) : (
            <p className="text-[13.5px] text-ink-500">Profiles with a photo feel more personal to employers.</p>
          )}
          <input ref={photoRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="sr-only" onChange={(e) => upload(e.target.files?.[0], "Photo")} aria-label="Upload photo" />
          <button
            onClick={() => photoRef.current?.click()}
            disabled={busy === "Photo"}
            className="mt-2 inline-flex items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-[13.5px] font-medium text-ink-700 hover:bg-surface-2 disabled:opacity-60"
          >
            {busy === "Photo" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
            {photo ? "Change photo" : "Upload photo"}
          </button>
        </div>
      </div>

      <h3 className="mb-2 mt-7 text-[13px] font-semibold text-ink-700">Certificates & other documents</h3>
      {others.length > 0 && (
        <ul className="mb-3 space-y-2">
          {others.map((d) => (
            <DocRow key={d.id} d={d} removable />
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <select value={otherType} onChange={(e) => setOtherType(e.target.value)} className="field-input h-10 w-auto" aria-label="Document type">
          <option>Education Certificate</option>
          <option>Experience Letter</option>
          <option>Other</option>
        </select>
        <input ref={otherRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" className="sr-only" onChange={(e) => upload(e.target.files?.[0], otherType)} aria-label="Upload document" />
        <button
          onClick={() => otherRef.current?.click()}
          disabled={busy === otherType}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-line px-3.5 text-[13.5px] font-medium text-ink-700 hover:bg-surface-2 disabled:opacity-60"
        >
          {busy === otherType ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
          Upload document
        </button>
      </div>
    </Section>
  );
}
