"use client";

import type { JdFields } from "@/lib/jd/rules";
import type { Confidence } from "@/lib/resume/types";
import type { Skill } from "@/lib/types";
import { EMPLOYMENT_TYPES, QUALIFICATIONS } from "@/lib/constants";
import type { JobFormData } from "./job-defaults";

export type JdMeta = Partial<Record<keyof JobFormData, Confidence>>;

/** read a JD file on the server (nothing is saved) */
export async function parseJdFile(file: File): Promise<{ fields: JdFields; warnings: string[]; error?: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/jobs/parse-jd", { method: "POST", body: fd }).catch(() => null);
  const j = (await res?.json().catch(() => ({}))) as { fields?: JdFields; warnings?: string[]; error?: string };
  if (!res?.ok) return { fields: {}, warnings: [], error: j.error ?? "Could not read the JD" };
  return { fields: j.fields ?? {}, warnings: j.warnings ?? [] };
}

/** "Responsibilities / Requirements" as readable text for the description box */
export function jdDescription(f: JdFields) {
  return f.description?.value?.trim() ?? "";
}

/** skill names from the JD → master skills (by name or alias); unknown names are skipped */
export function matchSkills(names: string[], master: Skill[]) {
  const by = new Map<string, Skill>();
  for (const s of master) {
    by.set(s.name.toLowerCase(), s);
    for (const a of s.aliases ?? []) by.set(a.toLowerCase(), s);
  }
  const out: Skill[] = [];
  for (const n of names) {
    const s = by.get(n.toLowerCase());
    if (s && !out.some((x) => x.id === s.id)) out.push(s);
  }
  return out;
}

const blank = (v: unknown) => v === "" || v == null || (Array.isArray(v) && v.length === 0);

/** fill EMPTY form fields from a parsed JD; returns the new form + which fields came from the JD */
export function applyJd(prev: JobFormData, f: JdFields, master: Skill[]): { next: JobFormData; meta: JdMeta } {
  const next = { ...prev };
  const meta: JdMeta = {};
  const put = <K extends keyof JobFormData>(k: K, v: JobFormData[K] | undefined, c: Confidence | undefined, force = false) => {
    if (v === undefined || blank(v) || c === undefined) return;
    if (!force && !blank(prev[k])) return;
    next[k] = v;
    meta[k] = c;
  };
  put("title", f.title?.value, f.title?.confidence);
  put("locations", f.locations?.value, f.locations?.confidence);
  put("work_mode", f.work_mode?.value, f.work_mode?.confidence);
  put("exp_min", f.exp_min ? String(f.exp_min.value) : undefined, f.exp_min?.confidence);
  put("exp_max", f.exp_max ? String(f.exp_max.value) : undefined, f.exp_max?.confidence);
  if (f.employment_type && EMPLOYMENT_TYPES.includes(f.employment_type.value)) put("employment_type", f.employment_type.value, f.employment_type.confidence, prev.employment_type === "Full-time");
  if (f.openings && (prev.openings === "1" || blank(prev.openings))) put("openings", String(f.openings.value), f.openings.confidence, true);
  if (f.qualification) {
    const q = QUALIFICATIONS.find((x) => f.qualification!.value.toLowerCase().includes(x.toLowerCase()));
    if (q) put("qualification", q, "low");
  }
  if (f.salary && blank(prev.ctc_min) && blank(prev.ctc_max)) {
    const s = f.salary.value;
    next.ctc_min = s.min == null ? "" : String(s.min);
    next.ctc_max = s.max == null ? "" : String(s.max);
    next.ctc_currency = s.currency;
    next.ctc_period = s.period;
    meta.ctc_min = f.salary.confidence;
  }
  put("description", jdDescription(f), f.description?.confidence);
  if (f.skills?.value.length) {
    const add = matchSkills(f.skills.value, master).filter((s) => !prev.skills.some((x) => x.skill_id === s.id));
    if (add.length) {
      next.skills = [...prev.skills, ...add.map((s) => ({ skill_id: s.id, name: s.name, is_mandatory: true, min_years: "" }))];
      meta.skills = f.skills.confidence;
    }
  }
  return { next, meta };
}
