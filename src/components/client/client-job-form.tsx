"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Briefcase, Check, CheckCircle2, Clock, Eye, FileText, IndianRupee, Loader2, MapPin, Send, Sparkles, UploadCloud, Users, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { portalRpc } from "@/lib/portal-rpc";
import { CITIES, EMPLOYMENT_TYPES, NOTICE_OPTIONS, QUALIFICATIONS, WORK_MODES } from "@/lib/constants";
import type { ClientJobDetail } from "@/lib/client-types";
import { ChipInput, SelectField, TextArea, TextField } from "@/components/ui/fields";
import { SkillChip } from "@/components/portal-ui/kit";
import { cn, friendlyError } from "@/lib/utils";

const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const STEPS = [
  { id: "basics", label: "Basics", hint: "Role, location and openings" },
  { id: "requirements", label: "Requirements", hint: "Experience, notice and the JD" },
  { id: "skills", label: "Skills", hint: "Must-have and nice-to-have" },
  { id: "compensation", label: "Compensation", hint: "Budget range" },
  { id: "review", label: "Review", hint: "Check and submit" },
] as const;

type Form = {
  title: string;
  department: string;
  openings: string;
  locations: string[];
  work_mode: string;
  employment_type: string;
  exp_min: string;
  exp_max: string;
  ctc_min: string;
  ctc_max: string;
  notice_max: string;
  qualification: string;
  must: string[];
  nice: string[];
  description: string;
  interview_process: string;
  target_date: string;
  jd_file_id: string;
  jd_file_name: string;
};

