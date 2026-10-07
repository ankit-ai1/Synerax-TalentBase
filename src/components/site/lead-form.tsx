"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, m } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { ENQUIRY_TYPES, HIRING_TYPES } from "@/lib/lead-options";
import { cn } from "@/lib/utils";

type LeadType = "contact" | "employer" | "candidate";

type Field = {
  name: string;
  label: string;
  type?: "text" | "email" | "tel" | "url" | "select" | "textarea";
  required?: boolean;
  placeholder?: string;
  options?: readonly string[];
  full?: boolean;
  hint?: string;
  autoComplete?: string;
};

const F = {
  name: { name: "name", label: "Full name", required: true, autoComplete: "name" },
  email: { name: "email", label: "Email", type: "email", required: true, autoComplete: "email" },
  workEmail: { name: "email", label: "Work email", type: "email", required: true, autoComplete: "email" },
  phone: { name: "phone", label: "Phone", type: "tel", required: true, autoComplete: "tel" },
} satisfies Record<string, Field>;

const CONTACT_FIELDS: Field[] = [
  F.name,
  { name: "company", label: "Company", autoComplete: "organization" },
  F.workEmail,
  { ...F.phone, required: false },
  { name: "enquiry", label: "Enquiry type", type: "select", required: true, options: ENQUIRY_TYPES, full: true },
  { name: "message", label: "Message", type: "textarea", required: true, full: true, placeholder: "How can we help?" },
];

const STEPS: Record<"employer" | "candidate", { title: string; fields: Field[] }[]> = {
  employer: [
    {
      title: "Company",
      fields: [
        { name: "company", label: "Company", required: true, autoComplete: "organization", full: true },
        { name: "hiringType", label: "Hiring type", type: "select", required: true, options: HIRING_TYPES },
        { name: "location", label: "Location", placeholder: "e.g. Pune · Hybrid" },
      ],
    },
    {
      title: "Role",
      fields: [
        { name: "role", label: "Role you're hiring for", required: true, placeholder: "e.g. Senior Java Developer", full: true },
        { name: "openings", label: "Number of openings", placeholder: "e.g. 3" },
        { name: "experience", label: "Experience range", placeholder: "e.g. 4–7 yrs" },
        { name: "budget", label: "Budget (LPA)", placeholder: "e.g. 18–24" },
        { name: "timeline", label: "When do you need them?", placeholder: "e.g. Within 30 days" },
        { name: "message", label: "Anything else we should know?", type: "textarea", full: true, placeholder: "Skills, interview process, team details…" },
      ],
    },
    {
      title: "Contact",
      fields: [{ ...F.name, label: "Your name", full: true }, F.workEmail, F.phone],
    },
  ],
  candidate: [
    {
      title: "About you",
      fields: [F.name, F.email, F.phone, { name: "city", label: "Current city", required: true, autoComplete: "address-level2" }],
    },
    {
      title: "Experience",
      fields: [
        { name: "currentRole", label: "Current role", required: true, placeholder: "e.g. QA Engineer" },
        { name: "experience", label: "Total experience (years)", required: true, placeholder: "e.g. 4.5" },
        { name: "skills", label: "Key skills", required: true, full: true, placeholder: "e.g. Java, Spring Boot, SQL, AWS" },
      ],
    },
    {
      title: "Resume",
      fields: [
        {
          name: "resumeUrl",
          label: "Resume link",
          type: "url",
          full: true,
          placeholder: "https://drive.google.com/…",
          hint: "Share a Google Drive / Dropbox / LinkedIn link. No link? Mention it below and we'll ask for your resume on our call.",
        },
        { name: "message", label: "Note (optional)", type: "textarea", full: true, placeholder: "Preferred roles, notice period, expected CTC…" },
      ],
    },
  ],
};

