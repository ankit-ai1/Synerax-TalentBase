/**
 * Job-description parsing (rule-based, no AI — the same free approach as the resume parser).
 * Pure: plain text in, suggested job fields out, each with a confidence. Unit-tested in tests/jd.test.ts.
 */
import { cleanText, extractSkills, splitSections } from "@/lib/resume/rules";
import { INDIAN_CITIES } from "@/lib/resume/data";
import type { Confidence, Field, SkillDef } from "@/lib/resume/types";
import { parseMoney, type Period } from "@/lib/money";

export type JdFields = {
  title?: Field<string>;
  locations?: Field<string[]>;
  work_mode?: Field<"Remote" | "Hybrid" | "Onsite">;
  exp_min?: Field<number>;
  exp_max?: Field<number>;
  employment_type?: Field<string>;
  skills?: Field<string[]>;
  salary?: Field<{ min: number | null; max: number | null; currency: string; period: Period }>;
  openings?: Field<number>;
  qualification?: Field<string>;
  description?: Field<string>;
  responsibilities?: Field<string[]>;
  requirements?: Field<string[]>;
};

const f = <T>(value: T, confidence: Confidence): Field<T> => ({ value, confidence });
const FOREIGN_CITIES = ["Dubai", "Abu Dhabi", "Sharjah", "Riyadh", "Jeddah", "Doha", "Muscat", "Kuwait City", "Manama", "Singapore", "London", "New York", "San Francisco", "Toronto", "Sydney"];

