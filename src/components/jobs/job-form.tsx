"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ChipInput, SelectField, TextArea, TextField } from "@/components/ui/fields";
import { Segmented } from "@/components/ui/interactive";
import { Priority } from "@/components/ui/misc";
import { MasterSearch } from "@/components/candidate/skill-picker";
import { AsyncPicker, searchClients, useUsers } from "@/components/pickers";
import type { JobFormData } from "./job-defaults";
import { Section } from "@/components/clients/client-form";
import { CITIES, EMPLOYMENT_TYPES, JOB_STATUSES, NOTICE_OPTIONS, PRIORITIES, QUALIFICATIONS, WORK_MODES } from "@/lib/constants";
import { cn, friendlyError } from "@/lib/utils";
import type { JobRole, Skill } from "@/lib/types";

export function JobForm({ initial, skills: initialSkills, roles }: { initial: JobFormData; skills: Skill[]; roles: JobRole[] }) {
  const router = useRouter();
  const users = useUsers();
  const [f, setF] = useState(initial);
  const [skills, setSkills] = useState(initialSkills);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof JobFormData>(k: K, v: JobFormData[K]) => setF((p) => ({ ...p, [k]: v }));

  async function save() {
    if (!f.title.trim()) return toast.error("Job title is required");
    if (f.exp_min && f.exp_max && Number(f.exp_min) > Number(f.exp_max)) return toast.error("Min experience is greater than max");
    if (f.ctc_min && f.ctc_max && Number(f.ctc_min) > Number(f.ctc_max)) return toast.error("Min CTC is greater than max");
    setSaving(true);
    const { client, skills: sk, assignees, id, ...rest } = f;
    const { data, error } = await createClient().rpc("save_job", {
      p: {
        id: id ?? null,
        job: { ...rest, client_id: client?.id ?? "" },
        skills: sk.map(({ skill_id, is_mandatory, min_years }) => ({ skill_id, is_mandatory, min_years })),
        assignees,
      },
    });
    setSaving(false);
    if (error) return toast.error(friendlyError(error.message?.replace("VALIDATION: ", "")));
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
      <Section title="Basics">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField className="sm:col-span-2" label="Job title" required value={f.title} onChange={(v) => set("title", v)} placeholder="e.g. Senior Java Developer" autoFocus />
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
          <TextField label="Openings" type="number" min={1} value={f.openings} onChange={(v) => set("openings", v)} />
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
          <TextField label="Min experience" type="number" min={0} step={0.5} suffix="yrs" value={f.exp_min} onChange={(v) => set("exp_min", v)} />
          <TextField label="Max experience" type="number" min={0} step={0.5} suffix="yrs" value={f.exp_max} onChange={(v) => set("exp_max", v)} />
          <TextField label="Budget min" type="number" min={0} step={0.5} prefix="₹" suffix="LPA" value={f.ctc_min} onChange={(v) => set("ctc_min", v)} />
          <TextField label="Budget max" type="number" min={0} step={0.5} prefix="₹" suffix="LPA" value={f.ctc_max} onChange={(v) => set("ctc_max", v)} />
          <SelectField
            label="Max notice"
            value={f.notice_max}
            onChange={(v) => set("notice_max", v)}
            options={NOTICE_OPTIONS.filter((o) => o.value !== "120")}
            placeholder="Any"
          />
          <SelectField label="Qualification" value={f.qualification} onChange={(v) => set("qualification", v)} options={QUALIFICATIONS} placeholder="Any" />
          <SelectField label="Employment" value={f.employment_type} onChange={(v) => set("employment_type", v)} options={EMPLOYMENT_TYPES} />
          <SelectField label="Work mode" value={f.work_mode} onChange={(v) => set("work_mode", v)} options={WORK_MODES.filter((w) => w !== "Any")} />
        </div>
        <ChipInput className="mt-4" label="Locations" value={f.locations} onChange={(v) => set("locations", v)} suggestions={CITIES} />

        <h4 className="mb-3 mt-7 text-sm font-semibold text-ink-700">Skills</h4>
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
        <TextArea rows={10} value={f.description} onChange={(v) => set("description", v)} placeholder="Responsibilities, requirements, benefits… (paste the client's JD here)" />
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
