"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, FileText, Loader2, Lock, Send, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { portalRpc } from "@/lib/portal-rpc";
import { CITIES, NOTICE_OPTIONS, QUALIFICATIONS, WORK_MODES } from "@/lib/constants";
import { SECTION_ANCHOR, type Completion } from "@/lib/portal-types";
import { Dialog } from "@/components/ui/dialog";
import { ChipInput, SelectField, Switch, TextField } from "@/components/ui/fields";
import { MoneyField, moneyPayload, type MoneyInput } from "@/components/ui/money-field";
import { cn, friendlyError, parseProfileIncomplete } from "@/lib/utils";

const KEY_FIELDS = new Set(["basic", "current_job", "notice", "skills", "education", "preferences", "cv"]);

import { applyThreshold, canApply } from "./apply-gate";
export { applyThreshold, canApply };

/**
 * "Complete your profile (72% → 80%) to apply" + the missing items with links. Renders nothing once the profile
 * reaches the threshold (app_settings.min_profile_completion_to_apply — the database enforces the same rule).
 */
export function ApplyGateNotice({ completion, compact, className }: { completion: Completion; compact?: boolean; className?: string }) {
  if (canApply(completion)) return null;
  const items = compact ? completion.missing.slice(0, 2) : completion.missing;
  const more = completion.missing.length - items.length;
  return (
    <div className={cn("text-[12.5px] leading-snug text-ink-600", className)} data-testid="apply-gate">
      <p className="font-medium text-ink-800">
        Complete your profile ({completion.percent}% → {applyThreshold(completion)}%) to apply
      </p>
      {items.length > 0 && (
        <ul className={cn("mt-1 flex flex-wrap gap-x-3 gap-y-1", !compact && "flex-col")}>
          {items.map((m) => (
            <li key={m.key}>
              <Link href={SECTION_ANCHOR[m.section] ?? "/portal/profile"} className="font-medium text-jade-700 hover:underline">
                + {m.label}
              </Link>
            </li>
          ))}
          {more > 0 && (
            <li>
              <Link href="/portal/profile" className="font-medium text-jade-700 hover:underline">
                +{more} more
              </Link>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

/** One-click apply. Below the completion threshold the button is disabled (see ApplyGateNotice); profiles without a CV get a quick modal first. */
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
  const needsModal = needsCv;
  const gated = !canApply(completion);

  async function apply() {
    setBusy(true);
    const { error } = await portalRpc("candidate_apply", { p_job: jobId });
    setBusy(false);
    if (error) {
      if (parseProfileIncomplete(error.message)) router.refresh(); // the server knows better — show the gate
      return toast.error(friendlyError(error.message));
    }
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

  if (gated) {
    return (
      <button
        type="button"
        disabled
        aria-disabled
        title={`Complete your profile (${completion.percent}% → ${applyThreshold(completion)}%) to apply`}
        className={cn("inline-flex h-12 cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-ink-200 px-6 text-[15px] font-semibold text-ink-500", className)}
        data-testid="apply-disabled"
      >
        <Lock className="h-4 w-4" aria-hidden /> Apply
      </button>
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
  const [curMoney, setCurMoney] = useState<MoneyInput>({ amount: "", currency: "INR", period: "annual" });
  const [expMoney, setExpMoney] = useState<MoneyInput>({ amount: "", currency: "INR", period: "annual" });
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
        if (curMoney.amount !== "") Object.assign(c, moneyPayload("current_ctc", curMoney));
        if (expMoney.amount !== "") Object.assign(c, moneyPayload("expected_ctc", expMoney));
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
            <MoneyField className="sm:col-span-2" label="Current CTC" value={curMoney} onChange={setCurMoney} />
            <MoneyField className="sm:col-span-2" label="Expected CTC" value={expMoney} onChange={setExpMoney} />
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