const RESP = /^(?:key\s+|roles?\s*(?:&|and)\s*|your\s+)?(responsibilities|duties|what you(?:'|’)?ll do|what you will do|the role|job responsibilities|role description)\b/i;
const REQ = /^(requirements?|qualifications?|must[- ]haves?|skills?\s*(?:required|&\s*experience)?|what we(?:'|’)?re looking for|what we are looking for|who you are|eligibility|desired (?:skills|profile)|candidate profile|technical skills)\b/i;
const OTHER = /^(benefits|perks|what we offer|about (?:us|the company)|company overview|salary|compensation|location|how to apply|nice to have|good to have)\b/i;

/** lines under the responsibilities / requirements headings (bullets stripped) */
function sectionLines(lines: string[]) {
  const out = { responsibilities: [] as string[], requirements: [] as string[] };
  let cur: keyof typeof out | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const head = line.replace(/[:\-–]+$/, "").trim();
    if (head.length <= 60 && RESP.test(head)) {
      cur = "responsibilities";
      const rest = line.split(/[:]\s*/).slice(1).join(":").trim();
      if (rest) out[cur].push(rest);
      continue;
    }
    if (head.length <= 60 && REQ.test(head)) {
      cur = "requirements";
      const rest = line.split(/[:]\s*/).slice(1).join(":").trim();
      if (rest) out[cur].push(rest);
      continue;
    }
    if (head.length <= 60 && OTHER.test(head)) {
      cur = null;
      continue;
    }
    if (cur) out[cur].push(line.replace(/^[•●▪◦\-–*·>]\s*|^\d+[.)]\s+/, ""));
  }
  return { responsibilities: out.responsibilities.slice(0, 25), requirements: out.requirements.slice(0, 25) };
}

const labeled = (text: string, labels: string) => new RegExp(String.raw`^\s*(?:${labels})\s*[:\-–]\s*(.+)$`, "im").exec(text)?.[1]?.trim();

function extractTitle(lines: string[], text: string): Field<string> | undefined {
  const lab = labeled(text, "job\\s*title|position|role|designation|opening|title");
  if (lab && lab.length <= 90) return f(lab.replace(/\s*[|–-]\s*(job description|jd)$/i, ""), "high");
  for (const l of lines.slice(0, 6)) {
    const t = l.replace(/^(job description|jd)\s*[:\-–]?\s*/i, "").trim();
    if (!t || t.length > 80 || /@|https?:|\d{6,}/.test(t)) continue;
    if (/^(job description|about|company|location|experience)\b/i.test(t)) continue;
    if (t.split(/\s+/).length <= 9) return f(t, "medium");
  }
  return undefined;
}

function extractLocations(text: string): Field<string[]> | undefined {
  const lab = labeled(text, "locations?|job\\s*location|work\\s*location|based\\s*(?:in|at)|city");
  const names = (src: string) => {
    const found: string[] = [];
    for (const c of INDIAN_CITIES) if ([c.name, ...c.aliases].some((a) => new RegExp(`\\b${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(src))) found.push(c.name);
    for (const c of FOREIGN_CITIES) if (new RegExp(`\\b${c}\\b`, "i").test(src)) found.push(c);
    return [...new Set(found)];
  };
  if (lab) {
    const n = names(lab);
    if (n.length) return f(n.slice(0, 5), "high");
    const parts = lab.split(/[,/;|]| or | and /i).map((x) => x.replace(/\(.*?\)/g, "").trim()).filter((x) => x && x.length <= 30 && !/remote|hybrid|onsite|office|home/i.test(x));
    if (parts.length) return f(parts.slice(0, 5), "medium");
  }
  const n = names(text.slice(0, 3000));
  return n.length ? f(n.slice(0, 3), "low") : undefined;
}

function extractWorkMode(raw: string): Field<"Remote" | "Hybrid" | "Onsite"> | undefined {
  // "remote is not possible", "no remote", "non-remote" don't count as remote
  const neg = (s: string) => s.replace(/\b(?:not|no|non)[- ]+(?:fully\s+)?remote\b|\b(?:fully\s+)?remote\s+(?:work\s+)?(?:is\s+)?not\s+(?:possible|available|allowed|an option)/gi, "");
  const text = neg(raw);
  const lab = neg(labeled(raw, "work\\s*mode|work\\s*model|mode|workplace|work\\s*type") ?? "");
  const src = `${lab}\n${text}`;
  if (/\bhybrid\b/i.test(lab) || (!lab && /\bhybrid\b/i.test(text))) return f("Hybrid", lab ? "high" : "medium");
  if (/\b(remote|work from home|wfh|fully remote)\b/i.test(lab || src)) return f("Remote", lab ? "high" : "medium");
  if (/\b(on[- ]?site|work from office|wfo|in[- ]office)\b/i.test(lab || src)) return f("Onsite", lab ? "high" : "medium");
  return undefined;
}

function extractExperience(text: string): Pick<JdFields, "exp_min" | "exp_max"> {
  const lab = labeled(text, "experience|exp|years of experience|work experience") ?? "";
  for (const [src, conf] of [[lab, "high"], [text, "medium"]] as const) {
    if (!src) continue;
    const range = /(\d{1,2}(?:\.\d)?)\s*\+?\s*(?:-|–|to)\s*(\d{1,2}(?:\.\d)?)\s*\+?\s*(?:years?|yrs?)/i.exec(src);
    if (range && Number(range[1]) <= Number(range[2])) return { exp_min: f(Number(range[1]), conf), exp_max: f(Number(range[2]), conf) };
    const min = /(?:minimum|min\.?|at least|over)?\s*(\d{1,2}(?:\.\d)?)\s*\+?\s*(?:years?|yrs?)(?:\s+of)?(?:\s+\w+){0,4}\s+experience/i.exec(src) ?? (src === lab ? /(\d{1,2}(?:\.\d)?)\s*\+?\s*(?:years?|yrs?)/i.exec(src) : null);
    if (min) return { exp_min: f(Number(min[1]), conf) };
    if (/\bfreshers?\b/i.test(src)) return { exp_min: f(0, "medium"), exp_max: f(1, "low") };
  }
  return {};
}

function extractEmployment(text: string): Field<string> | undefined {
  const lab = labeled(text, "employment\\s*type|job\\s*type|type") ?? "";
  const src = lab || text;
  const conf: Confidence = lab ? "high" : "medium";
  if (/\bintern(ship)?\b/i.test(src)) return f("Internship", conf);
  if (/\bcontract[- ]to[- ]hire\b|\bc2h\b/i.test(src)) return f("Contract", conf);
  if (/\b(contract|contractual|temporary|freelance)\b/i.test(src) && !/\bpermanent\b/i.test(lab)) return f(/freelance/i.test(src) ? "Freelance" : "Contract", conf);
  if (/\bpart[- ]time\b/i.test(src)) return f("Part-time", conf);
  if (/\b(full[- ]time|permanent)\b/i.test(src)) return f("Full-time", conf);
  return undefined;
}

/** "12 - 18 LPA", "AED 15,000 – 20,000 per month", "$90k-110k", "up to 25 LPA" */
export function extractSalary(text: string): JdFields["salary"] {
  const line = labeled(text, "ctc|salary|compensation|package|budget|pay|remuneration") ?? /(?:ctc|salary|compensation|package|budget)[^\n]{0,80}/i.exec(text)?.[0];
  if (!line || /not disclosed|negotiable|best in (?:the )?industry|as per/i.test(line) && !/\d/.test(line)) return undefined;
  const one = parseMoney(line);
  if (!one || one.amount == null) return undefined;
  const nums = [...line.replace(/(\d),(?=\d)/g, "$1").matchAll(/(\d+(?:\.\d+)?)\s*(k|l|lpa|lakhs?|lacs?)?/gi)].map((m) => ({ n: Number(m[1]), unit: (m[2] ?? "").toLowerCase() }));
  if (!nums.length) return undefined;
  const unitOf = nums.find((x) => x.unit)?.unit ?? "";
  const val = (x: { n: number; unit: string }) => {
    const u = x.unit || unitOf;
    let n = x.n;
    if (u === "k") n *= 1000;
    if (one.currency === "INR" && one.period === "annual" && !/l/.test(u) && n >= 1000) n = n / 100000; // rupees → lakhs
    return Math.round(n * 100) / 100;
  };
  const upTo = /\b(up\s*to|max(?:imum)?|till)\b/i.test(line);
  const min = nums.length >= 2 ? val(nums[0]) : upTo ? null : val(nums[0]);
  const max = nums.length >= 2 ? val(nums[1]) : upTo ? val(nums[0]) : null;
  if (min != null && max != null && min > max) return undefined;
  return f({ min, max, currency: one.currency, period: one.period }, /\b(lpa|lakh|ctc|per|month|annum|year|aed|usd|\$|₹)/i.test(line) ? "high" : "medium");
}

export function parseJd(raw: string, skillDefs: SkillDef[] = []): JdFields {
  const text = cleanText(raw);
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const out: JdFields = {};
  const title = extractTitle(lines, text);
  if (title) out.title = title;
  const loc = extractLocations(text);
  if (loc) out.locations = loc;
  const mode = extractWorkMode(text);
  if (mode) out.work_mode = mode;
  Object.assign(out, extractExperience(text));
  const emp = extractEmployment(text);
  if (emp) out.employment_type = emp;
  const sal = extractSalary(text);
  if (sal) out.salary = sal;
  const openings = /(?:no\.?\s*of\s*)?(?:openings|positions|vacancies)\s*[:\-–]?\s*(\d{1,3})\b/i.exec(text) ?? /\b(\d{1,3})\s+(?:openings|positions|vacancies)\b/i.exec(text);
  if (openings && Number(openings[1]) > 0) out.openings = f(Number(openings[1]), "medium");
  const qual = labeled(text, "qualification|education|eligibility");
  if (qual && qual.length <= 120) out.qualification = f(qual, "medium");
  const sec = sectionLines(lines);
  if (sec.responsibilities.length) out.responsibilities = f(sec.responsibilities, "high");
  if (sec.requirements.length) out.requirements = f(sec.requirements, "high");
  // skills: weight the requirements section like a CV's skills section
  const sections = splitSections(text);
  sections.skills = [...sections.skills, ...sec.requirements];
  const sk = extractSkills(sections, text, skillDefs);
  if (sk) out.skills = sk;
  out.description = f(text.slice(0, 8000), "high");
  return out;
}
