"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ExternalLink, FileText, Loader2, UploadCloud, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ChipInput, SelectField, Switch, TextArea, TextField } from "@/components/ui/fields";
import { CvField } from "@/components/resume/cv-ui";
import { applyJd, parseJdFile, type JdMeta } from "./jd-import";
import { jobPath } from "@/lib/seo/landing";
import { Segmented } from "@/components/ui/interactive";
import { Priority } from "@/components/ui/misc";
import { MasterSearch } from "@/components/candidate/skill-picker";
import { AsyncPicker, searchClients, useUsers } from "@/components/pickers";
import type { JobFormData } from "./job-defaults";
import { Section } from "@/components/clients/client-form";
import { CITIES, EMPLOYMENT_TYPES, JOB_STATUSES, NOTICE_OPTIONS, PRIORITIES, QUALIFICATIONS, WORK_MODES } from "@/lib/constants";
import { cn, friendlyError } from "@/lib/utils";
import { MoneyRangeField, rangePayload } from "@/components/ui/money-field";
import type { JobRole, Skill } from "@/lib/types";

export function JobForm({ initial, skills: initialSkills, roles }: { initial: JobFormData; skills: Skill[]; roles: JobRole[] }) {
  const router = useRouter();
  const users = useUsers();
  const [f, setF] = useState(initial);
  const [skills, setSkills] = useState(initialSkills);
  const [saving, setSaving] = useState(false);
  const [jdMeta, setJdMeta] = useState<JdMeta>({});
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [jdBusy, setJdBusy] = useState(false);
  const jdInput = useRef<HTMLInputElement>(null);
  const set = <K extends keyof JobFormData>(k: K, v: JobFormData[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    setJdMeta((m) => (m[k] ? { ...m, [k]: undefined } : m)); // edited → no longer "From JD"
  };
  const jd = (k: keyof JobFormData) => jdMeta[k];

  /** "Upload JD": fills empty fields only; nothing is saved until Save */
  async function onJd(file: File) {
    setJdBusy(true);
    const { fields, warnings, error } = await parseJdFile(file);
    setJdBusy(false);
    if (error) return toast.error(error);
    const { next, meta } = applyJd(f, fields, skills);
    setF(next);
    setJdMeta(meta);
    setJdFile(file);
    const n = Object.keys(meta).length;
    if (n) toast.success(`Filled ${n} field${n === 1 ? "" : "s"} from the JD — please review before saving`, { description: warnings[0] });
    else toast.warning(warnings[0] ?? "Couldn't find job details in this JD — please fill the form manually");
  }

  async function save() {
    if (!f.title.trim()) return toast.error("Job title is required");
    if (f.exp_min && f.exp_max && Number(f.exp_min) > Number(f.exp_max)) return toast.error("Min experience is greater than max");
    if (f.ctc_min && f.ctc_max && Number(f.ctc_min) > Number(f.ctc_max)) return toast.error("Min CTC is greater than max");
    setSaving(true);
    const { client, skills: sk, assignees, id, job_code: _code, jd_file_name: _jd, ...rest } = f;
    void _code;
    void _jd;
    const { data, error } = await createClient().rpc("save_job", {
      p: {
        id: id ?? null,
        job: { ...rest, ...rangePayload({ min: f.ctc_min, max: f.ctc_max, currency: f.ctc_currency, period: f.ctc_period }), client_id: client?.id ?? "" },
        skills: sk.map(({ skill_id, is_mandatory, min_years }) => ({ skill_id, is_mandatory, min_years })),
        assignees,
      },
    });
    setSaving(false);
    if (error) return toast.error(friendlyError(error.message?.replace("VALIDATION: ", "")));
    // keep the original JD with the job (Google Drive)
    if (jdFile) {
      const fd = new FormData();
      fd.append("file", jdFile);
      const up = await fetch(`/api/jobs/${data}/jd`, { method: "POST", body: fd }).catch(() => null);
      if (!up?.ok) toast.error("The job was saved, but the JD file couldn't be attached — try again from Edit");
    }
    // the careers page and /jobs pages update right away
    fetch("/api/jobs/revalidate", { method: "POST" }).catch(() => {});
    toast.success(id ? "Job updated" : "Job created — now review matching candidates");
    router.push(`/jobs/${data}${id ? "" : "#matches"}`);
    router.refresh();
  }

  const createSkill = async (name: string) => {
    const { data, error } = await createClient().from("skills").insert({ name }).select("id, name, category, aliases").single();
    if (error || !data) return void toast.error(friendlyError(error?.message));
    setSkills((s) => [...s, data as Skill].sort((a, b) => a.name.localeCompare(b.name)));
    set("skills", [...f.skills, { skill_id: data.id, name: data.name, is_mandatory: true, min_years: "" }]);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-24">
      <div className="rounded-2xl border border-dashed border-line-strong bg-surface p-4 sm:flex sm:items-center sm:gap-4" data-testid="jd-upload">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-jade-50 text-jade-700">{jdBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}</span>
        <div className="mt-2 min-w-0 flex-1 sm:mt-0">
          <p className="text-sm font-semibold text-ink-900">{jdFile ? `JD: ${jdFile.name}` : f.jd_file_name ? `Attached JD: ${f.jd_file_name}` : "Have a JD? Upload it to fill this form"}</p>
          <p className="text-xs text-ink-500">PDF or DOCX · we fill empty fields (marked “From JD”) — review, then Save. The file is kept with the job.</p>
        </div>
        <div className="mt-3 flex shrink-0 gap-2 sm:mt-0">
          {f.id && f.jd_file_name && (
            <a href={`/api/jobs/${f.id}/jd?download=1`} className="inline-flex h-9 items-center rounded-lg border border-line px-3 text-[13px] font-medium text-ink-700 hover:bg-surface-2">
              Download JD
            </a>
          )}
          <Button variant="secondary" onClick={() => jdInput.current?.click()} loading={jdBusy}>
            <UploadCloud className="h-4 w-4" /> {jdFile || f.jd_file_name ? "Upload another JD" : "Upload JD"}
          </Button>
          <input ref={jdInput} type="file" accept=".pdf,.docx" className="sr-only" data-testid="jd-input" onChange={(e) => { const x = e.target.files?.[0]; e.target.value = ""; if (x) onJd(x); }} />
        </div>
      </div>
      <Section title="Basics">
        <div className="grid gap-4 sm:grid-cols-2">
          <CvField className="sm:col-span-2" confidence={jd("title")} label="From JD"><TextField label="Job title" required value={f.title} onChange={(v) => set("title", v)} placeholder="e.g. Senior Java Developer" autoFocus /></CvField>
          <div>
            <AsyncPicker label="Client" value={f.client} onChange={(v) => set("client", v)} search={searchClients} placeholder="Choose a client" />
            <a href="/clients/new" target="_blank" className="mt-1 inline-block text-xs font-medium text-jade-700 hover:underline">
              Create new client
            </a>
          </div>
          <SelectField
            label="Role category"
            value={f.job_role_id}
            onChange={(v) => set("job_role_id", v)}
            options={roles.map((r) => ({ value: r.id, label: r.name }))}
            placeholder="Choose a role"
            hint="Used for matching"
          />
          <TextField label="Department / team" value={f.department} onChange={(v) => set("department", v)} />
          <TextField label="Hiring manager" value={f.hiring_manager} onChange={(v) => set("hiring_manager", v)} placeholder="Client side contact" />
          <CvField confidence={jd("openings")} label="From JD"><TextField label="Openings" type="number" min={1} value={f.openings} onChange={(v) => set("openings", v)} /></CvField>
          <TextField label="Target date" type="date" value={f.target_date} onChange={(v) => set("target_date", v)} />
          <div>
            <span className="field-label">Priority</span>
            <Segmented
              value={f.priority}
              onChange={(v) => set("priority", v)}
              options={PRIORITIES.map((p) => ({ value: p, label: <Priority value={p} className="text-inherit" /> }))}
            />
          </div>
          <div>
            <span className="field-label">Status</span>
            <Segmented size="sm" value={f.status} onChange={(v) => set("status", v)} options={JOB_STATUSES.map((s) => ({ value: s, label: s }))} />
          </div>
        </div>
      </Section>

      <Section title="Requirement" description="These criteria drive the match score">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CvField confidence={jd("exp_min")} label="From JD"><TextField label="Min experience" type="number" min={0} step={0.5} suffix="yrs" value={f.exp_min} onChange={(v) => set("exp_min", v)} /></CvField>
          <CvField confidence={jd("exp_max")} label="From JD"><TextField label="Max experience" type="number" min={0} step={0.5} suffix="yrs" value={f.exp_max} onChange={(v) => set("exp_max", v)} /></CvField>
          <CvField className="sm:col-span-2" confidence={jd("ctc_min")} label="From JD">
            <MoneyRangeField
              label="Budget"
              value={{ min: f.ctc_min, max: f.ctc_max, currency: f.ctc_currency, period: f.ctc_period }}
              onChange={(r) => (setF((x) => ({ ...x, ctc_min: r.min, ctc_max: r.max, ctc_currency: r.currency, ctc_period: r.period })), setJdMeta((m) => ({ ...m, ctc_min: undefined })))}
            />
          </CvField>
          <SelectField
            label="Max notice"
            value={f.notice_max}
            onChange={(v) => set("notice_max", v)}
            options={NOTICE_OPTIONS.filter((o) => o.value !== "120")}
            placeholder="Any"
          />
          <CvField confidence={jd("qualification")} label="From JD"><SelectField label="Qualification" value={f.qualification} onChange={(v) => set("qualification", v)} options={QUALIFICATIONS} placeholder="Any" /></CvField>
          <CvField confidence={jd("employment_type")} label="From JD"><SelectField label="Employment" value={f.employment_type} onChange={(v) => set("employment_type", v)} options={EMPLOYMENT_TYPES} /></CvField>
          <CvField confidence={jd("work_mode")} label="From JD"><SelectField label="Work mode" value={f.work_mode} onChange={(v) => set("work_mode", v)} options={WORK_MODES.filter((w) => w !== "Any")} /></CvField>
        </div>
        <CvField className="mt-4" confidence={jd("locations")} label="From JD"><ChipInput label="Locations" value={f.locations} onChange={(v) => set("locations", v)} suggestions={CITIES} /></CvField>

        <h4 className="mb-3 mt-7 flex items-center gap-2 text-sm font-semibold text-ink-700">Skills {jd("skills") && <span className="rounded-full bg-jade-50 px-2 py-0.5 text-[10.5px] font-semibold text-jade-700">From JD</span>}</h4>
        <MasterSearch
          items={skills}
          selectedIds={f.skills.map((s) => s.skill_id)}
          onPick={(s) => set("skills", [...f.skills, { skill_id: s.id, name: s.name, is_mandatory: true, min_years: "" }])}
          onCreate={createSkill}
          placeholder="Skill add karo…"
          groupBy={(s) => (s as Skill).category}
        />
        {f.skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {f.skills.map((s, i) => (
              <div
                key={s.skill_id}
                className={cn(
                  "flex items-center gap-1 rounded-lg border py-1 pl-1 pr-1.5 text-sm",
                  s.is_mandatory ? "border-jade/40 bg-jade-50" : "border-line bg-surface-2"
                )}
              >
                <button
                  type="button"
                  onClick={() => set("skills", f.skills.map((x, idx) => (idx === i ? { ...x, is_mandatory: !x.is_mandatory } : x)))}
                  className={cn(
                    "flex h-6 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium",
                    s.is_mandatory ? "bg-jade text-white" : "bg-surface-3 text-ink-500"
                  )}
                  title="Toggle must-have / nice-to-have"
                >
                  {s.is_mandatory && <Check className="h-3 w-3" />}
                  {s.is_mandatory ? "Must" : "Nice"}
                </button>
                <span className="px-1 font-medium text-ink-800">{s.name}</span>
                <input
                  value={s.min_years}
                  onChange={(e) => set("skills", f.skills.map((x, idx) => (idx === i ? { ...x, min_years: e.target.value } : x)))}
                  placeholder="yrs"
                  inputMode="decimal"
                  className="h-6 w-11 rounded border border-line bg-surface px-1 text-center text-xs outline-none focus:border-jade"
                  aria-label={`${s.name} minimum years`}
                />
                <button type="button" onClick={() => set("skills", f.skills.filter((_, idx) => idx !== i))} className="rounded p-0.5 text-ink-400 hover:text-red-600" aria-label="Remove">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-ink-400">Must-have skills carry double weight. You can enter minimum experience in &quot;yrs&quot;.</p>
      </Section>

      <Section title="Job description">
        <CvField confidence={jd("description")} label="From JD"><TextArea rows={10} value={f.description} onChange={(v) => set("description", v)} placeholder="Responsibilities, requirements, benefits… (paste the client's JD here, or upload it above)" /></CvField>
      </Section>

      <Section title="Careers page" description="Open jobs appear on the public careers page and /jobs pages automatically — instantly after you save.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Switch checked={f.show_on_careers} onChange={(v) => set("show_on_careers", v)} label="Show on careers page" description="Visible while the job is Open (client-posted jobs still need Publish)" />
          <Switch checked={f.featured} onChange={(v) => set("featured", v)} label="Featured" description="Pinned at the top of the careers list" />
          <TextField label="Auto-hide after" type="date" value={f.hide_after} onChange={(v) => set("hide_after", v)} hint="Optional. It also hides after the target date." />
          <div className="flex items-end pb-2">
            {f.id && f.job_code ? (
              <a href={jobPath({ title: f.title, job_code: f.job_code })} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-jade-700 hover:underline" data-testid="careers-preview">
                <ExternalLink className="h-4 w-4" /> Preview on careers page
              </a>
            ) : (
              <span className="text-[12.5px] text-ink-400">The preview link appears after you save.</span>
            )}
          </div>
        </div>
      </Section>

      <Section title="Team" description="Recruiters who will work on this job">
        <div className="flex flex-wrap gap-2">
          {users.map((u) => {
            const on = f.assignees.includes(u.id);
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => set("assignees", on ? f.assignees.filter((x) => x !== u.id) : [...f.assignees, u.id])}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                  on ? "border-ink-900 bg-ink-900 text-surface" : "border-line text-ink-600 hover:border-line-strong"
                )}
              >
                {on && <Check className="h-3.5 w-3.5" />}
                {u.full_name}
              </button>
            );
          })}
        </div>
        <TextArea className="mt-4" label="Internal notes" rows={3} value={f.notes} onChange={(v) => set("notes", v)} placeholder="Client's special requirements, interview process…" />
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/90 backdrop-blur lg:left-[var(--sidebar-w,248px)]">
        <div className="mx-auto flex max-w-4xl items-center justify-end gap-2 px-4 py-3">
          <Button variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            {f.id ? "Save changes" : "Create job"}
          </Button>
        </div>
      </div>
    </div>
  );
}
