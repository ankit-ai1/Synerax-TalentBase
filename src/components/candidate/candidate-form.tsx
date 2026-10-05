"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calculator, FileUp, Plus, Trash2, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ChipInput, SelectField, Switch, TextArea, TextField } from "@/components/ui/fields";
import { StarInput } from "@/components/ui/interactive";
import { RolePicker, SkillPicker } from "./skill-picker";
import {
  emptyCertification,
  emptyEducation,
  emptyExperience,
  emptyProject,
  emptyReference,
} from "./defaults";
import {
  BGV,
  CITIES,
  DOC_TYPES,
  EDU_LEVELS,
  EDU_MODES,
  EMPLOYMENT_TYPES,
  GENDERS,
  GRADE_TYPES,
  INDIAN_STATES,
  JOB_TYPES,
  LANGUAGES,
  MARITAL,
  NOTICE_OPTIONS,
  QUALIFICATIONS,
  SHIFTS,
  SOURCES,
  STATUSES,
  WORK_MODES,
} from "@/lib/constants";
import { cn, fileSize, friendlyError } from "@/lib/utils";
import type { CandidateFields, CandidateFormData, JobRole, Skill } from "@/lib/types";

const SECTIONS = [
  { id: "personal", label: "Personal details" },
  { id: "contact", label: "Contact & address" },
  { id: "professional", label: "Current job" },
  { id: "compensation", label: "Salary & notice" },
  { id: "skills", label: "Skills & roles" },
  { id: "experience", label: "Work history" },
  { id: "education", label: "Education" },
  { id: "certs", label: "Certifications & projects" },
  { id: "preferences", label: "Job preferences" },
  { id: "compliance", label: "IDs & verification" },
  { id: "pipeline", label: "Status & source" },
  { id: "documents", label: "Documents" },
] as const;

type QueuedFile = { file: File; doc_type: string };

