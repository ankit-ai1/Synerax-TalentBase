"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, FileText, Loader2, Send, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { portalRpc } from "@/lib/portal-rpc";
import { CITIES, NOTICE_OPTIONS, QUALIFICATIONS, WORK_MODES } from "@/lib/constants";
import type { Completion } from "@/lib/portal-types";
import { Dialog } from "@/components/ui/dialog";
import { ChipInput, SelectField, Switch, TextField } from "@/components/ui/fields";
import { cn, friendlyError } from "@/lib/utils";

const KEY_FIELDS = new Set(["basic", "current_job", "notice", "skills", "education", "preferences", "cv"]);

/** One-click apply. Profiles under 60% (or without a CV) get a quick modal for the missing key fields first. */
export function ApplyButton({
  jobId,
  applied,
  completion,
  className,
}: {
  jobId: string;
  applied: boolean;
  completion: Completion;
  className?: string;
}) {
  const router = useRouter();
  const [done, setDone] = useState(applied);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const missing = completion.missing.map((m) => m.key);
  const needsCv = missing.includes("cv");
  const needsModal = needsCv || completion.percent < 60;

  async function apply() {
    setBusy(true);
    const { error } = await portalRpc("candidate_apply", { p_job: jobId });
    setBusy(false);
    if (error) return toast.error(friendlyError(error.message));
    setDone(true);
    setOpen(false);
    toast.success("Application sent! We'll keep you posted.");
    router.refresh();
  }

  if (done) {
    return (
      <span className={cn("inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-jade-50 px-6 text-[15px] font-semibold text-jade-700", className)}>
        <Check className="h-5 w-5" aria-hidden /> Applied
      </span>
    );
  }

  return (
    <>
      <button
        onClick={() => (needsModal ? setOpen(true) : apply())}
        disabled={busy}
        className={cn(
          "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-jade px-6 text-[15px] font-semibold text-white shadow-glow transition hover:brightness-110 disabled:opacity-60",
          className
        )}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
        Apply now
      </button>
      {open && <QuickComplete missing={missing.filter((k) => KEY_FIELDS.has(k))} percent={completion.percent} onClose={() => setOpen(false)} onDone={async () => { await apply(); }} />}
    </>
  );
}

