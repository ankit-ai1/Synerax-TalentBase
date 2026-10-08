"use client";

import { useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, FileText, Loader2, MailCheck, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { registrationSchema, CV_ALLOWED, CV_MAX_BYTES } from "@/lib/registration-schema";
import { CITIES, NOTICE_OPTIONS } from "@/lib/constants";
import { ChipInput, SelectField, Switch, TextField } from "@/components/ui/fields";
import { PasswordInput } from "@/components/auth/auth-shell";
import { cn, fileSize } from "@/lib/utils";
import { CvDropzone, CvField, FromCvBadge } from "@/components/resume/cv-ui";
import { matchCity, noticeOption, parseCvFile, yearsMonths, type Confidence } from "@/lib/resume/client";

type Form = {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  current_city: string;
  exp_years: string;
  exp_months: string;
  current_designation: string;
  skills: string[];
  current_ctc: string;
  expected_ctc: string;
  notice_period_days: string;
  serving_notice: boolean;
  last_working_day: string;
  consent: boolean;
};

const EMPTY: Form = {
  full_name: "",
  email: "",
  phone: "",
  password: "",
  current_city: "",
  exp_years: "",
  exp_months: "0",
  current_designation: "",
  skills: [],
  current_ctc: "",
  expected_ctc: "",
  notice_period_days: "",
  serving_notice: false,
  last_working_day: "",
  consent: false,
};

const STEP1 = ["full_name", "email", "phone", "password", "current_city"] as const;
const STEP2 = ["exp_years", "exp_months", "current_designation", "skills", "current_ctc", "expected_ctc", "notice_period_days", "last_working_day", "cv", "consent"] as const;

export function RegisterWizard({ skills }: { skills: string[] }) {
  const router = useRouter();
  const uid = useId();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form>(EMPTY);
  const [cv, setCv] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [done, setDone] = useState<"verify" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // step "cv" comes first: upload → read → the form opens pre-filled
  const [stage, setStage] = useState<"cv" | "form">("cv");
  const [parsing, setParsing] = useState(false);
  const [meta, setMeta] = useState<Partial<Record<keyof Form, Confidence>>>({});
  const [cvNote, setCvNote] = useState<{ kind: "ok" | "warn"; text: string } | null>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
    // once the candidate edits a field it is theirs — drop the "From your CV" badge
    setMeta((m) => (m[k] ? { ...m, [k]: undefined } : m));
  };

  /** Read the CV and pre-fill EMPTY fields only. Nothing is saved until the candidate submits. */
  async function readCv(file: File) {
    setCv(file);
    setErrors((x) => ({ ...x, cv: "" }));
    setParsing(true);
    const res = await parseCvFile(file);
    setParsing(false);
    const p = res.fields;
    const next: Form = { ...f };
    const m: Partial<Record<keyof Form, Confidence>> = {};
    const fill = <K extends keyof Form>(k: K, v: Form[K] | undefined, c: Confidence | undefined) => {
      if (v === undefined || v === "" || !c) return;
      const cur = next[k];
      if (cur === "" || (Array.isArray(cur) && cur.length === 0)) {
        next[k] = v;
        m[k] = c;
      }
    };
    fill("full_name", p.full_name?.value, p.full_name?.confidence);
    fill("email", p.email?.value, p.email?.confidence);
    fill("phone", p.phone?.value, p.phone?.confidence);
    fill("current_city", p.current_city ? matchCity(p.current_city.value, CITIES) : undefined, p.current_city?.confidence);
    if (p.total_experience) {
      const { y, m: mo } = yearsMonths(p.total_experience.value);
      if (next.exp_years === "") {
        next.exp_years = String(Math.min(50, y));
        next.exp_months = String(mo);
        m.exp_years = p.total_experience.confidence;
      }
    }
    fill("current_designation", p.current_designation?.value, p.current_designation?.confidence);
    fill("skills", p.skills?.value.slice(0, 25), p.skills?.confidence);
    fill("current_ctc", p.current_ctc ? String(p.current_ctc.value) : undefined, p.current_ctc?.confidence);
    fill("expected_ctc", p.expected_ctc ? String(p.expected_ctc.value) : undefined, p.expected_ctc?.confidence);
    fill("notice_period_days", p.notice_period_days ? noticeOption(p.notice_period_days.value) : undefined, p.notice_period_days?.confidence);
    if (p.serving_notice?.value && !next.serving_notice) {
      next.serving_notice = true;
      m.serving_notice = p.serving_notice.confidence;
    }
    fill("last_working_day", p.last_working_day?.value, p.last_working_day?.confidence);
    setF(next);
    setMeta(m);
    const n = Object.keys(m).length;
    if (res.warnings.length && !n) setCvNote({ kind: "warn", text: res.warnings[0] });
    else if (n) setCvNote({ kind: res.warnings.length ? "warn" : "ok", text: `We filled ${n} field${n === 1 ? "" : "s"} from your CV${res.warnings.length ? " — " + res.warnings[0] : ""}. Please review everything before creating your account; fields marked "Please check" need a second look.` });
    else setCvNote({ kind: "warn", text: "We couldn't read details from this CV, please fill the details manually." });
    setStage("form");
    setStep(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const payload = useMemo(
    () => ({
      full_name: f.full_name,
      email: f.email,
      phone: f.phone,
      current_city: f.current_city,
      exp_years: f.exp_years === "" ? undefined : f.exp_years,
      exp_months: f.exp_months,
      current_designation: f.current_designation,
      skills: f.skills,
      current_ctc: f.current_ctc === "" ? undefined : f.current_ctc,
      expected_ctc: f.expected_ctc === "" ? undefined : f.expected_ctc,
      notice_period_days: f.notice_period_days === "" ? undefined : f.notice_period_days,
      serving_notice: f.serving_notice,
      last_working_day: f.last_working_day,
      consent: f.consent,
    }),
    [f]
  );

  const validate = (fields: readonly string[]) => {
    const errs: Record<string, string> = {};
    const res = registrationSchema.safeParse(payload);
    if (!res.success) {
      for (const issue of res.error.issues) {
        const k = String(issue.path[0]);
        if (fields.includes(k) && !errs[k]) {
          errs[k] = issue.code === "invalid_type" ? "This field is required" : issue.message;
        }
      }
    }
    if (fields.includes("password") && f.password.length < 8) errs.password = "Use at least 8 characters";
    if (fields.includes("cv")) {
      if (!cv) errs.cv = "Please upload your CV";
      else if (cv.size > CV_MAX_BYTES) errs.cv = "CV must be 4 MB or smaller";
      else if (!CV_ALLOWED.test(cv.name)) errs.cv = "CV must be a PDF, DOC or DOCX file";
    }
    setErrors(errs);
    const first = Object.keys(errs)[0];
    if (first) document.getElementById(`${uid}-${first}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    return !first;
  };

  async function next() {
    if (!validate(STEP1)) return;
    setBusy("Checking…");
    try {
      const res = await fetch("/api/portal/register/precheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: f.email.trim().toLowerCase(), phone: normalisePhone(f.phone) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Please check your details.");
        return;
      }
      setStep(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setBusy(null);
    }
  }

  async function uploadProfile(id: string) {
    const fd = new FormData();
    fd.set("user_id", id);
    fd.set("payload", JSON.stringify(payload));
    fd.set("cv", cv!);
    const res = await fetch("/api/portal/register", { method: "POST", body: fd });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? "We couldn't save your profile. Please try again.");
    return json as { finalized: boolean };
  }

  async function submit() {
    if (!validate(STEP2)) return;
    const supabase = createClient();
    try {
      let id = userId;
      let hasSession = false;
      if (!id) {
        setBusy("Creating your account…");
        const { data, error } = await supabase.auth.signUp({
          email: f.email.trim().toLowerCase(),
          password: f.password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/portal`,
            data: { full_name: f.full_name.trim() },
          },
        });
        if (error) throw new Error(error.message);
        if (!data.user || (data.user.identities && data.user.identities.length === 0)) {
          throw new Error("An account already exists for this email. Please sign in instead.");
        }
        id = data.user.id;
        hasSession = !!data.session;
        setUserId(id);
      }
      setBusy("Uploading your CV…");
      const res = await uploadProfile(id);
      if (res.finalized && hasSession) {
        toast.success("Welcome to Synerax TalentBase!");
        router.replace("/portal?welcome=1");
        router.refresh();
        return;
      }
      setDone("verify");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function resend() {
    setBusy("Sending…");
    const { error } = await createClient().auth.resend({
      type: "signup",
      email: f.email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/portal` },
    });
    setBusy(null);
    if (error) toast.error(error.message);
    else toast.success("Verification email sent again");
  }

  if (done === "verify") {
    return (
      <div className="py-6 text-center" role="status">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-jade-50 text-jade-700">
          <MailCheck className="h-8 w-8" aria-hidden />
        </span>
        <h2 className="mt-5 text-xl font-semibold text-ink-900">Verify your email</h2>
        <p className="mx-auto mt-2 max-w-sm text-[15px] text-ink-500">
          We sent a confirmation link to <b className="font-semibold text-ink-800">{f.email}</b>. Click it to activate your account — your profile and CV are saved.
        </p>
        <div className="mt-6 flex flex-col items-center gap-2">
          <button onClick={resend} disabled={!!busy} className="text-sm font-semibold text-jade-700 hover:underline disabled:opacity-60">
            {busy ?? "Didn't get it? Resend the email"}
          </button>
          <Link href="/login" className="text-sm text-ink-500 hover:text-ink-900">
            Already verified? Sign in
          </Link>
        </div>
      </div>
    );
  }

  const err = (k: string) =>
    errors[k] ? (
      <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
        {errors[k]}
      </p>
    ) : null;

  return (
    <div>
      {/* step indicator */}
      <ol className="mb-7 flex items-center gap-3" aria-label="Registration progress">
        {["Your CV", "Account", "Profile"].map((label, j) => {
          const i = j - 1;
          const cur = stage === "cv" ? -1 : step;
          return (
          <li key={label} className="flex flex-1 items-center gap-2 last:flex-none">
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold",
                i < cur ? "bg-jade text-white" : i === cur ? "bg-jade text-white ring-4 ring-jade/20" : "bg-surface-3 text-ink-400"
              )}
              aria-current={i === cur ? "step" : undefined}
            >
              {i < cur ? <Check className="h-3.5 w-3.5" aria-hidden /> : j + 1}
            </span>
            <span className={cn("whitespace-nowrap text-[13px] font-medium", i <= cur ? "text-ink-900" : "text-ink-400")}>{label}</span>
            {j < 2 && <span className={cn("h-px flex-1", cur > i ? "bg-jade" : "bg-line-strong")} aria-hidden />}
          </li>
          );
        })}
      </ol>

      {stage === "form" && cvNote && (
        <div role="status" className={cn("mb-6 flex items-start gap-2.5 rounded-xl border p-3.5 text-[13.5px]", cvNote.kind === "ok" ? "border-jade/25 bg-jade-50 text-ink-800" : "border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-400/10 dark:text-amber-200")}>
          <span className="mt-0.5">{cvNote.kind === "ok" ? "✨" : "⚠️"}</span>
          <span>{cvNote.text}</span>
        </div>
      )}

      {stage === "cv" ? (
        <div>
          <h2 className="text-[18px] font-semibold text-ink-900">Start with your CV</h2>
          <p className="mt-1 text-[14px] text-ink-500">We&apos;ll read it and fill in the form for you. You can review and change everything before anything is saved.</p>
          <div className="mt-5">
            <CvDropzone onFile={readCv} busy={parsing} file={cv} />
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 text-[13px]">
            <span className="text-ink-400">Your CV is only used for your Synerax profile.</span>
            <button type="button" onClick={() => setStage("form")} disabled={parsing} className="font-semibold text-jade-700 hover:underline disabled:opacity-50">
              Skip — I&apos;ll fill it in myself
            </button>
          </div>
        </div>
      ) : step === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div id={`${uid}-full_name`} className="sm:col-span-2">
            <CvField confidence={meta.full_name}>
              <TextField label="Full name" required value={f.full_name} onChange={(v) => set("full_name", v)} autoComplete="name" />
            </CvField>
            {err("full_name")}
          </div>
          <div id={`${uid}-email`}>
            <CvField confidence={meta.email}>
              <TextField label="Email" type="email" required value={f.email} onChange={(v) => set("email", v)} autoComplete="email" />
            </CvField>
            {err("email")}
          </div>
          <div id={`${uid}-phone`}>
            <CvField confidence={meta.phone}>
              <TextField label="Mobile number" required value={f.phone} onChange={(v) => set("phone", v)} placeholder="10-digit mobile" inputMode="numeric" autoComplete="tel-national" maxLength={14} />
            </CvField>
            {err("phone")}
          </div>
          <div id={`${uid}-password`}>
            <label htmlFor={`${uid}-pw`} className="field-label">
              Password<span className="ml-0.5 text-red-500">*</span>
            </label>
            <PasswordInput id={`${uid}-pw`} value={f.password} onChange={(v) => set("password", v)} show={showPw} onToggle={() => setShowPw((s) => !s)} />
            <p className="mt-1 text-xs text-ink-400">At least 8 characters.</p>
            {err("password")}
          </div>
          <div id={`${uid}-current_city`}>
            <CvField confidence={meta.current_city}>
              <TextField label="Current city" required value={f.current_city} onChange={(v) => set("current_city", v)} list={`${uid}-cities`} autoComplete="address-level2" />
            </CvField>
            <datalist id={`${uid}-cities`}>
              {CITIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            {err("current_city")}
          </div>
          <div className="mt-2 flex justify-end sm:col-span-2">
            <button
              onClick={next}
              disabled={!!busy}
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-jade px-6 text-[15px] font-semibold text-white shadow-glow hover:brightness-110 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {busy ?? "Continue"}
              {!busy && <ArrowRight className="h-4 w-4" aria-hidden />}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div id={`${uid}-exp_years`} className="sm:col-span-2">
            <span className="field-label flex items-center justify-between">
              <span>
                Total experience<span className="ml-0.5 text-red-500">*</span>
              </span>
              <FromCvBadge confidence={meta.exp_years} />
            </span>
            <div className="grid grid-cols-2 gap-3">
              <TextField value={f.exp_years} onChange={(v) => set("exp_years", v.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" suffix="years" aria-label="Years of experience" />
              <SelectField value={f.exp_months} onChange={(v) => set("exp_months", v)} options={Array.from({ length: 12 }, (_, i) => ({ value: String(i), label: `${i} months` }))} placeholder="Months" />
            </div>
            {err("exp_years")}
          </div>
          <div id={`${uid}-current_designation`} className="sm:col-span-2">
            <CvField confidence={meta.current_designation}>
              <TextField label="Current designation" required value={f.current_designation} onChange={(v) => set("current_designation", v)} placeholder="e.g. Senior Java Developer" />
            </CvField>
            {err("current_designation")}
          </div>
          <div id={`${uid}-skills`} className="sm:col-span-2">
            <CvField confidence={meta.skills}>
              <ChipInput label="Top skills (at least 3)" value={f.skills} onChange={(v) => set("skills", v)} suggestions={skills} placeholder="Type a skill and press Enter" />
            </CvField>
            {err("skills")}
          </div>
          <div id={`${uid}-current_ctc`}>
            <CvField confidence={meta.current_ctc}>
              <TextField label="Current CTC" required value={f.current_ctc} onChange={(v) => set("current_ctc", v.replace(/[^\d.]/g, ""))} inputMode="decimal" suffix="LPA" />
            </CvField>
            {err("current_ctc")}
          </div>
          <div id={`${uid}-expected_ctc`}>
            <CvField confidence={meta.expected_ctc}>
              <TextField label="Expected CTC" required value={f.expected_ctc} onChange={(v) => set("expected_ctc", v.replace(/[^\d.]/g, ""))} inputMode="decimal" suffix="LPA" />
            </CvField>
            {err("expected_ctc")}
          </div>
          <div id={`${uid}-notice_period_days`}>
            <CvField confidence={meta.notice_period_days}>
              <SelectField label="Notice period" required value={f.notice_period_days} onChange={(v) => set("notice_period_days", v)} options={NOTICE_OPTIONS} placeholder="Select" />
            </CvField>
            {err("notice_period_days")}
          </div>
          <div className="flex items-end pb-2">
            <Switch checked={f.serving_notice} onChange={(v) => set("serving_notice", v)} label="I'm serving my notice" />
          </div>
          {f.serving_notice && (
            <div id={`${uid}-last_working_day`} className="sm:col-span-2">
              <TextField label="Last working day" type="date" required value={f.last_working_day} onChange={(v) => set("last_working_day", v)} />
              {err("last_working_day")}
            </div>
          )}

          <div id={`${uid}-cv`} className="sm:col-span-2">
            <span className="field-label">
              CV / resume<span className="ml-0.5 text-red-500">*</span>
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) readCv(file);
              }}
              aria-label="Upload your CV"
            />
            {cv ? (
              <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-jade-50 text-jade-700">
                  <FileText className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-800">{cv.name}</p>
                  <p className="text-xs text-ink-400">{fileSize(cv.size)}</p>
                </div>
                <button type="button" onClick={() => setCv(null)} className="rounded-lg p-2 text-ink-400 hover:text-red-600" aria-label="Remove CV">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) readCv(file);
                }}
                className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-line-strong bg-surface-2/60 px-4 py-7 text-center transition-colors hover:border-jade/50"
              >
                <UploadCloud className="h-7 w-7 text-jade" aria-hidden />
                <span className="mt-2 text-sm font-medium text-ink-800">Upload your CV</span>
                <span className="text-xs text-ink-400">PDF, DOC or DOCX · max 4 MB</span>
              </button>
            )}
            {err("cv")}
          </div>

          <div id={`${uid}-consent`} className="sm:col-span-2">
            <label className="flex items-start gap-3 rounded-xl border border-line bg-surface-2/60 p-3.5 text-[14px] text-ink-700">
              <input type="checkbox" checked={f.consent} onChange={(e) => set("consent", e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[rgb(var(--jade))]" />
              <span>
                I agree Synerax may store my profile and share it with prospective employers. Read our{" "}
                <Link href="/privacy" target="_blank" className="font-medium text-jade-700 underline">
                  privacy policy
                </Link>
                .
              </span>
            </label>
            {err("consent")}
          </div>

          <div className="mt-2 flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={() => setStep(0)} disabled={!!busy || !!userId} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl px-4 text-[14.5px] font-semibold text-ink-600 hover:bg-surface-3 disabled:opacity-40">
              <ArrowLeft className="h-4 w-4" aria-hidden /> Back
            </button>
            <button
              onClick={submit}
              disabled={!!busy}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-jade px-6 text-[15px] font-semibold text-white shadow-glow hover:brightness-110 disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {busy ?? (userId ? "Retry upload" : "Create account")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function normalisePhone(v: string) {
  return v.replace(/[\s-]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, "");
}