function Err({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1 text-[12px] font-medium text-red-600 dark:text-red-400">{msg}</p> : null;
}

/** Client job post / edit as a 5-step wizard with a live preview. New jobs are saved as 'Pending review' by client_save_job. */
export function ClientJobForm({ initial }: { initial?: ClientJobDetail }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [skillsMaster, setSkillsMaster] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState<Form>({
    title: s(initial?.title),
    department: s(initial?.department),
    openings: s(initial?.openings ?? 1),
    locations: initial?.locations ?? [],
    work_mode: s(initial?.work_mode),
    employment_type: s(initial?.employment_type) || "Full-time",
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
  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };
  const num = (v: string) => v.replace(/[^\d.]/g, "");

  useEffect(() => {
    createClient()
      .from("skills")
      .select("name")
      .order("name")
      .limit(1000)
      .then(({ data }) => setSkillsMaster((data ?? []).map((x) => x.name as string)));
  }, []);

  function validate(i: number): Record<string, string> {
    const e: Record<string, string> = {};
    if (i === 0) {
      if (!f.title.trim()) e.title = "Job title is required";
      if (!f.openings || Number(f.openings) < 1) e.openings = "At least 1 opening";
      if (!f.locations.length && f.work_mode !== "Remote") e.locations = "Add a city (or choose Remote)";
    }
    if (i === 1) {
      if (f.exp_min && f.exp_max && Number(f.exp_min) > Number(f.exp_max)) e.exp_max = "Must be more than the minimum";
      if (!f.description.trim() && !f.jd_file_name) e.description = "Add a job description or attach a JD file";
    }
    if (i === 2 && !f.must.length) e.must = "Add at least one must-have skill";
    if (i === 3 && f.ctc_min && f.ctc_max && Number(f.ctc_min) > Number(f.ctc_max)) e.ctc_max = "Must be more than the minimum";
    return e;
  }
  function go(to: number) {
    if (to > step) {
      for (let i = step; i < to; i++) {
        const e = validate(i);
        if (Object.keys(e).length) {
          setErrors(e);
          setStep(i);
          return toast.error(Object.values(e)[0]);
        }
      }
    }
    setErrors({});
    setStep(to);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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
    setErrors((e) => ({ ...e, description: "" }));
    toast.success("JD attached");
  }

  async function submit() {
    for (let i = 0; i < 4; i++) {
      const e = validate(i);
      if (Object.keys(e).length) {
        setErrors(e);
        setStep(i);
        return toast.error(Object.values(e)[0]);
      }
    }
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
    if (initial) {
      toast.success("Job updated");
      router.push(`/client/jobs/${data}`);
      router.refresh();
      return;
    }
    setDone(String(data));
    window.scrollTo({ top: 0, behavior: "smooth" });
    router.refresh();
  }

  if (done) return <Success jobId={done} title={f.title} />;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <div className="min-w-0 xl:col-span-8">
        {/* stepper */}
        <ol className="portal-card mb-5 grid grid-cols-5 gap-1 p-2" aria-label="Steps">
          {STEPS.map((st, i) => {
            const state = i < step ? "done" : i === step ? "current" : "todo";
            return (
              <li key={st.id}>
                <button
                  type="button"
                  onClick={() => go(i)}
                  aria-current={state === "current" ? "step" : undefined}
                  className={cn("flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2 text-center transition-colors sm:flex-row sm:gap-2.5 sm:px-3 sm:text-left", state === "current" ? "bg-jade-50" : "hover:bg-surface-3")}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold transition-colors",
                      state === "done" ? "bg-jade text-white" : state === "current" ? "bg-jade text-white ring-4 ring-jade/20" : "bg-surface-3 text-ink-500"
                    )}
                  >
                    {state === "done" ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className={cn("block truncate text-[11.5px] font-semibold sm:text-[13px]", state === "todo" ? "text-ink-500" : "text-ink-900")}>{st.label}</span>
                    <span className="hidden truncate text-[11px] text-ink-400 lg:block">{st.hint}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <section className="portal-card p-5 sm:p-7">
          <div className="mb-5">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-jade-700">
              Step {step + 1} of {STEPS.length}
            </p>
            <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.02em] text-ink-900">{STEPS[step].label}</h2>
            <p className="text-[13.5px] text-ink-500">{STEPS[step].hint}</p>
          </div>

          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <TextField label="Job title" required value={f.title} onChange={(v) => set("title", v)} placeholder="e.g. Senior Java Developer" />
                <Err msg={errors.title} />
              </div>
              <TextField label="Department / team" value={f.department} onChange={(v) => set("department", v)} placeholder="e.g. Engineering" />
              <div>
                <TextField label="Number of openings" value={f.openings} onChange={(v) => set("openings", v.replace(/\D/g, "").slice(0, 3))} inputMode="numeric" />
                <Err msg={errors.openings} />
              </div>
              <div className="sm:col-span-2">
                <ChipInput label="Location(s)" value={f.locations} onChange={(v) => set("locations", v)} suggestions={CITIES} placeholder="Type a city and press Enter" />
                <Err msg={errors.locations} />
              </div>
              <div>
                <span className="field-label">Work mode</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {WORK_MODES.filter((w) => w !== "Any").map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => set("work_mode", w)}
                      aria-pressed={f.work_mode === w}
                      className={cn("rounded-xl border px-2 py-2.5 text-[13px] font-medium transition-colors", f.work_mode === w ? "border-jade bg-jade-50 text-jade-700" : "border-line text-ink-600 hover:border-line-strong")}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
              <SelectField label="Employment type" value={f.employment_type} onChange={(v) => set("employment_type", v)} options={EMPLOYMENT_TYPES} />
              <TextField label="Target date to fill" type="date" value={f.target_date} onChange={(v) => set("target_date", v)} />
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Experience from" value={f.exp_min} onChange={(v) => set("exp_min", num(v))} suffix="yrs" inputMode="decimal" />
                <div>
                  <TextField label="to" value={f.exp_max} onChange={(v) => set("exp_max", num(v))} suffix="yrs" inputMode="decimal" />
                  <Err msg={errors.exp_max} />
                </div>
              </div>
              <SelectField label="Notice period (maximum)" value={f.notice_max} onChange={(v) => set("notice_max", v)} options={NOTICE_OPTIONS} placeholder="Flexible" />
              <SelectField label="Minimum qualification" value={f.qualification} onChange={(v) => set("qualification", v)} options={QUALIFICATIONS} placeholder="Any" />
              <div className="sm:col-span-2">
                <TextArea label="Job description" rows={8} value={f.description} onChange={(v) => set("description", v)} placeholder="Responsibilities, requirements, team, benefits…" />
                <Err msg={errors.description} />
              </div>
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
                    className="flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-line-strong bg-surface-2/60 px-4 py-6 text-sm font-medium text-ink-700 transition hover:border-jade/50 hover:bg-jade-50/40 disabled:opacity-60"
                  >
                    {uploading ? <Loader2 className="h-6 w-6 animate-spin text-jade" /> : <UploadCloud className="h-6 w-6 text-jade" />}
                    Attach a JD file
                    <span className="text-[12px] font-normal text-ink-400">PDF, Word or text · max 4 MB</span>
                  </button>
                )}
              </div>
              <TextArea className="sm:col-span-2" label="Interview process" rows={2} value={f.interview_process} onChange={(v) => set("interview_process", v)} placeholder="e.g. Technical round → Manager round → HR" />
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-5">
              <div>
                <ChipInput label="Must-have skills" value={f.must} onChange={(v) => set("must", v)} suggestions={skillsMaster} placeholder="Start typing — e.g. React" hint="Candidates are matched mainly on these." />
                <Err msg={errors.must} />
              </div>
              <ChipInput label="Nice-to-have skills" value={f.nice} onChange={(v) => set("nice", v)} suggestions={skillsMaster} placeholder="Optional extras" />
              {skillsMaster.length > 0 && f.must.length < 3 && (
                <div>
                  <p className="mb-2 text-[12px] text-ink-400">Popular skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {skillsMaster
                      .filter((x) => !f.must.includes(x) && !f.nice.includes(x))
                      .slice(0, 14)
                      .map((x) => (
                        <button key={x} type="button" onClick={() => set("must", [...f.must, x])} className="rounded-lg border border-dashed border-line-strong px-2 py-1 text-[12px] text-ink-600 hover:border-jade/50 hover:text-jade-700">
                          + {x}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="CTC budget from" value={f.ctc_min} onChange={(v) => set("ctc_min", num(v))} suffix="LPA" inputMode="decimal" />
              <div>
                <TextField label="to" value={f.ctc_max} onChange={(v) => set("ctc_max", num(v))} suffix="LPA" inputMode="decimal" />
                <Err msg={errors.ctc_max} />
              </div>
              <p className="rounded-xl bg-surface-2 px-4 py-3 text-[13px] text-ink-600 sm:col-span-2">
                Your budget is only shared with Synerax. Candidates don&apos;t see it unless you ask us to show it on the listing.
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              {[
                { label: "Basics", go: 0, rows: [["Title", f.title], ["Department", f.department], ["Openings", f.openings], ["Location", [f.locations.join(", "), f.work_mode].filter(Boolean).join(" · ")], ["Type", f.employment_type], ["Target date", f.target_date]] },
                { label: "Requirements", go: 1, rows: [["Experience", f.exp_min || f.exp_max ? `${f.exp_min || 0}–${f.exp_max || "any"} yrs` : ""], ["Notice", f.notice_max ? `${f.notice_max} days max` : "Flexible"], ["Qualification", f.qualification], ["JD file", f.jd_file_name], ["Interview process", f.interview_process]] },
                { label: "Skills", go: 2, rows: [["Must-have", f.must.join(", ")], ["Nice-to-have", f.nice.join(", ")]] },
                { label: "Compensation", go: 3, rows: [["Budget", f.ctc_min || f.ctc_max ? `₹${f.ctc_min || "?"}–${f.ctc_max || "?"} LPA` : ""]] },
              ].map((g) => (
                <div key={g.label} className="rounded-2xl border border-line p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[13.5px] font-semibold text-ink-900">{g.label}</p>
                    <button type="button" onClick={() => go(g.go)} className="text-[12.5px] font-medium text-jade-700 hover:underline">
                      Edit
                    </button>
                  </div>
                  <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                    {g.rows.map(([k, v]) => (
                      <div key={k} className="flex gap-2 text-[13px]">
                        <dt className="w-28 shrink-0 text-ink-400">{k}</dt>
                        <dd className="min-w-0 break-words text-ink-800">{v || "—"}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          )}

          <div className="mt-7 flex items-center justify-between gap-3 border-t border-line pt-5">
            <button type="button" onClick={() => go(Math.max(0, step - 1))} disabled={step === 0} className="inline-flex h-11 items-center gap-1.5 rounded-xl px-4 text-[14px] font-medium text-ink-600 hover:bg-surface-3 disabled:invisible">
              <ArrowLeft className="h-4 w-4" aria-hidden /> Back
            </button>
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={() => go(step + 1)} className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-ink-900 px-5 text-[14px] font-semibold text-surface hover:bg-ink-800 dark:bg-jade dark:text-white dark:hover:brightness-110">
                Continue <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={busy || uploading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-jade px-6 text-[14.5px] font-semibold text-white shadow-glow hover:brightness-110 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
                {initial ? "Save changes" : "Submit to Synerax"}
              </button>
            )}
          </div>
        </section>
      </div>

      {/* live preview */}
      <aside className="min-w-0 xl:col-span-4">
        <div className="space-y-4 xl:sticky xl:top-24">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-400">
            <Eye className="h-3.5 w-3.5" aria-hidden /> Live preview
          </p>
          <div className="portal-card overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-jade via-teal-400 to-saffron" aria-hidden />
            <div className="p-5">
              <p className="text-[11.5px] text-ink-400">{f.department || "Department"}</p>
              <h3 className={cn("mt-0.5 text-[18px] font-semibold leading-snug", f.title ? "text-ink-900" : "text-ink-300")}>{f.title || "Job title"}</h3>
              <ul className="mt-3 space-y-1.5 text-[13px] text-ink-600">
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-ink-400" aria-hidden /> {[f.locations.join(", "), f.work_mode].filter(Boolean).join(" · ") || "Location"}
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-ink-400" aria-hidden /> {f.exp_min || f.exp_max ? `${f.exp_min || 0}–${f.exp_max || "any"} yrs experience` : "Experience"}
                </li>
                <li className="flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-ink-400" aria-hidden /> {f.ctc_min || f.ctc_max ? `₹${f.ctc_min || "?"}–${f.ctc_max || "?"} LPA` : "Budget"}
                </li>
                <li className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-ink-400" aria-hidden /> {f.openings || 1} opening{f.openings === "1" ? "" : "s"} · {f.employment_type}
                </li>
              </ul>
              {(f.must.length > 0 || f.nice.length > 0) && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {f.must.map((x) => (
                    <SkillChip key={x} name={x} tone="jade" />
                  ))}
                  {f.nice.map((x) => (
                    <SkillChip key={x} name={x} />
                  ))}
                </div>
              )}
              {f.description && <p className="mt-4 line-clamp-5 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-600">{f.description}</p>}
            </div>
          </div>
          <div className="portal-card p-5">
            <p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-900">
              <Sparkles className="h-4 w-4 text-saffron" aria-hidden /> Tips for a faster shortlist
            </p>
            <ul className="mt-2 space-y-1.5 text-[12.5px] text-ink-600">
              <li>• Keep must-have skills to the 3–5 that really matter.</li>
              <li>• A realistic budget and notice period widen the pool.</li>
              <li>• Mention the interview rounds so candidates come prepared.</li>
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Success({ jobId, title }: { jobId: string; title: string }) {
  const next = [
    { icon: CheckCircle2, title: "Synerax reviews your job", text: "Usually within one working day — we may call you to clarify the role." },
    { icon: Briefcase, title: "We publish and start sourcing", text: "Our recruiters screen candidates against your must-haves." },
    { icon: Users, title: "You get shortlisted profiles", text: "You'll be emailed each time — approve or reject right in the portal." },
  ];
  return (
    <div className="mx-auto max-w-2xl">
      <div className="portal-card overflow-hidden text-center">
        <div className="relative px-6 pb-8 pt-10">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,rgb(var(--jade)/0.18),transparent_70%)]" />
          <span className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-jade text-white shadow-glow">
            <Check className="h-8 w-8" aria-hidden />
          </span>
          <h2 className="relative mt-5 text-[24px] font-semibold tracking-[-0.02em] text-ink-900">Job submitted</h2>
          <p className="relative mt-1 text-[15px] text-ink-600">
            “{title}” is with the Synerax team. Here&apos;s what happens next:
          </p>
        </div>
        <ol className="space-y-3 border-t border-line p-6 text-left">
          {next.map((n, i) => (
            <li key={n.title} className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-jade-50 text-jade-700">
                <n.icon className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="text-[14px] font-semibold text-ink-900">
                  {i + 1}. {n.title}
                </p>
                <p className="text-[13px] text-ink-500">{n.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="flex flex-col gap-2 border-t border-line p-5 sm:flex-row sm:justify-center">
          <Link href={`/client/jobs/${jobId}`} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-jade px-5 text-[14px] font-semibold text-white shadow-glow hover:brightness-110">
            View the job <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link href="/client" className="inline-flex h-11 items-center justify-center rounded-xl border border-line px-5 text-[14px] font-medium text-ink-700 hover:bg-surface-2">
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
