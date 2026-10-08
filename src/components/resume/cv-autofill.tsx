"use client";

import { useState } from "react";
import { Check, FileSearch, Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { isEmptyValue, noticeOption, parseCvFile, parseMyCurrentCv, qualificationLevel, type Confidence, type ResumeFields } from "@/lib/resume/client";
import { CvDropzone, FromCvBadge } from "./cv-ui";

export type CvKey =
  | "first_name"
  | "last_name"
  | "email"
  | "phone"
  | "linkedin_url"
  | "github_url"
  | "portfolio_url"
  | "current_city"
  | "total_experience"
  | "current_designation"
  | "current_company"
  | "highest_qualification"
  | "notice_period_days"
  | "serving_notice"
  | "last_working_day"
  | "current_ctc"
  | "expected_ctc"
  | "dob";

export type CvSuggestion = { key: CvKey; label: string; value: string | boolean; display: string; confidence: Confidence };

const LABEL: Record<CvKey, string> = {
  first_name: "First name",
  last_name: "Last name",
  email: "Email",
  phone: "Mobile",
  linkedin_url: "LinkedIn",
  github_url: "GitHub",
  portfolio_url: "Portfolio",
  current_city: "Current city",
  total_experience: "Total experience",
  current_designation: "Current designation",
  current_company: "Current company",
  highest_qualification: "Highest qualification",
  notice_period_days: "Notice period",
  serving_notice: "Serving notice",
  last_working_day: "Last working day",
  current_ctc: "Current CTC",
  expected_ctc: "Expected CTC",
  dob: "Date of birth",
};

/** parsed resume fields → profile field suggestions */
export function suggestionsFrom(f: ResumeFields, opts: { noticeAsOption?: boolean } = {}): CvSuggestion[] {
  const out: CvSuggestion[] = [];
  const add = (key: CvKey, value: string | boolean | undefined, confidence?: Confidence, display?: string) => {
    if (value === undefined || value === "" || !confidence) return;
    out.push({ key, label: LABEL[key], value, display: display ?? String(value), confidence });
  };
  if (f.full_name) {
    const parts = f.full_name.value.trim().split(/\s+/);
    add("first_name", parts[0], f.full_name.confidence);
    if (parts.length > 1) add("last_name", parts.slice(1).join(" "), f.full_name.confidence);
  }
  add("email", f.email?.value, f.email?.confidence);
  add("phone", f.phone?.value, f.phone?.confidence);
  add("linkedin_url", f.linkedin_url?.value, f.linkedin_url?.confidence);
  add("github_url", f.github_url?.value, f.github_url?.confidence);
  add("portfolio_url", f.portfolio_url?.value, f.portfolio_url?.confidence);
  add("current_city", f.current_city?.value, f.current_city?.confidence);
  if (f.total_experience) add("total_experience", String(f.total_experience.value), f.total_experience.confidence, `${f.total_experience.value} years`);
  add("current_designation", f.current_designation?.value, f.current_designation?.confidence);
  add("current_company", f.current_company?.value, f.current_company?.confidence);
  if (f.highest_qualification) {
    const lvl = qualificationLevel(f.highest_qualification.value);
    add("highest_qualification", lvl, f.highest_qualification.confidence, lvl === f.highest_qualification.value ? lvl : lvl + " (" + f.highest_qualification.value + ")");
  }
  if (f.notice_period_days) {
    const v = opts.noticeAsOption ? noticeOption(f.notice_period_days.value) : String(f.notice_period_days.value);
    add("notice_period_days", v, f.notice_period_days.confidence, f.notice_period_days.value === 0 ? "Immediate" : `${f.notice_period_days.value} days`);
  }
  if (f.serving_notice?.value) add("serving_notice", true, f.serving_notice.confidence, "Yes");
  add("last_working_day", f.last_working_day?.value, f.last_working_day?.confidence);
  if (f.current_ctc) add("current_ctc", String(f.current_ctc.value), f.current_ctc.confidence, `${f.current_ctc.value} LPA`);
  if (f.expected_ctc) add("expected_ctc", String(f.expected_ctc.value), f.expected_ctc.confidence, `${f.expected_ctc.value} LPA`);
  add("dob", f.dob?.value, f.dob?.confidence);
  return out;
}

const same = (a: unknown, b: unknown) => String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

/**
 * "Fill from CV": reads the current CV (portal) or a new upload, then
 *  - fills ONLY empty fields (after the user confirms)
 *  - for fields that already have a different value, shows "CV says: …" with a one-click accept.
 * Never overwrites silently.
 */
export function CvAutofill({
  current,
  currentSkills = [],
  allowCurrentCv,
  title = "Fill from CV",
  description = "We'll read your CV and suggest details. Empty fields can be filled in one click — nothing you already entered is overwritten.",
  onFillEmpty,
  onAccept,
  onParsed,
  applyLabel = "Fill these empty fields",
  defaultOpen = false,
  keys,
}: {
  current: Partial<Record<CvKey, unknown>>;
  currentSkills?: string[];
  allowCurrentCv?: boolean;
  title?: string;
  description?: string;
  onFillEmpty: (values: CvSuggestion[], newSkills: string[], fields: ResumeFields) => unknown | Promise<unknown>;
  onAccept: (s: CvSuggestion) => unknown | Promise<unknown>;
  /** called with the raw parse result and the uploaded file (if any) */
  onParsed?: (fields: ResumeFields, file: File | null) => void;
  applyLabel?: string;
  defaultOpen?: boolean;
  /** only suggest these fields (default: all) */
  keys?: CvKey[];
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const [res, setRes] = useState<{ fields: ResumeFields; warnings: string[] } | null>(null);
  const [skip, setSkip] = useState<Set<CvKey>>(new Set());
  const [accepted, setAccepted] = useState<Set<CvKey>>(new Set());
  const [filled, setFilled] = useState<number | null>(null);

  const run = async (file: File | null) => {
    setBusy(true);
    setFilled(null);
    setAccepted(new Set());
    const r = file ? await parseCvFile(file) : await parseMyCurrentCv();
    setBusy(false);
    setRes({ fields: r.fields, warnings: r.warnings });
    onParsed?.(r.fields, file);
  };

  const sugg = res ? suggestionsFrom(res.fields, { noticeAsOption: true }).filter((x) => !keys || keys.includes(x.key)) : [];
  const empty = sugg.filter((s) => isEmptyValue(current[s.key]) && !(s.key === "serving_notice" && current.serving_notice === true));
  const diffs = sugg.filter((s) => !isEmptyValue(current[s.key]) && !same(current[s.key], s.value) && s.key !== "email");
  const have = new Set(currentSkills.map((x) => x.toLowerCase()));
  const newSkills = (res?.fields.skills?.value ?? []).filter((x) => !have.has(x.toLowerCase()));

  return (
    <section className="rounded-2xl border border-jade/25 bg-jade-50/50 p-4 sm:p-5" aria-label={title}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-jade text-white">
          <FileSearch className="h-[18px] w-[18px]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold text-ink-900">{title}</h2>
          <p className="text-[12.5px] text-ink-500">{description}</p>
        </div>
        {!open && (
          <button type="button" onClick={() => setOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-jade px-3.5 text-[13px] font-semibold text-white hover:bg-[rgb(var(--jade-hover))]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden /> {title}
          </button>
        )}
      </div>

      {open && (
        <div className="mt-4 space-y-4">
          {!res || busy ? (
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-stretch">
              <CvDropzone onFile={(f) => run(f)} busy={busy} compact hint="Upload a new CV · PDF or DOCX · max 4 MB" />
              {allowCurrentCv && !busy && (
                <button type="button" onClick={() => run(null)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-5 py-4 text-[13.5px] font-semibold text-ink-800 hover:border-jade/50">
                  <RefreshCw className="h-4 w-4 text-jade" aria-hidden /> Use my current CV
                </button>
              )}
            </div>
          ) : (
            <>
              {res.warnings.map((w) => (
                <p key={w} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[13px] text-amber-900 dark:bg-amber-400/10 dark:text-amber-200">
                  {w}
                </p>
              ))}

              {empty.length > 0 && filled === null && (
                <div className="rounded-xl border border-line bg-surface p-4">
                  <p className="text-[13px] font-semibold text-ink-900">Empty fields we can fill ({empty.length - empty.filter((s) => skip.has(s.key)).length})</p>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {empty.map((s) => (
                      <li key={s.key}>
                        <label className={cn("flex items-center gap-2.5 rounded-lg border px-3 py-2 text-[13px]", s.confidence === "low" ? "border-amber-300 bg-amber-50/60 dark:bg-amber-400/5" : "border-line")}>
                          <input
                            type="checkbox"
                            checked={!skip.has(s.key)}
                            onChange={(e) => setSkip((p) => {
                              const n = new Set(p);
                              if (e.target.checked) n.delete(s.key);
                              else n.add(s.key);
                              return n;
                            })}
                            className="h-4 w-4 accent-[rgb(var(--jade))]"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[11.5px] text-ink-400">{s.label}</span>
                            <span className="block truncate font-medium text-ink-800">{s.display}</span>
                          </span>
                          <FromCvBadge confidence={s.confidence} label="From CV" />
                        </label>
                      </li>
                    ))}
                  </ul>
                  {newSkills.length > 0 && <p className="mt-3 text-[12.5px] text-ink-600">Also adds {newSkills.length} skill{newSkills.length === 1 ? "" : "s"}: {newSkills.slice(0, 12).join(", ")}</p>}
                  <button
                    type="button"
                    disabled={!!applying}
                    onClick={async () => {
                      setApplying("empty");
                      const chosen = empty.filter((s) => !skip.has(s.key));
                      await onFillEmpty(chosen, newSkills, res.fields);
                      setApplying(null);
                      setFilled(chosen.length + (newSkills.length ? 1 : 0));
                    }}
                    className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-jade px-4 text-[13.5px] font-semibold text-white hover:bg-[rgb(var(--jade-hover))] disabled:opacity-60"
                  >
                    {applying === "empty" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}
                    {applyLabel}
                  </button>
                </div>
              )}
              {empty.length === 0 && newSkills.length > 0 && filled === null && (
                <div className="rounded-xl border border-line bg-surface p-4 text-[13px]">
                  <p className="text-ink-700">Skills found in the CV that aren&apos;t on the profile: {newSkills.join(", ")}</p>
                  <button type="button" onClick={async () => { setApplying("empty"); await onFillEmpty([], newSkills, res.fields); setApplying(null); setFilled(1); }} className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-jade px-3.5 text-[13px] font-semibold text-white">
                    {applying === "empty" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Add these skills
                  </button>
                </div>
              )}
              {filled !== null && (
                <p role="status" className="rounded-lg border border-jade/25 bg-jade-50 px-3 py-2 text-[13px] text-ink-800">
                  ✓ Filled from the CV. Please review the highlighted fields.
                </p>
              )}

              {diffs.length > 0 && (
                <div className="rounded-xl border border-line bg-surface p-4">
                  <p className="text-[13px] font-semibold text-ink-900">Your CV says something different</p>
                  <p className="text-[12px] text-ink-500">Your current values are kept unless you choose to use the CV&apos;s.</p>
                  <ul className="mt-3 divide-y divide-line">
                    {diffs.map((s) => (
                      <li key={s.key} className="flex flex-wrap items-center gap-3 py-2.5 text-[13px]">
                        <span className="w-36 shrink-0 text-ink-500">{s.label}</span>
                        <span className="min-w-0 flex-1">
                          <span className="text-ink-800">{String(current[s.key])}</span>
                          <span className="ml-2 text-ink-500">
                            CV says: <b className="font-semibold text-jade-700">{s.display}</b>
                          </span>
                        </span>
                        {accepted.has(s.key) ? (
                          <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-jade-700">
                            <Check className="h-3.5 w-3.5" aria-hidden /> Updated
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={!!applying}
                            onClick={async () => {
                              setApplying(s.key);
                              await onAccept(s);
                              setApplying(null);
                              setAccepted((p) => new Set(p).add(s.key));
                            }}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-jade/40 px-3 text-[12.5px] font-semibold text-jade-700 hover:bg-jade-50"
                          >
                            {applying === s.key && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />} Use this
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {empty.length === 0 && diffs.length === 0 && newSkills.length === 0 && !res.warnings.length && (
                <p className="text-[13px] text-ink-600">Everything we found in the CV already matches the profile.</p>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => setRes(null)} className="text-[13px] font-semibold text-jade-700 hover:underline">
                  Read another CV
                </button>
                <button type="button" onClick={() => { setRes(null); setOpen(false); }} className="inline-flex items-center gap-1 text-[13px] text-ink-500 hover:text-ink-800">
                  <X className="h-3.5 w-3.5" aria-hidden /> Close
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