export function CandidateForm({
  initial,
  skills: initialSkills,
  roles: initialRoles,
  mode,
}: {
  initial: CandidateFormData;
  skills: Skill[];
  roles: JobRole[];
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [data, setData] = useState<CandidateFormData>(initial);
  const [skills, setSkills] = useState(initialSkills);
  const [roles, setRoles] = useState(initialRoles);
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [active, setActive] = useState<string>("personal");
  const [sameAddress, setSameAddress] = useState(false);
  const dirty = useRef(false);

  const c = data.candidate;
  const set = <K extends keyof CandidateFields>(k: K, v: CandidateFields[K]) => {
    dirty.current = true;
    setData((d) => ({ ...d, candidate: { ...d.candidate, [k]: v } }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };
  const setList = <K extends Exclude<keyof CandidateFormData, "id" | "candidate">>(k: K, v: CandidateFormData[K]) => {
    dirty.current = true;
    setData((d) => ({ ...d, [k]: v }));
  };

  // unsaved changes warning
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, []);

  // scroll-spy
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: "-20% 0px -65% 0px" }
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (sameAddress) {
      setData((d) => ({
        ...d,
        candidate: {
          ...d.candidate,
          permanent_address: d.candidate.current_address,
          permanent_city: d.candidate.current_city,
          permanent_state: d.candidate.current_state,
          permanent_pincode: d.candidate.current_pincode,
        },
      }));
    }
  }, [sameAddress, c.current_address, c.current_city, c.current_state, c.current_pincode]);

  // section completion (UI guidance)
  const completion = useMemo(() => {
    const filled = (...v: (string | boolean | unknown[])[]) =>
      v.filter((x) => (Array.isArray(x) ? x.length > 0 : typeof x === "boolean" ? true : String(x).trim() !== "")).length / v.length;
    return {
      personal: filled(c.first_name, c.last_name, c.gender, c.dob, c.languages),
      contact: filled(c.email, c.phone, c.current_city, c.current_state),
      professional: filled(c.total_experience, c.headline, ...(c.currently_employed ? [c.current_company, c.current_designation] : [])),
      compensation: filled(c.current_ctc, c.expected_ctc, c.notice_period_days),
      skills: filled(data.skills, data.job_roles),
      experience: filled(data.experiences.filter((e) => e.company.trim())),
      education: filled(data.educations.filter((e) => e.degree.trim() || e.institute.trim()), c.highest_qualification),
      certs: data.certifications.length || data.projects.length ? 1 : 0,
      preferences: filled(c.preferred_locations, c.work_mode_preference, c.job_type_preference),
      compliance: filled(c.pan_number, c.bgv_status),
      pipeline: filled(c.status, c.source),
      documents: files.length || mode === "edit" ? 1 : 0,
    } as Record<string, number>;
  }, [c, data, files.length, mode]);

  const overall = Math.round(
    (Object.values(completion).reduce((a, b) => a + b, 0) / Object.keys(completion).length) * 100
  );

  function validate() {
    const e: Record<string, string> = {};
    if (!c.first_name.trim()) e.first_name = "First name is required";
    if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email.trim())) e.email = "Email is not in a valid format";
    if (c.alt_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.alt_email.trim())) e.alt_email = "Email is not in a valid format";
    const phoneOk = (p: string) => !p || /^\+?[0-9\s-]{10,15}$/.test(p.trim());
    if (!phoneOk(c.phone)) e.phone = "Enter a 10-digit number";
    if (!phoneOk(c.alt_phone)) e.alt_phone = "Invalid number";
    if (!c.email.trim() && !c.phone.trim()) e.phone = "At least one of email or phone is required";
    if (c.dob && new Date(c.dob) > new Date()) e.dob = "DOB can't be in the future";
    if (c.pan_number && !/^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/.test(c.pan_number.trim())) e.pan_number = "PAN format: ABCDE1234F";
    if (c.current_pincode && !/^[0-9]{6}$/.test(c.current_pincode.trim())) e.current_pincode = "6 digit pincode";
    if (c.uan_number && !/^[0-9]{12}$/.test(c.uan_number.trim())) e.uan_number = "UAN must be 12 digits";
    if (Number(c.relevant_experience || 0) > Number(c.total_experience || 0))
      e.relevant_experience = "Relevant experience can't exceed total experience";
    setErrors(e);
    if (Object.keys(e).length) {
      const first = Object.keys(e)[0];
      toast.error(e[first]);
      document.getElementById(`f-${first}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    return true;
  }

  async function save() {
    if (!validate()) return;
    setSaving(true);
    const supabase = createClient();
    const payload = {
      id: data.id ?? null,
      candidate: c,
      skills: data.skills.map(({ skill_id, years, level, is_primary }) => ({ skill_id, years, level, is_primary })),
      job_roles: data.job_roles.map(({ job_role_id, is_primary }) => ({ job_role_id, is_primary })),
      experiences: data.experiences,
      educations: data.educations,
      certifications: data.certifications,
      projects: data.projects,
      references: data.references,
    };
    const { data: id, error } = await supabase.rpc("save_candidate", { p: payload });
    if (error || !id) {
      setSaving(false);
      toast.error(friendlyError(error?.message));
      return;
    }

    let failed = 0;
    for (const f of files) {
      const fd = new FormData();
      fd.append("file", f.file);
      fd.append("candidate_id", id as string);
      fd.append("doc_type", f.doc_type);
      const res = await fetch("/api/documents/upload", { method: "POST", body: fd });
      if (!res.ok) failed++;
    }
    if (failed) toast.error(`${failed} file(s) failed to upload — please retry from the profile page.`);

    dirty.current = false;
    toast.success(mode === "create" ? "Candidate added" : "Changes saved");
    router.push(`/candidates/${id}`);
    router.refresh();
  }

  function calcExperience() {
    let months = 0;
    for (const e of data.experiences) {
      if (!e.start_date) continue;
      const s = new Date(e.start_date);
      const end = e.is_current || !e.end_date ? new Date() : new Date(e.end_date);
      months += Math.max(0, (end.getFullYear() - s.getFullYear()) * 12 + end.getMonth() - s.getMonth());
    }
    if (!months) {
      toast.message("Add start dates in work history, then calculate.");
      return;
    }
    set("total_experience", (Math.round((months / 12) * 10) / 10).toString());
    toast.success(`Total experience set to ${(months / 12).toFixed(1)} years`);
  }

  const err = (k: string) => (errors[k] ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors[k]}</p> : null);

  return (
    <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
      {/* section nav */}
      <nav className="hidden lg:block" aria-label="Form sections">
        <div className="sticky top-8 space-y-0.5">
          {SECTIONS.map((s) => {
            const pct = completion[s.id] ?? 0;
            return (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                  active === s.id ? "bg-surface font-medium text-ink-800 shadow-card" : "text-ink-400 hover:text-ink-800"
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full border",
                    pct >= 1 ? "border-jade bg-jade" : pct > 0 ? "border-saffron bg-saffron-100" : "border-ink-300"
                  )}
                />
                {s.label}
              </a>
            );
          })}
          <div className="mt-5 rounded-lg border border-line bg-surface p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-ink-400">Profile complete</span>
              <span className="text-sm font-semibold tabular text-ink-800">{overall}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-canvas">
              <div className="h-full rounded-full bg-jade transition-all" style={{ width: `${overall}%` }} />
            </div>
          </div>
        </div>
      </nav>

      <form
        className="min-w-0 space-y-6 pb-28"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        noValidate
      >
        {/* PERSONAL */}
        <Section id="personal" title="Personal details" description="Basic identity details.">
          <Grid>
            <div id="f-first_name">
              <TextField label="First name" required value={c.first_name} onChange={(v) => set("first_name", v)} />
              {err("first_name")}
            </div>
            <TextField label="Middle name" value={c.middle_name} onChange={(v) => set("middle_name", v)} />
            <TextField label="Last name" value={c.last_name} onChange={(v) => set("last_name", v)} />
            <SelectField label="Gender" value={c.gender} onChange={(v) => set("gender", v)} options={GENDERS} />
            <div id="f-dob">
              <TextField label="Date of birth" type="date" value={c.dob} onChange={(v) => set("dob", v)} max={new Date().toISOString().slice(0, 10)} />
              {err("dob")}
            </div>
            <SelectField label="Marital status" value={c.marital_status} onChange={(v) => set("marital_status", v)} options={MARITAL} />
            <TextField label="Father's name" value={c.father_name} onChange={(v) => set("father_name", v)} />
            <TextField label="Nationality" value={c.nationality} onChange={(v) => set("nationality", v)} />
            <ChipInput label="Languages known" value={c.languages} onChange={(v) => set("languages", v)} suggestions={LANGUAGES} />
          </Grid>
        </Section>

        {/* CONTACT */}
        <Section id="contact" title="Contact & address">
          <Grid>
            <div id="f-email">
              <TextField label="Email" type="email" value={c.email} onChange={(v) => set("email", v)} placeholder="name@gmail.com" />
              {err("email")}
            </div>
            <div id="f-alt_email">
              <TextField label="Alternate email" type="email" value={c.alt_email} onChange={(v) => set("alt_email", v)} />
              {err("alt_email")}
            </div>
            <div id="f-phone">
              <TextField label="Phone" type="tel" value={c.phone} onChange={(v) => set("phone", v)} placeholder="98XXXXXXXX" />
              {err("phone")}
            </div>
            <div id="f-alt_phone">
              <TextField label="Alternate phone" type="tel" value={c.alt_phone} onChange={(v) => set("alt_phone", v)} />
              {err("alt_phone")}
            </div>
            <div>
              <TextField label="WhatsApp" type="tel" value={c.whatsapp} onChange={(v) => set("whatsapp", v)} />
              {c.phone && !c.whatsapp && (
                <button type="button" className="mt-1 text-xs font-medium text-jade-700 hover:underline" onClick={() => set("whatsapp", c.phone)}>
                  Phone number is also WhatsApp
                </button>
              )}
            </div>
            <TextField label="LinkedIn URL" type="url" value={c.linkedin_url} onChange={(v) => set("linkedin_url", v)} placeholder="linkedin.com/in/…" />
            <TextField label="GitHub URL" type="url" value={c.github_url} onChange={(v) => set("github_url", v)} />
            <TextField label="Portfolio / website" type="url" value={c.portfolio_url} onChange={(v) => set("portfolio_url", v)} />
          </Grid>

          <SubHead>Current address</SubHead>
          <Grid>
            <TextArea className="sm:col-span-2 lg:col-span-3" label="Address" rows={2} value={c.current_address} onChange={(v) => set("current_address", v)} />
            <CityField label="City" value={c.current_city} onChange={(v) => set("current_city", v)} />
            <SelectField label="State" value={c.current_state} onChange={(v) => set("current_state", v)} options={INDIAN_STATES} />
            <div id="f-current_pincode">
              <TextField label="Pincode" inputMode="numeric" maxLength={6} value={c.current_pincode} onChange={(v) => set("current_pincode", v)} />
              {err("current_pincode")}
            </div>
          </Grid>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-ink-700">Permanent address</h4>
            <Switch checked={sameAddress} onChange={setSameAddress} label="Same as current address" />
          </div>
          {!sameAddress && (
            <div className="mt-3">
              <Grid>
                <TextArea className="sm:col-span-2 lg:col-span-3" label="Address" rows={2} value={c.permanent_address} onChange={(v) => set("permanent_address", v)} />
                <CityField label="City" value={c.permanent_city} onChange={(v) => set("permanent_city", v)} />
                <SelectField label="State" value={c.permanent_state} onChange={(v) => set("permanent_state", v)} options={INDIAN_STATES} />
                <TextField label="Pincode" inputMode="numeric" maxLength={6} value={c.permanent_pincode} onChange={(v) => set("permanent_pincode", v)} />
              </Grid>
            </div>
          )}
        </Section>

        {/* PROFESSIONAL */}
        <Section id="professional" title="Current job" description="Where they currently work and how much experience they have.">
          <TextField
            label="Profile headline"
            value={c.headline}
            onChange={(v) => set("headline", v)}
            placeholder="e.g. Senior Java Developer with 6 years in banking domain"
          />
          <div className="mt-4">
            <TextArea label="Summary" rows={4} value={c.summary} onChange={(v) => set("summary", v)} placeholder="A short profile summary of the candidate…" />
          </div>
          <div className="mt-4">
            <Switch checked={c.currently_employed} onChange={(v) => set("currently_employed", v)} label="Currently employed" />
          </div>
          <div className="mt-4">
            <Grid>
              <div>
                <TextField label="Total experience" type="number" min={0} step={0.1} suffix="years" value={c.total_experience} onChange={(v) => set("total_experience", v)} />
                <button type="button" onClick={calcExperience} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-jade-700 hover:underline">
                  <Calculator className="h-3 w-3" /> Calculate from work history
                </button>
              </div>
              <div id="f-relevant_experience">
                <TextField label="Relevant experience" type="number" min={0} step={0.1} suffix="years" value={c.relevant_experience} onChange={(v) => set("relevant_experience", v)} />
                {err("relevant_experience")}
              </div>
              <SelectField label="Highest qualification" value={c.highest_qualification} onChange={(v) => set("highest_qualification", v)} options={QUALIFICATIONS} />
              {c.currently_employed && (
                <>
                  <TextField label="Current company" value={c.current_company} onChange={(v) => set("current_company", v)} />
                  <TextField label="Current designation" value={c.current_designation} onChange={(v) => set("current_designation", v)} />
                  <SelectField label="Employment type" value={c.current_employment_type} onChange={(v) => set("current_employment_type", v)} options={EMPLOYMENT_TYPES} />
                  <TextField label="Payroll company" hint="Name of the third-party payroll company, if any" value={c.current_payroll} onChange={(v) => set("current_payroll", v)} />
                </>
              )}
              <TextField label="Industry" value={c.industry} onChange={(v) => set("industry", v)} placeholder="IT Services, BFSI, Healthcare…" />
              <TextField label="Functional area" value={c.functional_area} onChange={(v) => set("functional_area", v)} placeholder="Software Development, Sales…" />
            </Grid>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <TextArea label="Reason for job change" rows={2} value={c.reason_for_change} onChange={(v) => set("reason_for_change", v)} />
            <div className="space-y-3">
              <Switch checked={c.career_gap} onChange={(v) => set("career_gap", v)} label="Has a career gap" />
              {c.career_gap && (
                <TextArea rows={2} value={c.career_gap_details} onChange={(v) => set("career_gap_details", v)} placeholder="Gap period and reason…" />
              )}
            </div>
          </div>
        </Section>

        {/* COMPENSATION */}
        <Section id="compensation" title="Salary & notice" description="All amounts in Lakhs per annum (LPA).">
          <Grid>
            <TextField label="Current CTC" type="number" min={0} step={0.01} prefix="₹" suffix="LPA" value={c.current_ctc} onChange={(v) => set("current_ctc", v)} />
            <TextField label="Fixed component" type="number" min={0} step={0.01} prefix="₹" suffix="LPA" value={c.current_fixed_ctc} onChange={(v) => set("current_fixed_ctc", v)} />
            <TextField label="Variable component" type="number" min={0} step={0.01} prefix="₹" suffix="LPA" value={c.current_variable_ctc} onChange={(v) => set("current_variable_ctc", v)} />
            <div>
              <TextField label="Expected CTC" type="number" min={0} step={0.01} prefix="₹" suffix="LPA" value={c.expected_ctc} onChange={(v) => set("expected_ctc", v)} />
              {c.current_ctc && c.expected_ctc && Number(c.current_ctc) > 0 && (
                <p className="mt-1 text-xs text-ink-400">
                  Hike: <span className="font-medium text-ink-700">{Math.round(((Number(c.expected_ctc) - Number(c.current_ctc)) / Number(c.current_ctc)) * 100)}%</span>
                </p>
              )}
            </div>
            <TextField label="Last hike date" type="date" value={c.last_hike_date} onChange={(v) => set("last_hike_date", v)} />
            <TextField label="Last hike" type="number" min={0} suffix="%" value={c.last_hike_percent} onChange={(v) => set("last_hike_percent", v)} />
          </Grid>
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
            <Switch checked={c.ctc_negotiable} onChange={(v) => set("ctc_negotiable", v)} label="Expected CTC is negotiable" />
          </div>

          <SubHead>Notice period & joining</SubHead>
          <Grid>
            <SelectField label="Notice period" value={c.notice_period_days} onChange={(v) => set("notice_period_days", v)} options={NOTICE_OPTIONS} />
            <div className="flex items-end pb-2">
              <Switch checked={c.serving_notice} onChange={(v) => set("serving_notice", v)} label="Serving notice" />
            </div>
            <div className="flex items-end pb-2">
              <Switch checked={c.notice_buyout} onChange={(v) => set("notice_buyout", v)} label="Notice buyout possible" />
            </div>
            <TextField
              label="Last working day"
              type="date"
              value={c.last_working_day}
              onChange={(v) => set("last_working_day", v)}
              hint={c.serving_notice ? "Enter the LWD if serving notice" : undefined}
            />
            <TextField label="Available to join (date)" type="date" value={c.available_from} onChange={(v) => set("available_from", v)} />
            <TextField label="Offers in hand" type="number" min={0} value={c.offers_in_hand} onChange={(v) => set("offers_in_hand", v)} />
          </Grid>
          {Number(c.offers_in_hand) > 0 && (
            <div className="mt-4">
              <TextArea label="Offer details" rows={2} value={c.offer_details} onChange={(v) => set("offer_details", v)} placeholder="Company, CTC, joining date…" />
            </div>
          )}
        </Section>

        {/* SKILLS */}
        <Section id="skills" title="Skills & roles" description="Search relies on these the most — fill in the experience for every skill.">
          <SkillPicker value={data.skills} onChange={(v) => setList("skills", v)} skills={skills} onSkillsChange={setSkills} />
          <SubHead>Suitable job roles</SubHead>
          <RolePicker value={data.job_roles} onChange={(v) => setList("job_roles", v)} roles={roles} onRolesChange={setRoles} />
        </Section>

        {/* EXPERIENCE */}
        <Section id="experience" title="Work history" description="Most recent company first.">
          <RepeatList
            items={data.experiences}
            onChange={(v) => setList("experiences", v)}
            make={emptyExperience}
            addLabel="Add company"
            title={(e, i) => e.company || `Company ${i + 1}`}
            render={(e, up) => (
              <>
                <Grid>
                  <TextField label="Company" value={e.company} onChange={(v) => up({ company: v })} />
                  <TextField label="Designation" value={e.designation} onChange={(v) => up({ designation: v })} />
                  <SelectField label="Employment type" value={e.employment_type} onChange={(v) => up({ employment_type: v })} options={EMPLOYMENT_TYPES} />
                  <TextField label="Location" value={e.location} onChange={(v) => up({ location: v })} />
                  <TextField label="From" type="date" value={e.start_date} onChange={(v) => up({ start_date: v })} />
                  {e.is_current ? (
                    <div className="flex items-end pb-2 text-sm text-ink-400">Present</div>
                  ) : (
                    <TextField label="To" type="date" value={e.end_date} onChange={(v) => up({ end_date: v })} />
                  )}
                  <TextField label="CTC at this job" type="number" min={0} step={0.01} prefix="₹" suffix="LPA" value={e.ctc} onChange={(v) => up({ ctc: v })} />
                  <div className="flex items-end pb-2">
                    <Switch checked={e.is_current} onChange={(v) => up({ is_current: v, end_date: v ? "" : e.end_date })} label="This is the current job" />
                  </div>
                </Grid>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <TextArea label="Responsibilities" rows={3} value={e.responsibilities} onChange={(v) => up({ responsibilities: v })} />
                  <TextArea label="Reason for leaving" rows={3} value={e.reason_for_leaving} onChange={(v) => up({ reason_for_leaving: v })} />
                </div>
              </>
            )}
          />
        </Section>

        {/* EDUCATION */}
        <Section id="education" title="Education">
          <RepeatList
            items={data.educations}
            onChange={(v) => setList("educations", v)}
            make={emptyEducation}
            addLabel="Add qualification"
            title={(e, i) => [e.level, e.degree].filter(Boolean).join(" — ") || `Qualification ${i + 1}`}
            render={(e, up) => (
              <Grid>
                <SelectField label="Level" value={e.level} onChange={(v) => up({ level: v })} options={EDU_LEVELS} />
                <TextField label="Degree / board" value={e.degree} onChange={(v) => up({ degree: v })} placeholder="B.Tech, MBA, CBSE…" />
                <TextField label="Specialization" value={e.specialization} onChange={(v) => up({ specialization: v })} />
                <TextField label="College / school" value={e.institute} onChange={(v) => up({ institute: v })} />
                <TextField label="University" value={e.university} onChange={(v) => up({ university: v })} />
                <SelectField label="Mode" value={e.education_mode} onChange={(v) => up({ education_mode: v })} options={EDU_MODES} />
                <TextField label="Start year" type="number" min={1960} max={2100} value={e.start_year} onChange={(v) => up({ start_year: v })} />
                <TextField label="Passing year" type="number" min={1960} max={2100} value={e.end_year} onChange={(v) => up({ end_year: v })} />
                <div className="grid grid-cols-2 gap-2">
                  <TextField label="Marks" value={e.grade} onChange={(v) => up({ grade: v })} />
                  <SelectField label="Type" value={e.grade_type} onChange={(v) => up({ grade_type: v })} options={GRADE_TYPES} />
                </div>
              </Grid>
            )}
          />
        </Section>

        {/* CERTS & PROJECTS */}
        <Section id="certs" title="Certifications & projects">
          <RepeatList
            items={data.certifications}
            onChange={(v) => setList("certifications", v)}
            make={emptyCertification}
            addLabel="Add certification"
            title={(e, i) => e.name || `Certification ${i + 1}`}
            render={(e, up) => (
              <Grid>
                <TextField label="Certification" value={e.name} onChange={(v) => up({ name: v })} placeholder="AWS Solutions Architect…" />
                <TextField label="Issued by" value={e.issuer} onChange={(v) => up({ issuer: v })} />
                <TextField label="Credential ID" value={e.credential_id} onChange={(v) => up({ credential_id: v })} />
                <TextField label="Issue date" type="date" value={e.issue_date} onChange={(v) => up({ issue_date: v })} />
                <TextField label="Expiry date" type="date" value={e.expiry_date} onChange={(v) => up({ expiry_date: v })} />
                <TextField label="Verify URL" type="url" value={e.credential_url} onChange={(v) => up({ credential_url: v })} />
              </Grid>
            )}
          />
          <SubHead>Projects</SubHead>
          <RepeatList
            items={data.projects}
            onChange={(v) => setList("projects", v)}
            make={emptyProject}
            addLabel="Add project"
            title={(e, i) => e.title || `Project ${i + 1}`}
            render={(e, up) => (
              <>
                <Grid>
                  <TextField label="Project title" value={e.title} onChange={(v) => up({ title: v })} />
                  <TextField label="Client" value={e.client} onChange={(v) => up({ client: v })} />
                  <TextField label="Role" value={e.role} onChange={(v) => up({ role: v })} />
                  <TextField label="Technologies" value={e.technologies} onChange={(v) => up({ technologies: v })} placeholder="React, Node, AWS" />
                  <TextField label="From" type="date" value={e.start_date} onChange={(v) => up({ start_date: v })} />
                  <TextField label="To" type="date" value={e.end_date} onChange={(v) => up({ end_date: v })} />
                </Grid>
                <TextArea className="mt-4" label="Description" rows={2} value={e.description} onChange={(v) => up({ description: v })} />
              </>
            )}
          />
        </Section>

        {/* PREFERENCES */}
        <Section id="preferences" title="Job preferences">
          <Grid>
            <ChipInput className="sm:col-span-2 lg:col-span-3" label="Preferred locations" value={c.preferred_locations} onChange={(v) => set("preferred_locations", v)} suggestions={CITIES} />
            <SelectField label="Work mode" value={c.work_mode_preference} onChange={(v) => set("work_mode_preference", v)} options={WORK_MODES} />
            <SelectField label="Job type" value={c.job_type_preference} onChange={(v) => set("job_type_preference", v)} options={JOB_TYPES} />
            <SelectField label="Shift" value={c.shift_preference} onChange={(v) => set("shift_preference", v)} options={SHIFTS} />
          </Grid>
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
            <Switch checked={c.willing_to_relocate} onChange={(v) => set("willing_to_relocate", v)} label="Willing to relocate" />
            <Switch checked={c.willing_to_travel} onChange={(v) => set("willing_to_travel", v)} label="Willing to travel" />
          </div>
        </Section>

        {/* COMPLIANCE */}
        <Section id="compliance" title="IDs & verification" description="Sensitive data — shown masked on the profile page.">
          <Grid>
            <div id="f-pan_number">
              <TextField label="PAN" maxLength={10} value={c.pan_number} onChange={(v) => set("pan_number", v.toUpperCase())} placeholder="ABCDE1234F" />
              {err("pan_number")}
            </div>
            <div id="f-uan_number">
              <TextField label="UAN (PF)" inputMode="numeric" maxLength={12} value={c.uan_number} onChange={(v) => set("uan_number", v)} />
              {err("uan_number")}
            </div>
            <SelectField label="Background verification" value={c.bgv_status} onChange={(v) => set("bgv_status", v)} options={BGV} />
            <TextField label="Passport number" value={c.passport_number} onChange={(v) => set("passport_number", v.toUpperCase())} />
            <TextField label="Passport valid till" type="date" value={c.passport_valid_till} onChange={(v) => set("passport_valid_till", v)} />
            <TextField label="Visa status" value={c.visa_status} onChange={(v) => set("visa_status", v)} placeholder="e.g. US B1 valid till 2028" />
          </Grid>
        </Section>

        {/* PIPELINE */}
        <Section id="pipeline" title="Status & source">
          <Grid>
            <SelectField label="Status" value={c.status} onChange={(v) => set("status", v || "New")} options={STATUSES} placeholder="New" />
            <SelectField label="Source" value={c.source} onChange={(v) => set("source", v)} options={SOURCES} />
            {(c.source === "Referral" || c.referred_by) && (
              <TextField label="Referred by" value={c.referred_by} onChange={(v) => set("referred_by", v)} />
            )}
            <div>
              <span className="field-label">Internal rating</span>
              <div className="flex h-10 items-center">
                <StarInput value={c.rating ? Number(c.rating) : null} onChange={(v) => set("rating", v ? String(v) : "")} size={20} />
              </div>
            </div>
            <ChipInput
              className="sm:col-span-2"
              label="Tags"
              value={c.tags}
              onChange={(v) => set("tags", v)}
              suggestions={["Urgent", "Strong communication", "Client-ready", "Night shift OK", "Immediate joiner", "Fresher"]}
              hint="Custom labels — you can filter by them in search"
            />
          </Grid>
          <SubHead>References</SubHead>
          <RepeatList
            items={data.references}
            onChange={(v) => setList("references", v)}
            make={emptyReference}
            addLabel="Add reference"
            title={(e, i) => e.name || `Reference ${i + 1}`}
            render={(e, up) => (
              <Grid>
                <TextField label="Name" value={e.name} onChange={(v) => up({ name: v })} />
                <TextField label="Company" value={e.company} onChange={(v) => up({ company: v })} />
                <TextField label="Designation" value={e.designation} onChange={(v) => up({ designation: v })} />
                <TextField label="Relation" value={e.relation} onChange={(v) => up({ relation: v })} placeholder="Manager, Colleague…" />
                <TextField label="Phone" value={e.phone} onChange={(v) => up({ phone: v })} />
                <TextField label="Email" value={e.email} onChange={(v) => up({ email: v })} />
              </Grid>
            )}
          />
        </Section>

        {/* DOCUMENTS */}
        <Section
          id="documents"
          title="Documents"
          description={mode === "edit" ? "Add new documents here. Existing documents are shown on the profile page." : "On save, files are uploaded to the candidate's folder in Google Drive."}
        >
          <FileQueue files={files} onChange={setFiles} />
        </Section>

        {/* sticky save bar */}
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/90 backdrop-blur lg:left-[var(--sidebar-w,248px)]">
          <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10">
            <p className="hidden text-sm text-ink-400 sm:block">
              <span className="font-medium text-ink-800">{[c.first_name, c.last_name].filter(Boolean).join(" ") || "New candidate"}</span>
              {" — "}
              {overall}% complete
            </p>
            <div className="ml-auto flex gap-2">
              <Button type="button" variant="ghost" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                {mode === "create" ? "Save candidate" : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 rounded-xl border border-line bg-surface shadow-card">
      <header className="border-b border-line px-5 py-4 sm:px-6">
        <h2 className="text-[15px] font-semibold text-ink-800">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-ink-400">{description}</p>}
      </header>
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}

function SubHead({ children }: { children: React.ReactNode }) {
  return <h4 className="mb-3 mt-7 text-sm font-semibold text-ink-700">{children}</h4>;
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

function CityField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <TextField label={label} value={value} onChange={onChange} list="city-list" />
      <datalist id="city-list">
        {CITIES.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </div>
  );
}

function RepeatList<T>({
  items,
  onChange,
  make,
  render,
  title,
  addLabel,
}: {
  items: T[];
  onChange: (v: T[]) => void;
  make: () => T;
  render: (item: T, update: (patch: Partial<T>) => void) => React.ReactNode;
  title: (item: T, i: number) => string;
  addLabel: string;
}) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border border-line bg-canvas/50 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium text-ink-700">{title(item, i)}</p>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-ink-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          </div>
          {render(item, (patch) => onChange(items.map((x, idx) => (idx === i ? { ...x, ...patch } : x))))}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, make()])}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-ink-300 py-2.5 text-sm font-medium text-ink-600 transition-colors hover:border-jade hover:bg-jade-50 hover:text-jade-700"
      >
        <Plus className="h-4 w-4" /> {addLabel}
      </button>
    </div>
  );
}

function FileQueue({ files, onChange }: { files: QueuedFile[]; onChange: (f: QueuedFile[]) => void }) {
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const add = (list: FileList | null) => {
    if (!list) return;
    const next: QueuedFile[] = [];
    for (const f of Array.from(list)) {
      if (f.size > 4 * 1024 * 1024) {
        toast.error(`${f.name} is larger than 4 MB`);
        continue;
      }
      const lower = f.name.toLowerCase();
      const guess =
        /resume|cv/.test(lower) ? "Resume" : /aadhaar|aadhar/.test(lower) ? "Aadhaar" : /pan/.test(lower) ? "PAN" : f.type.startsWith("image/") ? "Photo" : files.length + next.length === 0 ? "Resume" : "Other";
      next.push({ file: f, doc_type: guess });
    }
    onChange([...files, ...next]);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          add(e.dataTransfer.files);
        }}
        onClick={() => input.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-6 py-8 text-center transition-colors",
          drag ? "border-jade bg-jade-50" : "border-ink-300 hover:border-jade hover:bg-canvas"
        )}
      >
        <FileUp className="mb-2 h-6 w-6 text-ink-400" />
        <p className="text-sm font-medium text-ink-700">Drop resumes, ID proofs and letters here</p>
        <p className="mt-0.5 text-xs text-ink-400">PDF, Word, images — max 4 MB per file</p>
        <input
          ref={input}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.txt,.rtf"
          onChange={(e) => {
            add(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {files.map((f, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2">
          <Upload className="h-4 w-4 shrink-0 text-ink-400" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-ink-800">{f.file.name}</p>
            <p className="text-xs text-ink-400">{fileSize(f.file.size)} · uploads on save</p>
          </div>
          <select
            value={f.doc_type}
            onChange={(e) => onChange(files.map((x, idx) => (idx === i ? { ...x, doc_type: e.target.value } : x)))}
            className="field-input h-8 w-40 text-[13px]"
            aria-label="Document type"
          >
            {DOC_TYPES.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onChange(files.filter((_, idx) => idx !== i))}
            className="rounded-md p-1.5 text-ink-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
