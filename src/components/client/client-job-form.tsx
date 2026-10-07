"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Send, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { portalRpc } from "@/lib/portal-rpc";
import { CITIES, EMPLOYMENT_TYPES, NOTICE_OPTIONS, QUALIFICATIONS, WORK_MODES } from "@/lib/constants";
import type { ClientJobDetail } from "@/lib/client-types";
import { ChipInput, SelectField, TextArea, TextField } from "@/components/ui/fields";
import { friendlyError } from "@/lib/utils";

const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));

function Block({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-surface shadow-card">
      <div className="border-b border-line px-5 py-4 sm:px-6">
        <h2 className="text-[16px] font-semibold text-ink-900">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-ink-500">{description}</p>}
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">{children}</div>
    </section>
  );
}

/** Client job post / edit. New jobs are saved as 'Pending review' by client_save_job. */
export function ClientJobForm({ initial }: { initial?: ClientJobDetail }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [skillsMaster, setSkillsMaster] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({
    title: s(initial?.title),
    department: s(initial?.department),
    openings: s(initial?.openings ?? 1),
    locations: initial?.locations ?? ([] as string[]),
    work_mode: s(initial?.work_mode),
    employment_type: s(initial?.employment_type),
    exp_min: s(initial?.exp_min),
    exp_max: s(initial?.exp_max),
    ctc_min: s(initial?.ctc_min),
    ctc_max: s(initial?.ctc_max),
    notice_max: s(initial?.notice_max),
    qualification: s(initial?.qualification),
    must: (initial?.skills ?? []).filter((x) => x.mandatory).map((x) => x.name),
    nice: (initial?.skills ?? []).filter((x) => !x.mandatory).map((x) => x.name),
    description: s(initial?.description),
    interview_process: s(initial?.interview_process),
    target_date: s(initial?.target_date),
    jd_file_id: "",
    jd_file_name: s(initial?.jd_file_name),
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const num = (v: string) => v.replace(/[^\d.]/g, "");

  useEffect(() => {
    createClient()
      .from("skills")
      .select("name")
      .order("name")
      .limit(1000)
      .then(({ data }) => setSkillsMaster((data ?? []).map((x) => x.name as string)));
  }, []);

  async function uploadJd(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.set("file", file);
    const res = await fetch("/api/client/jd", { method: "POST", body: fd });
    const json = await res.json().catch(() => ({}));
    setUploading(false);
    if (!res.ok) return toast.error(json.error ?? "Upload failed");
    setF((p) => ({ ...p, jd_file_id: json.file_id, jd_file_name: json.file_name }));
    toast.success("JD attached");
  }

  async function submit() {
    if (!f.title.trim()) return toast.error("Job title is required");
    if (f.exp_min && f.exp_max && Number(f.exp_min) > Number(f.exp_max)) return toast.error("Minimum experience is more than maximum");
    if (f.ctc_min && f.ctc_max && Number(f.ctc_min) > Number(f.ctc_max)) return toast.error("Minimum budget is more than maximum");
    if (!f.description.trim() && !f.jd_file_name) return toast.error("Add a job description or attach a JD file");
    setBusy(true);
    const { data, error } = await portalRpc<string>("client_save_job", {
      p: {
        id: initial?.id ?? null,
        job: {
          title: f.title,
          department: f.department,
          openings: f.openings,
          locations: f.locations,
          work_mode: f.work_mode,
          employment_type: f.employment_type,
          exp_min: f.exp_min,
          exp_max: f.exp_max,
          ctc_min: f.ctc_min,
          ctc_max: f.ctc_max,
          notice_max: f.notice_max,
          qualification: f.qualification,
          description: f.description,
          interview_process: f.interview_process,
          target_date: f.target_date,
          jd_file_id: f.jd_file_id,
          jd_file_name: f.jd_file_id ? f.jd_file_name : "",
        },
        skills: [...f.must.map((name) => ({ name, is_mandatory: true })), ...f.nice.filter((n) => !f.must.includes(n)).map((name) => ({ name, is_mandatory: false }))],
      },
    });
    setBusy(false);
    if (error) return toast.error(friendlyError(error.message));
    toast.success(initial ? "Job updated" : "Job sent to Synerax for review");
    router.push(`/client/jobs/${data}${initial ? "" : "?posted=1"}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Block title="The role">
        <TextField className="sm:col-span-2" label="Job title" required value={f.title} onChange={(v) => set("title", v)} placeholder="e.g. Senior Java Developer" />
        <TextField label="Department / team" value={f.department} onChange={(v) => set("department", v)} />
        <TextField label="Number of openings" value={f.openings} onChange={(v) => set("openings", v.replace(/\D/g, "").slice(0, 3))} inputMode="numeric" />
        <ChipInput label="Location(s)" value={f.locations} onChange={(v) => set("locations", v)} suggestions={CITIES} />
        <SelectField label="Work mode" value={f.work_mode} onChange={(v) => set("work_mode", v)} options={WORK_MODES.filter((w) => w !== "Any")} />
        <SelectField label="Employment type" value={f.employment_type} onChange={(v) => set("employment_type", v)} options={EMPLOYMENT_TYPES} />
        <TextField label="Target date to fill" type="date" value={f.target_date} onChange={(v) => set("target_date", v)} />
      </Block>

      <Block title="Requirements">
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Experience from" value={f.exp_min} onChange={(v) => set("exp_min", num(v))} suffix="yrs" inputMode="decimal" />
          <TextField label="to" value={f.exp_max} onChange={(v) => set("exp_max", num(v))} suffix="yrs" inputMode="decimal" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextField label="CTC budget from" value={f.ctc_min} onChange={(v) => set("ctc_min", num(v))} suffix="LPA" inputMode="decimal" />
          <TextField label="to" value={f.ctc_max} onChange={(v) => set("ctc_max", num(v))} suffix="LPA" inputMode="decimal" />
        </div>
        <SelectField label="Notice period (maximum)" value={f.notice_max} onChange={(v) => set("notice_max", v)} options={NOTICE_OPTIONS} placeholder="Flexible" />
        <SelectField label="Minimum qualification" value={f.qualification} onChange={(v) => set("qualification", v)} options={QUALIFICATIONS} placeholder="Any" />
        <ChipInput className="sm:col-span-2" label="Must-have skills" value={f.must} onChange={(v) => set("must", v)} suggestions={skillsMaster} />
        <ChipInput className="sm:col-span-2" label="Nice-to-have skills" value={f.nice} onChange={(v) => set("nice", v)} suggestions={skillsMaster} />
      </Block>

      <Block title="Description & interview process" description="Paste the JD, attach a file, or both.">
        <TextArea className="sm:col-span-2" label="Job description" rows={8} value={f.description} onChange={(v) => set("description", v)} placeholder="Responsibilities, requirements, team, benefits…" />
        <div className="sm:col-span-2">
          <span className="field-label">JD file (optional)</span>
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt,.rtf" className="sr-only" onChange={(e) => uploadJd(e.target.files?.[0])} aria-label="Upload JD file" />
          {f.jd_file_name ? (
            <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-3">
              <FileText className="h-5 w-5 text-jade" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-sm text-ink-800">{f.jd_file_name}</span>
              <button type="button" onClick={() => fileRef.current?.click()} className="text-[13px] font-medium text-jade-700 hover:underline">
                Replace
              </button>
              {f.jd_file_id && (
                <button type="button" onClick={() => setF((p) => ({ ...p, jd_file_id: "", jd_file_name: s(initial?.jd_file_name) }))} className="p-1 text-ink-400 hover:text-red-600" aria-label="Remove attached JD">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-strong bg-surface-2/60 px-4 py-5 text-sm font-medium text-ink-700 hover:border-jade/50 disabled:opacity-60"
            >
              {uploading ? <Loader2 className="h-5 w-5 animate-spin text-jade" /> : <UploadCloud className="h-5 w-5 text-jade" />}
              Attach JD (PDF, Word or text · max 4 MB)
            </button>
          )}
        </div>
        <TextArea className="sm:col-span-2" label="Interview process" rows={3} value={f.interview_process} onChange={(v) => set("interview_process", v)} placeholder="e.g. Technical round → Manager round → HR" />
      </Block>

      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-ink-500">
          {initial ? "Changes are visible to Synerax right away." : "Synerax reviews every new job before sourcing starts — usually within one working day."}
        </p>
        <button
          onClick={submit}
          disabled={busy || uploading}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-jade px-6 text-[15px] font-semibold text-white shadow-glow hover:brightness-110 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
          {initial ? "Save changes" : "Submit job"}
        </button>
      </div>
    </div>
  );
}