function QuickComplete({ missing, percent, onClose, onDone }: { missing: string[]; percent: number; onClose: () => void; onDone: () => Promise<void> }) {
  const has = (k: string) => missing.includes(k);
  const [busy, setBusy] = useState(false);
  const [skillsMaster, setSkillsMaster] = useState<string[]>([]);
  const [f, setF] = useState({
    last_name: "",
    current_city: "",
    current_designation: "",
    total_experience: "",
    current_ctc: "",
    expected_ctc: "",
    notice_period_days: "",
    serving_notice: false,
    last_working_day: "",
    skills: [] as string[],
    highest_qualification: "",
    preferred_locations: [] as string[],
    work_mode_preference: "",
  });
  const [cv, setCv] = useState<File | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!has("skills")) return;
    createClient()
      .from("skills")
      .select("name")
      .order("name")
      .limit(1000)
      .then(({ data }) => setSkillsMaster((data ?? []).map((s) => s.name as string)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    if (has("cv") && !cv) return toast.error("Please upload your CV to apply");
    if (has("skills") && f.skills.length < 3) return toast.error("Please add at least 3 skills");
    if (f.serving_notice && !f.last_working_day) return toast.error("Please add your last working day");
    setBusy(true);
    try {
      const c: Record<string, unknown> = {};
      const put = (k: string, v: unknown) => {
        if (v !== "" && v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0)) c[k] = v;
      };
      if (has("basic")) {
        put("last_name", f.last_name.trim());
        put("current_city", f.current_city.trim());
      }
      if (has("current_job")) {
        put("current_designation", f.current_designation.trim());
        put("total_experience", f.total_experience);
        put("current_ctc", f.current_ctc);
        put("expected_ctc", f.expected_ctc);
      }
      if (has("notice")) {
        put("notice_period_days", f.notice_period_days);
        c.serving_notice = f.serving_notice;
        if (f.serving_notice) put("last_working_day", f.last_working_day);
      }
      if (has("education")) put("highest_qualification", f.highest_qualification);
      if (has("preferences")) {
        put("preferred_locations", f.preferred_locations);
        put("work_mode_preference", f.work_mode_preference);
      }
      const p: Record<string, unknown> = { candidate: c };
      if (has("skills") && f.skills.length) p.skills = f.skills.map((name, i) => ({ name, is_primary: i < 3 }));

      if (Object.keys(c).length || p.skills) {
        const { error } = await createClient().rpc("candidate_update_profile", { p });
        if (error) throw new Error(friendlyError(error.message));
      }
      if (cv) {
        const fd = new FormData();
        fd.set("file", cv);
        fd.set("doc_type", "Resume");
        const res = await fetch("/api/portal/documents", { method: "POST", body: fd });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? "CV upload failed");
      }
      await onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title="A few details before you apply"
      description={`Your profile is ${percent}% complete. Employers respond much better to complete profiles.`}
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/portal/profile" className="text-center text-sm font-medium text-ink-500 hover:text-ink-900">
            Edit full profile instead
          </Link>
          <button
            onClick={submit}
            disabled={busy}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-jade px-5 text-[14.5px] font-semibold text-white hover:brightness-110 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Save & apply
          </button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {has("basic") && (
          <>
            <TextField label="Last name" value={f.last_name} onChange={(v) => set("last_name", v)} />
            <div>
              <TextField label="Current city" value={f.current_city} onChange={(v) => set("current_city", v)} list="qc-cities" />
              <datalist id="qc-cities">
                {CITIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </>
        )}
        {has("current_job") && (
          <>
            <TextField className="sm:col-span-2" label="Current designation" value={f.current_designation} onChange={(v) => set("current_designation", v)} />
            <TextField label="Total experience" value={f.total_experience} onChange={(v) => set("total_experience", v.replace(/[^\d.]/g, ""))} suffix="years" inputMode="decimal" />
            <TextField label="Current CTC" value={f.current_ctc} onChange={(v) => set("current_ctc", v.replace(/[^\d.]/g, ""))} suffix="LPA" inputMode="decimal" />
            <TextField label="Expected CTC" value={f.expected_ctc} onChange={(v) => set("expected_ctc", v.replace(/[^\d.]/g, ""))} suffix="LPA" inputMode="decimal" />
          </>
        )}
        {has("notice") && (
          <>
            <SelectField label="Notice period" value={f.notice_period_days} onChange={(v) => set("notice_period_days", v)} options={NOTICE_OPTIONS} />
            <div className="flex items-end pb-2">
              <Switch checked={f.serving_notice} onChange={(v) => set("serving_notice", v)} label="Serving notice" />
            </div>
            {f.serving_notice && <TextField label="Last working day" type="date" value={f.last_working_day} onChange={(v) => set("last_working_day", v)} />}
          </>
        )}
        {has("skills") && (
          <ChipInput className="sm:col-span-2" label="Top skills (at least 3)" value={f.skills} onChange={(v) => set("skills", v)} suggestions={skillsMaster} />
        )}
        {has("education") && <SelectField label="Highest qualification" value={f.highest_qualification} onChange={(v) => set("highest_qualification", v)} options={QUALIFICATIONS} />}
        {has("preferences") && (
          <>
            <ChipInput label="Preferred locations" value={f.preferred_locations} onChange={(v) => set("preferred_locations", v)} suggestions={CITIES} />
            <SelectField label="Work mode" value={f.work_mode_preference} onChange={(v) => set("work_mode_preference", v)} options={WORK_MODES} />
          </>
        )}
        {has("cv") && (
          <div className="sm:col-span-2">
            <span className="field-label">CV / resume (required)</span>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-line-strong bg-surface-2/60 p-4 hover:border-jade/50">
              {cv ? <FileText className="h-6 w-6 text-jade" aria-hidden /> : <UploadCloud className="h-6 w-6 text-jade" aria-hidden />}
              <span className="min-w-0 flex-1 truncate text-sm text-ink-700">{cv ? cv.name : "Choose a PDF, DOC or DOCX (max 4 MB)"}</span>
              <input type="file" accept=".pdf,.doc,.docx" className="sr-only" onChange={(e) => setCv(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        )}
        {missing.length === 0 && <p className="text-sm text-ink-500 sm:col-span-2">Add work history and education on your profile page to reach 100%.</p>}
      </div>
    </Dialog>
  );
}