const SUBMIT: Record<LeadType, string> = { contact: "Send message", employer: "Request talent", candidate: "Submit profile" };
const SUCCESS: Record<LeadType, { title: string; text: string }> = {
  contact: { title: "Thanks — message received", text: "Our team will get back to you within one working day." },
  employer: { title: "Thanks — requirement received", text: "A Synerax account manager will call you within one working day." },
  candidate: { title: "Thanks — profile received", text: "A recruiter will reach out when a matching role opens up." },
};

function FieldInput({ f, uid }: { f: Field; uid: string }) {
  const id = `${uid}-${f.name}`;
  return (
    <div className={cn(f.full && "sm:col-span-2")}>
      <label htmlFor={id} className="field-label">
        {f.label}
        {f.required && (
          <span className="ml-0.5 text-red-500" aria-hidden>
            *
          </span>
        )}
      </label>
      {f.type === "select" ? (
        <select id={id} name={f.name} required={f.required} defaultValue="" className="field-input h-11">
          <option value="" disabled>
            Select…
          </option>
          {f.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : f.type === "textarea" ? (
        <textarea id={id} name={f.name} required={f.required} rows={4} placeholder={f.placeholder} className="field-input h-auto py-2.5" />
      ) : (
        <input
          id={id}
          name={f.name}
          type={f.type ?? "text"}
          required={f.required}
          placeholder={f.placeholder}
          autoComplete={f.autoComplete}
          aria-describedby={f.hint ? `${id}-hint` : undefined}
          className="field-input h-11"
        />
      )}
      {f.hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-400">
          {f.hint}
        </p>
      )}
    </div>
  );
}

function Honeypot({ uid }: { uid: string }) {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label htmlFor={`${uid}-website`}>Website</label>
      <input id={`${uid}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
    </div>
  );
}

function Success({ type, onReset }: { type: LeadType; onReset: () => void }) {
  return (
    <m.div
      key="done"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex min-h-[340px] flex-col items-center justify-center text-center"
      role="status"
    >
      <span className="relative flex h-16 w-16 items-center justify-center">
        <span className="pulse-ring absolute inset-0 rounded-full bg-jade/30" aria-hidden />
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-jade text-white shadow-glow">
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <m.path d="M5 12.5l4.5 4.5L19 7" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.15 }} />
          </svg>
        </span>
      </span>
      <h3 className="mt-6 text-xl font-semibold text-ink-900">{SUCCESS[type].title}</h3>
      <p className="mt-2 max-w-sm text-[15px] text-ink-500">{SUCCESS[type].text}</p>
      <button onClick={onReset} className="mt-6 text-sm font-semibold text-jade-700 hover:underline">
        Submit another response
      </button>
    </m.div>
  );
}

async function submit(type: LeadType, form: HTMLFormElement) {
  const payload = { type, ...Object.fromEntries(new FormData(form).entries()) };
  const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Something went wrong. Please try again.");
}

function Consent() {
  return (
    <p className="text-xs text-ink-400">
      By submitting, you agree to our{" "}
      <Link href="/privacy" className="underline hover:text-ink-700">
        privacy policy
      </Link>
      .
    </p>
  );
}

const shell = "glass relative rounded-[28px] p-6 shadow-pop sm:p-8";

/** Single-step form (contact page) */
export function LeadForm({ type = "contact", className }: { type?: "contact"; className?: string }) {
  const uid = useId();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setLoading(true);
    try {
      await submit(type, form);
      toast.success(SUCCESS[type].title);
      form.reset();
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn(shell, className)}>
      <AnimatePresence mode="wait" initial={false}>
        {done ? (
          <Success type={type} onReset={() => setDone(false)} />
        ) : (
          <m.form key="form" exit={{ opacity: 0 }} onSubmit={onSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              {CONTACT_FIELDS.map((f) => (
                <FieldInput key={f.name} f={f} uid={uid} />
              ))}
            </div>
            <Honeypot uid={uid} />
            <div className="mt-6 flex flex-col-reverse items-start justify-between gap-4 sm:flex-row sm:items-center">
              <Consent />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-jade px-6 text-[15px] font-semibold text-white shadow-glow transition hover:brightness-110 disabled:opacity-60 sm:w-auto"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
                {loading ? "Sending…" : SUBMIT[type]}
              </button>
            </div>
          </m.form>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Multi-step form with step indicator + progress bar (employers, careers) */
export function MultiStepLeadForm({ type, className }: { type: "employer" | "candidate"; className?: string }) {
  const uid = useId();
  const steps = STEPS[type];
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const last = step === steps.length - 1;

  const validateStep = () => {
    const fs = formRef.current?.querySelector<HTMLFieldSetElement>(`[data-step="${step}"]`);
    if (!fs) return true;
    const controls = Array.from(fs.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea"));
    const bad = controls.find((c) => !c.checkValidity());
    if (bad) {
      bad.reportValidity();
      return false;
    }
    return true;
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validateStep()) return;
    if (!last) {
      setStep((s) => s + 1);
      return;
    }
    const form = e.currentTarget;
    setLoading(true);
    try {
      await submit(type, form);
      toast.success(SUCCESS[type].title);
      form.reset();
      setDone(true);
      setStep(0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn(shell, className)}>
      <AnimatePresence mode="wait" initial={false}>
        {done ? (
          <Success type={type} onReset={() => setDone(false)} />
        ) : (
          <m.form key="form" ref={formRef} exit={{ opacity: 0 }} onSubmit={onSubmit} noValidate>
            <ol className="mb-6 flex items-center gap-2" aria-label="Form progress">
              {steps.map((s, i) => (
                <li key={s.title} className="flex flex-1 items-center gap-2 last:flex-none">
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold transition-colors duration-300",
                      i < step ? "bg-jade text-white" : i === step ? "bg-jade text-white ring-4 ring-jade/20" : "bg-surface-3 text-ink-400"
                    )}
                    aria-current={i === step ? "step" : undefined}
                  >
                    {i < step ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
                  </span>
                  <span className={cn("hidden whitespace-nowrap text-[13px] font-medium sm:inline", i <= step ? "text-ink-900" : "text-ink-400")}>{s.title}</span>
                  {i < steps.length - 1 && <span className={cn("h-px flex-1 transition-colors duration-300", i < step ? "bg-jade" : "bg-line-strong")} aria-hidden />}
                </li>
              ))}
            </ol>
            <div className="mb-6 h-1 overflow-hidden rounded-full bg-surface-3" aria-hidden>
              <div className="h-full rounded-full bg-gradient-to-r from-jade to-saffron transition-[width] duration-500 ease-out" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
            </div>
            <p className="sr-only" aria-live="polite">
              Step {step + 1} of {steps.length}: {steps[step].title}
            </p>

            {steps.map((s, i) => (
              <fieldset key={s.title} data-step={i} hidden={i !== step} className={cn(i === step && "page-in")}>
                <legend className="mb-4 text-[17px] font-semibold text-ink-900">{s.title}</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  {s.fields.map((f) => (
                    <FieldInput key={f.name} f={f} uid={uid} />
                  ))}
                </div>
              </fieldset>
            ))}
            <Honeypot uid={uid} />

            <div className="mt-7 flex flex-col-reverse items-stretch justify-between gap-4 sm:flex-row sm:items-center">
              {step > 0 ? (
                <button type="button" onClick={() => setStep((s) => s - 1)} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl px-4 text-[14.5px] font-semibold text-ink-600 hover:bg-surface-3">
                  <ArrowLeft className="h-4 w-4" aria-hidden /> Back
                </button>
              ) : (
                <Consent />
              )}
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-jade px-6 text-[15px] font-semibold text-white shadow-glow transition hover:brightness-110 disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : last ? <Send className="h-4 w-4" aria-hidden /> : null}
                {loading ? "Submitting…" : last ? SUBMIT[type] : "Continue"}
                {!last && !loading && <ArrowRight className="h-4 w-4" aria-hidden />}
              </button>
            </div>
          </m.form>
        )}
      </AnimatePresence>
    </div>
  );
}
