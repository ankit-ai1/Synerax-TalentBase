"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, FileText, Image as ImageIcon, Loader2, Plus, Star, Trash2, UploadCloud } from "lucide-react";
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
import type { MyProfile } from "@/lib/portal-types";
import { ChipInput, SelectField, Switch, TextArea, TextField } from "@/components/ui/fields";
import { JobAlertsToggle, OpenToWorkToggle } from "@/components/portal/profile-toggles";
import { cn, fileSize, formatDate, friendlyError } from "@/lib/utils";

type Row = Record<string, string | boolean>;
const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const b = (v: unknown, d = false) => (typeof v === "boolean" ? v : d);
const arr = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);

const SECTIONS = [
  ["basic", "Basic details"],
  ["contact", "Contact & address"],
  ["professional", "Current job, salary & notice"],
  ["skills", "Skills"],
  ["experience", "Work history"],
  ["education", "Education & certifications"],
  ["preferences", "Job preferences"],
  ["documents", "CV & documents"],
] as const;

function Section({
  id,
  title,
  description,
  children,
  onSave,
  saving,
  missing,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  onSave?: () => void;
  saving?: boolean;
  missing?: boolean;
}) {
  return (
    <section id={id} className="scroll-mt-28 rounded-3xl border border-line bg-surface shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
        <div>
          <h2 className="flex items-center gap-2 text-[16px] font-semibold text-ink-900">
            {title}
            {missing && <span className="rounded-full bg-saffron-50 px-2 py-0.5 text-[11px] font-semibold text-saffron-800">Incomplete</span>}
          </h2>
          {description && <p className="mt-0.5 text-[13px] text-ink-500">{description}</p>}
        </div>
        {onSave && (
          <button
            onClick={onSave}
            disabled={saving}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-jade px-4 text-[13.5px] font-semibold text-white hover:brightness-110 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
            Save
          </button>
        )}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
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
    if (error) return toast.error(friendlyError(error.message));
    const pct = (data as { percent?: number } | null)?.percent;
    toast.success(pct !== undefined ? `Saved — profile ${pct}% complete` : "Saved");
    router.refresh();
  }

  const pick = (keys: string[]) => Object.fromEntries(keys.map((k) => [k, c[k as keyof typeof c]]));

  const saveBasic = () => {
    if (!s(c.first_name).trim()) return toast.error("First name is required");
    save("basic", { candidate: pick(["first_name", "middle_name", "last_name", "gender", "dob", "marital_status", "nationality", "headline", "summary", "languages"]) });
  };
  const saveContact = () => {
    const phone = s(c.phone).replace(/[\s-]/g, "");
    if (phone && !/^[6-9]\d{9}$/.test(phone)) return toast.error("Enter a valid 10-digit mobile number");
    save("contact", {
      candidate: { ...pick(["alt_phone", "whatsapp", "linkedin_url", "github_url", "portfolio_url", "current_address", "current_city", "current_state", "current_pincode"]), phone },
    });
  };
  const saveProfessional = () => {
    if (c.serving_notice && !c.last_working_day) return toast.error("Please add your last working day");
    save("professional", {
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
    save("skills", { skills: skills.map((x) => ({ name: x.name, years: x.years, level: x.level, is_primary: x.is_primary })) });
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

  const updateRow = (setter: React.Dispatch<React.SetStateAction<Row[]>>, i: number, k: string, v: string | boolean) =>
    setter((p) => p.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const removeRow = (setter: React.Dispatch<React.SetStateAction<Row[]>>, i: number) => setter((p) => p.filter((_, j) => j !== i));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      {/* section nav */}
      <nav className="hidden lg:block" aria-label="Profile sections">
        <div className="sticky top-24 space-y-4">
          <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
            <p className="text-[12px] font-medium text-ink-400">Profile strength</p>
            <p className="mt-1 text-[26px] font-semibold tabular text-ink-900">{me.completion.percent}%</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-3">
              <div className={cn("h-full rounded-full", me.completion.percent >= 80 ? "bg-jade" : "bg-saffron")} style={{ width: `${me.completion.percent}%` }} />
            </div>
          </div>
          <ul className="space-y-0.5">
            {SECTIONS.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="flex items-center justify-between rounded-lg px-3 py-2 text-[13.5px] text-ink-600 hover:bg-surface-3 hover:text-ink-900">
                  {label}
                  {missingSections.has(id) && <span className="h-2 w-2 rounded-full bg-saffron" aria-label="incomplete" />}
                </a>
              </li>
            ))}
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

        <Section id="basic" title="Basic details" onSave={saveBasic} saving={saving === "basic"} missing={missingSections.has("basic")}>
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

        <Section id="contact" title="Contact & address" onSave={saveContact} saving={saving === "contact"} missing={missingSections.has("contact")}>
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

        <Section id="professional" title="Current job, salary & notice" onSave={saveProfessional} saving={saving === "professional"} missing={missingSections.has("professional")}>
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

        <Section id="skills" title="Skills" description="Add at least 3. Star up to 3 as your primary skills." onSave={saveSkills} saving={saving === "skills"} missing={missingSections.has("skills")}>
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

        <Section id="preferences" title="Job preferences" onSave={savePreferences} saving={saving === "preferences"} missing={missingSections.has("preferences")}>
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
          {cv ? <ul>{<DocRow d={cv} />}</ul> : <p className="rounded-xl bg-saffron-50 px-3 py-2.5 text-[13.5px] text-saffron-800">No CV yet — you need one to apply.</p>}
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
