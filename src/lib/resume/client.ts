/** Browser helpers for resume parsing (calls POST /api/resume/parse) */
import type { Confidence, ResumeFields } from "./types";

export type { Confidence, ResumeFields };
export type ParseResponse = { fields: ResumeFields; confidence: number; warnings: string[]; error?: string };

async function post(body: FormData): Promise<ParseResponse> {
  try {
    const res = await fetch("/api/resume/parse", { method: "POST", body });
    const json = (await res.json().catch(() => ({}))) as Partial<ParseResponse> & { error?: string };
    if (!res.ok) return { fields: {}, confidence: 0, warnings: [json.error ?? "We couldn't read this CV, please fill the details manually."] };
    return { fields: json.fields ?? {}, confidence: json.confidence ?? 0, warnings: json.warnings ?? [] };
  } catch {
    return { fields: {}, confidence: 0, warnings: ["We couldn't read this CV, please fill the details manually."] };
  }
}

export const parseCvFile = (file: File) => {
  const fd = new FormData();
  fd.set("file", file);
  return post(fd);
};

/** candidate portal: my current CV */
export const parseMyCurrentCv = () => {
  const fd = new FormData();
  fd.set("current", "1");
  return post(fd);
};

/** staff: a candidate's current CV ("Re-parse CV"); also refreshes the stored CV text used by search */
export const reparseCandidateCv = (candidateId: string) => {
  const fd = new FormData();
  fd.set("candidate_id", candidateId);
  fd.set("store", "1");
  return post(fd);
};

/** nearest notice option value (0, 15, 30, 45, 60, 90, 120) */
export function noticeOption(days: number) {
  const opts = [0, 15, 30, 45, 60, 90, 120];
  return String(opts.reduce((best, o) => (Math.abs(o - days) < Math.abs(best - days) ? o : best), opts[0]));
}

export const yearsMonths = (years: number) => {
  const y = Math.floor(years);
  const m = Math.round((years - y) * 12);
  return m === 12 ? { y: y + 1, m: 0 } : { y, m };
};

/** canonical city from our CITIES list (Bengaluru → Bangalore etc. already handled by the parser) */
export function matchCity(city: string, cities: readonly string[]) {
  return cities.find((c) => c.toLowerCase() === city.toLowerCase()) ?? city;
}

export const isEmptyValue = (v: unknown) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0) || v === "0" || v === 0;

/** parsed degree ("B.Tech", "MBA", …) → our qualification levels (10th / 12th / Diploma / ITI / Graduation / Post Graduation / PhD) */
export function qualificationLevel(degree: string) {
  const d = degree.toLowerCase().replace(/[.\s]/g, "");
  if (d === "phd") return "PhD";
  if (/^(mtech|me|mba|pgdm|mca|msc|mcom|mpharm|ma|ca)$/.test(d)) return "Post Graduation";
  if (/^(btech|be|bca|bscnursing|bsc|bcom|bba|bpharm|llb|ba|mbbs)$/.test(d)) return "Graduation";
  if (d === "diploma" || d === "gnm") return "Diploma";
  if (d === "12th") return "12th";
  if (d === "10th") return "10th";
  return degree;
}
