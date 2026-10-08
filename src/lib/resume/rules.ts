/**
 * Rule-based resume field extraction (no AI, no network). Pure functions over plain text, so they can be
 * unit-tested without a database. Every field carries a confidence: high / medium / low.
 */
import { BUILTIN_SKILLS, INDIAN_CITIES } from "./data";
import type { Confidence, EduItem, Field, ParseOptions, ResumeFields, SkillDef, WorkItem } from "./types";

// ------------------------------------------------------------------ text + sections

export type SectionKey = "header" | "summary" | "experience" | "education" | "skills" | "projects" | "certifications" | "personal" | "other";

const SECTION_PATTERNS: [SectionKey, RegExp][] = [
  ["summary", /^(professional\s+|profile\s+|career\s+|executive\s+)?(summary|profile|objective|career objective|about me|overview)$/],
  ["experience", /^((work|professional|employment|career|relevant|industry)\s+)?(experience|history|work history|employment history)( details| summary)?$|^employment$|^internships?$|^work experience$/],
  ["education", /^(education(al)?( background| qualifications?| details)?|academic( details| qualifications?| background| credentials)?|qualifications?)$/],
  ["skills", /^((key|technical|core|professional|it|soft|primary)\s+)?(skills?|skill set|skillset|competencies|expertise|technologies|tech stack)( & tools| and tools| summary)?$|^areas of expertise$|^tools( & technologies)?$/],
  ["projects", /^((key|academic|major|personal|notable)\s+)?projects?( undertaken| handled)?$/],
  ["certifications", /^(certifications?|certificates|licen[cs]es?( & certifications)?|trainings?( & certifications)?)$/],
  ["personal", /^(personal (details|information|profile|data)|contact( details| information)?)$/],
  ["other", /^(achievements|awards|accomplishments|languages( known)?|hobbies|interests|declaration|references|extra[- ]curricular( activities)?|strengths)$/],
];

/** normalise whitespace but keep line structure */
export function cleanText(raw: string) {
  return raw
    .replace(/\r/g, "")
    .replace(/[   ]/g, " ")
    .replace(/[•●▪◦‣⁃➢✓✔]/g, "•")
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function headingKey(line: string): SectionKey | null {
  const t = line
    .replace(/^[•\-*–—#>\d.)\s]+/, "")
    .replace(/[:|\-–—_=]+$/, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!t || t.length > 40) return null;
  for (const [k, re] of SECTION_PATTERNS) if (re.test(t)) return k;
  return null;
}

export function splitSections(text: string): Record<SectionKey, string[]> {
  const out: Record<SectionKey, string[]> = { header: [], summary: [], experience: [], education: [], skills: [], projects: [], certifications: [], personal: [], other: [] };
  let cur: SectionKey = "header";
  for (const line of text.split("\n")) {
    if (!line) continue;
    // "Skills: Java, Python" — heading with content on the same line
    const inline = line.match(/^([A-Za-z &]{3,30})\s*[:|–-]\s+(.+)$/);
    const k = headingKey(line) ?? (inline ? headingKey(inline[1]) : null);
    if (k) {
      cur = k;
      if (inline && headingKey(inline[1])) out[cur].push(inline[2]);
      continue;
    }
    out[cur].push(line);
  }
  return out;
}

// ------------------------------------------------------------------ helpers

const f = <T>(value: T, confidence: Confidence): Field<T> => ({ value, confidence });
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const monthIdx = (m: string) => MONTHS.indexOf(m.slice(0, 3).toLowerCase());
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const titleCase = (s: string) =>
  s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w.length <= 2 && /\./.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");

// ------------------------------------------------------------------ contact

export function extractEmail(text: string): Field<string> | undefined {
  const m = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return m ? f(m[0].toLowerCase(), "high") : undefined;
}

/** Indian mobile → 10 digits (handles +91 / 91 / 0 prefixes, spaces, dashes, brackets) */
export function normaliseIndianMobile(raw: string): string | null {
  let d = raw.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}

export function extractPhone(text: string): Field<string> | undefined {
  const re = /\+?\(?\d[\d\s().-]{8,16}\d/g;
  for (const m of text.matchAll(re)) {
    const n = normaliseIndianMobile(m[0]);
    if (n) {
      // ignore digits that are part of a longer number (IDs, account numbers)
      const before = text[(m.index ?? 0) - 1] ?? " ";
      const after = text[(m.index ?? 0) + m[0].length] ?? " ";
      if (/\d/.test(before) || /\d/.test(after)) continue;
      return f(n, "high");
    }
  }
  return undefined;
}

export function extractUrls(text: string) {
  const out: Pick<ResumeFields, "linkedin_url" | "github_url" | "portfolio_url"> = {};
  const li = text.match(/(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/(?:in|pub)\/[A-Za-z0-9_%\-]+\/?/i);
  if (li) out.linkedin_url = f(li[0].startsWith("http") ? li[0] : `https://${li[0]}`, "high");
  const gh = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_\-]+\/?/i);
  if (gh) out.github_url = f(gh[0].startsWith("http") ? gh[0] : `https://${gh[0]}`, "high");
  for (const m of text.matchAll(/\b(?:https?:\/\/|www\.)[^\s,;|()<>]+/gi)) {
    const u = m[0].replace(/[.)]+$/, "");
    if (/linkedin\.com|github\.com|mailto:|google\.com\/maps/i.test(u)) continue;
    out.portfolio_url = f(u.startsWith("http") ? u : `https://${u}`, "medium");
    break;
  }
  return out;
}

// ------------------------------------------------------------------ name

const NOT_NAME = /\b(resume|curriculum|vitae|cv|profile|summary|objective|address|email|phone|mobile|contact|india|engineer|developer|manager|executive|analyst|consultant|nurse|accountant|designer|linkedin|github|years?|experience)\b/i;

export function extractName(lines: string[], email?: string): Field<string> | undefined {
  const top = lines.filter(Boolean).slice(0, 8);
  for (let i = 0; i < top.length; i++) {
    let l = top[i].replace(/^(name\s*[:\-]\s*)/i, "").trim();
    // "John Doe | john@x.com | 98..." → take the first segment
    l = l.split(/\s*[|•,]\s*|\s{3,}/)[0].trim();
    if (!l || /[@\d/\\]|https?:|www\./i.test(l) || NOT_NAME.test(l)) continue;
    const words = l.split(/\s+/);
    if (words.length < 2 || words.length > 4) continue;
    if (!words.every((w) => /^[A-Z][A-Za-z'.-]*$/.test(w) || /^[A-Z][A-Z'.-]+$/.test(w))) continue;
    return f(titleCase(l), i === 0 ? "high" : "medium");
  }
  if (email) {
    const local = email.split("@")[0].replace(/\d+/g, "");
    const parts = local.split(/[._-]+/).filter((p) => p.length > 1);
    if (parts.length >= 2) return f(titleCase(parts.slice(0, 3).join(" ")), "low");
  }
  return undefined;
}

// ------------------------------------------------------------------ skills

const AMBIGUOUS = new Set(["c", "r", "go", "express", "spring", "accounts", "inventory", "rest", "ts", "js", "ml", "bd", "qc", "vue", "node", "mongo", "rails", "unix", "oracle", "swift", "sales", "communication", "tally", "nursing", "icu", "seo", "sem", "tds", "hiring"]);

type Matcher = { name: string; res: { re: RegExp; ambiguous: boolean; exact: RegExp }[] };

function buildMatchers(defs: SkillDef[]): Matcher[] {
  const byName = new Map<string, SkillDef>();
  for (const d of [...BUILTIN_SKILLS, ...defs]) {
    const key = d.name.toLowerCase();
    const prev = byName.get(key);
    byName.set(key, { name: prev && defs.includes(d) ? d.name : prev?.name ?? d.name, aliases: [...new Set([...(prev?.aliases ?? []), ...(d.aliases ?? [])])] });
  }
  return [...byName.values()].map((d) => ({
    name: d.name,
    res: [d.name, ...(d.aliases ?? [])]
      .filter(Boolean)
      .map((alias) => {
        const lead = alias.startsWith(".") ? "(?<![A-Za-z0-9])" : "(?<![A-Za-z0-9+#.])";
        const body = escapeRe(alias).replace(/ /g, "[\\s.-]?");
        const trail = "(?![A-Za-z0-9+#])";
        return { re: new RegExp(lead + body + trail, "gi"), exact: new RegExp(lead + body + trail, "g"), ambiguous: AMBIGUOUS.has(alias.toLowerCase()) || alias.length <= 2 };
      }),
  }));
}

export function extractSkills(sections: Record<SectionKey, string[]>, text: string, defs: SkillDef[] = []): Field<string[]> | undefined {
  const matchers = buildMatchers(defs);
  const skillsText = [...sections.skills, ...sections.certifications].join("\n");
  const scores = new Map<string, { score: number; inSkills: boolean }>();
  for (const m of matchers) {
    let score = 0;
    let inSkills = false;
    for (const { re, ambiguous, exact } of m.res) {
      const s = (skillsText.match(re) ?? []).length;
      if (s) {
        score += s * 3;
        inSkills = true;
      }
      // outside the skills section, ambiguous aliases only count with exact casing (e.g. "Node", "Go")
      const rest = (text.match(ambiguous ? exact : re) ?? []).length - s;
      if (rest > 0 && (!ambiguous || m.name.length > 2)) score += rest;
    }
    if (score > 0) scores.set(m.name, { score, inSkills });
  }
  // drop "Java" when only "JavaScript" mentions exist etc. are handled by the boundary rules
  const ranked = [...scores.entries()].sort((a, b) => b[1].score - a[1].score || a[0].localeCompare(b[0]));
  if (!ranked.length) return undefined;
  const top = ranked.slice(0, 15).map(([n]) => n);
  const anyInSkills = ranked.some(([, v]) => v.inSkills);
  return f(top, anyInSkills ? "high" : "medium");
}

// ------------------------------------------------------------------ dates + experience

type YM = { y: number; m: number };
const NOW = (): YM => {
  const d = new Date();
  return { y: d.getFullYear(), m: d.getMonth() };
};

const DATE_TOKEN = String.raw`(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?[\s,'-]*\d{2,4}|\d{1,2}[/.-]\d{4}|\d{4}[/.-]\d{1,2}|(?:19|20)\d{2})`;
const END_TOKEN = String.raw`(?:present|current(?:ly)?|till\s*(?:date|now)|to\s*date|now|ongoing|today)`;
export const RANGE_RE = new RegExp(`(${DATE_TOKEN})\\s*(?:-|–|—|to|till|until|~)\\s*(${DATE_TOKEN}|${END_TOKEN})`, "i");

function parseYM(tok: string, isEnd: boolean): YM | null {
  const t = tok.trim().toLowerCase();
  if (new RegExp(`^${END_TOKEN}$`, "i").test(t)) return NOW();
  let m = t.match(/^([a-z]+)\.?[\s,'-]*(\d{2,4})$/);
  if (m && monthIdx(m[1]) >= 0) {
    const y = m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2]);
    return { y, m: monthIdx(m[1]) };
  }
  m = t.match(/^(\d{1,2})[/.-](\d{4})$/);
  if (m) return { y: Number(m[2]), m: Math.min(11, Math.max(0, Number(m[1]) - 1)) };
  m = t.match(/^(\d{4})[/.-](\d{1,2})$/);
  if (m) return { y: Number(m[1]), m: Math.min(11, Math.max(0, Number(m[2]) - 1)) };
  m = t.match(/^((?:19|20)\d{2})$/);
  if (m) return { y: Number(m[1]), m: isEnd ? 11 : 0 };
  return null;
}

const ymStr = (v: YM) => `${v.y}-${String(v.m + 1).padStart(2, "0")}`;
const toMonths = (v: YM) => v.y * 12 + v.m;

type Range = { from: YM; to: YM; raw: string; line: number; present: boolean };

function findRanges(lines: string[]): Range[] {
  const out: Range[] = [];
  lines.forEach((l, i) => {
    const m = l.match(RANGE_RE);
    if (!m) return;
    const from = parseYM(m[1], false);
    const to = parseYM(m[2], true);
    if (!from || !to || toMonths(to) < toMonths(from) || from.y < 1975 || to.y > NOW().y + 1) return;
    out.push({ from, to, raw: m[0], line: i, present: new RegExp(END_TOKEN, "i").test(m[2]) });
  });
  return out;
}

/** merge overlapping ranges and return the total in years (one decimal) */
export function totalFromRanges(ranges: { from: YM; to: YM }[]) {
  const iv = ranges.map((r) => [toMonths(r.from), toMonths(r.to) + 1] as [number, number]).sort((a, b) => a[0] - b[0]);
  let total = 0;
  let cur: [number, number] | null = null;
  for (const [s, e] of iv) {
    if (!cur || s > cur[1]) {
      if (cur) total += cur[1] - cur[0];
      cur = [s, e];
    } else cur[1] = Math.max(cur[1], e);
  }
  if (cur) total += cur[1] - cur[0];
  return Math.round((total / 12) * 10) / 10;
}

export function extractExperience(text: string, sections: Record<SectionKey, string[]>): Field<number> | undefined {
  // explicit statements, e.g. "5+ years", "4.5 yrs", "3 years 6 months of experience"
  const re = /(\d{1,2}(?:\.\d{1,2})?)\s*\+?\s*(?:years?|yrs?)\.?(?:\s*(?:and\s*)?(\d{1,2})\s*(?:months?|mos?))?/gi;
  const candidates: { v: number; strong: boolean }[] = [];
  for (const line of text.split("\n")) {
    if (!/experience|exp\b|career/i.test(line)) continue;
    for (const m of line.matchAll(re)) {
      const v = Number(m[1]) + (m[2] ? Number(m[2]) / 12 : 0);
      if (v > 0 && v < 45) candidates.push({ v: Math.round(v * 10) / 10, strong: /total\s+experience|overall|experience\s*[:\-]/i.test(line) });
    }
  }
  const strong = candidates.find((c) => c.strong);
  if (strong) return f(strong.v, "high");
  const ranges = findRanges(sections.experience.length ? sections.experience : text.split("\n"));
  if (ranges.length) {
    const years = totalFromRanges(ranges);
    if (candidates.length) {
      const best = candidates.sort((a, b) => b.v - a.v)[0];
      // a stated figure that roughly agrees with the dates is the most reliable
      return f(best.v, Math.abs(best.v - years) <= 1.5 ? "high" : "medium");
    }
    return f(years, sections.experience.length ? "medium" : "low");
  }
  if (candidates.length) return f(candidates.sort((a, b) => b.v - a.v)[0].v, "medium");
  if (/\bfresher\b|\bfresh graduate\b|\b0\s*years?\b/i.test(text)) return f(0, "low");
  return undefined;
}

// ------------------------------------------------------------------ work history

const TITLE_WORDS = /\b(engineer|developer|manager|executive|analyst|lead|consultant|associate|intern|trainee|nurse|accountant|designer|architect|officer|specialist|administrator|admin|tester|head|director|coordinator|supervisor|representative|programmer|scientist|recruiter|technician|operator|assistant|advisor|agent|cashier|teacher|lecturer|professor|chef|driver|staff|sde|qa|founder|partner|owner|incharge|in-charge)\b/i;
const STRONG_COMPANY = /\b(ltd|limited|pvt|private|inc|llp|llc|corp|corporation|hospitals?|bank)\b|\bco\./i;
const COMPANY_WORDS = /\b(ltd|limited|pvt|private|inc|llp|llc|corp|corporation|company|co\.|technologies|technology|tech|solutions|services|systems|consultancy|consulting|software|infotech|infosys|tcs|wipro|accenture|cognizant|hcl|capgemini|ibm|deloitte|bank|hospital|hospitals|healthcare|labs|group|industries|enterprises|global|international|pharma|logistics|retail|motors|foods|finance|financial|insurance|networks|digital|media|studio|agency|school|college|university)\b/i;

function cleanPart(s: string) {
  return s.replace(/^[•\-*–—|,:()\s]+|[•\-*–—|,:()\s]+$/g, "").replace(/\s{2,}/g, " ").trim();
}

export function extractWorkHistory(sections: Record<SectionKey, string[]>): WorkItem[] {
  const lines = sections.experience;
  const ranges = findRanges(lines);
  const items: WorkItem[] = [];
  for (const r of ranges) {
    const same = cleanPart(lines[r.line].replace(r.raw, " ").replace(/[()]/g, " "));
    const isCity = (p: string) => INDIAN_CITIES.some((c) => c.aliases.some((a) => a.toLowerCase() === p.toLowerCase().replace(/,.*$/, "").trim()));
    const parts = same
      .split(/\s+(?:at|@)\s+|\s*[|•·]\s*|\s+[-–—]\s+|\s*,\s*(?![^()]*\))/)
      .map(cleanPart)
      .filter((p) => p && p.length > 1 && !/^(present|current|ltd\.?|pvt\.?)$/i.test(p) && !isCity(p));
    const hasTitle = () => parts.some((p) => TITLE_WORDS.test(p) && !STRONG_COMPANY.test(p));
    // look up to 2 lines above for the title / company (common two-line layouts)
    for (let k = 1; k <= 2 && (parts.length < 2 || !hasTitle()); k++) {
      const prev = lines[r.line - k];
      if (!prev || RANGE_RE.test(prev) || /^[•\-*]/.test(prev) || prev.length > 90) break;
      parts.unshift(
        ...prev
          .split(/\s+(?:at|@)\s+|\s*[|•]\s*|\s+[-–—]\s+|\s*,\s*/)
          .map(cleanPart)
          .filter((p) => p && p.length > 1)
      );
    }
    // and one line below (layout: "Company · dates" then "Title")
    if (parts.length < 2) {
      const next = lines[r.line + 1];
      if (next && !RANGE_RE.test(next) && !/^[•\-*]/.test(next) && next.length < 70) parts.push(cleanPart(next));
    }
    const titleScore = (p: string) => (TITLE_WORDS.test(p) ? 2 : 0) - (STRONG_COMPANY.test(p) ? 3 : 0) - (COMPANY_WORDS.test(p) && !TITLE_WORDS.test(p) ? 1 : 0);
    const companyScore = (p: string) => (STRONG_COMPANY.test(p) ? 3 : 0) + (COMPANY_WORDS.test(p) ? 1 : 0) - (TITLE_WORDS.test(p) && !STRONG_COMPANY.test(p) ? 2 : 0);
    const byTitle = [...parts].sort((a, b) => titleScore(b) - titleScore(a));
    let title = byTitle[0] && titleScore(byTitle[0]) > 0 ? byTitle[0] : "";
    const byCompany = parts.filter((p) => p !== title).sort((a, b) => companyScore(b) - companyScore(a));
    let company = byCompany[0] && companyScore(byCompany[0]) > 0 ? byCompany[0] : "";
    const rest = parts.filter((p) => p !== title && p !== company && !isCity(p));
    if (!title && rest.length) title = rest.shift()!;
    if (!company && rest.length) company = rest.shift()!;
    if (!title && !company) continue;
    items.push({ title, company, from: ymStr(r.from), to: r.present ? "Present" : ymStr(r.to) });
  }
  // most recent first
  return items.sort((a, b) => (b.to === "Present" ? "9999" : b.to).localeCompare(a.to === "Present" ? "9999" : a.to) || b.from.localeCompare(a.from));
}

// ------------------------------------------------------------------ education

const DEGREES: [RegExp, string, number][] = [
  [/\bph\.?\s?d\b|\bdoctorate\b/i, "Ph.D", 9],
  [/\bm\.?\s?tech\b/i, "M.Tech", 8],
  [/\b(?:M\.\s?E\.?|ME)(?=[\s,(-]|$)/, "M.E.", 8],
  [/\bmba\b/i, "MBA", 8],
  [/\bpgdm\b|\bpgdba\b/i, "PGDM", 8],
  [/\bmca\b/i, "MCA", 8],
  [/\bm\.?\s?sc\b/i, "M.Sc", 8],
  [/\bm\.?\s?com\b/i, "M.Com", 8],
  [/\bm\.?\s?pharm\b/i, "M.Pharm", 8],
  [/\bmbbs\b/i, "MBBS", 7],
  [/\b(?:M\.\s?A\.?)(?=[\s,(-]|$)/, "M.A.", 8],
  [/\bb\.?\s?tech\b/i, "B.Tech", 6],
  [/\b(?:B\.\s?E\.?|BE)(?=[\s,(-]|$)/, "B.E.", 6],
  [/\bbca\b/i, "BCA", 6],
  [/\bb\.?\s?sc\.?\s*nursing\b/i, "B.Sc Nursing", 6],
  [/\bb\.?\s?sc\b/i, "B.Sc", 6],
  [/\bb\.?\s?com\b/i, "B.Com", 6],
  [/\bbba\b/i, "BBA", 6],
  [/\bb\.?\s?pharm\b/i, "B.Pharm", 6],
  [/\bllb\b/i, "LLB", 6],
  [/\b(?:B\.\s?A\.?)(?=[\s,(-]|$)/, "B.A.", 6],
  [/\bgnm\b/i, "GNM", 5],
  [/\bdiploma\b|\bpolytechnic\b/i, "Diploma", 5],
  [/\bchartered accountant\b|\bca final\b/i, "CA", 8],
  [/\b(12th|xii|hsc|intermediate|higher secondary|senior secondary)\b/i, "12th", 3],
  [/\b(10th|x|ssc|matriculation|secondary school|high school)\b(?!\w)/i, "10th", 2],
];
const INSTITUTE = /\b(university|college|institute|institution|school|iit|nit|iiit|bits|vidyalaya|vidyapeeth|academy|polytechnic|campus|board)\b/i;

export function extractEducation(sections: Record<SectionKey, string[]>, text: string): { list: EduItem[]; highest?: string } {
  const lines = sections.education.length ? sections.education : text.split("\n");
  const list: EduItem[] = [];
  const seen = new Set<string>();
  let best: { name: string; rank: number } | null = null;
  lines.forEach((l, i) => {
    for (const [re, name, rank] of DEGREES) {
      if (name === "10th" && !/\b(10th|ssc|matriculation|secondary school|high school)\b/i.test(l)) continue;
      if (!re.test(l)) continue;
      if (seen.has(name)) break;
      seen.add(name);
      const near = [l, lines[i + 1] ?? "", lines[i - 1] ?? "", lines[i + 2] ?? ""];
      const inst = near.find((x) => INSTITUTE.test(x)) ?? "";
      const yearLine = near.slice(0, 3).join(" ");
      const years = yearLine.match(/(?:19|20)\d{2}/g) ?? [];
      list.push({ degree: name, institution: cleanPart(inst.replace(re, "").replace(/(?:19|20)\d{2}(\s*[-–]\s*(?:19|20)\d{2})?/g, "")), year: years.length ? years[years.length - 1] : "" });
      if (!best || rank > best.rank) best = { name, rank };
      break;
    }
  });
  return { list, highest: (best as { name: string } | null)?.name };
}

// ------------------------------------------------------------------ city, notice, CTC, DOB

export function extractCity(sections: Record<SectionKey, string[]>, text: string): Field<string> | undefined {
  const find = (s: string) => {
    let hit: { name: string; at: number } | null = null;
    for (const c of INDIAN_CITIES)
      for (const a of c.aliases) {
        const m = new RegExp(`\\b${escapeRe(a)}\\b`, "i").exec(s);
        if (m && (!hit || m.index < hit.at)) hit = { name: c.name, at: m.index };
      }
    return hit?.name;
  };
  const labelled = text.split("\n").find((l) => /^(current\s+)?(location|city|address|based in|residing at)\s*[:\-]/i.test(l));
  if (labelled) {
    const c = find(labelled);
    if (c) return f(c, "high");
  }
  const head = [...sections.header.slice(0, 10), ...sections.personal].join("\n");
  const c = find(head);
  if (c) return f(c, "medium");
  const any = find(text);
  return any ? f(any, "low") : undefined;
}

export function extractNotice(text: string): Pick<ResumeFields, "notice_period_days" | "serving_notice" | "last_working_day"> {
  const out: Pick<ResumeFields, "notice_period_days" | "serving_notice" | "last_working_day"> = {};
  if (/\bimmediate(?:ly)?\s*(?:joiner|joining|available|start)\b|\bavailable\s+immediately\b|notice\s*period\s*[:\-]?\s*(?:immediate|nil|none|0)\b/i.test(text)) out.notice_period_days = f(0, "high");
  else {
    const m = text.match(/notice\s*(?:period)?\s*(?:of)?\s*[:\-]?\s*(\d{1,3})\s*(days?|months?)/i) ?? text.match(/(\d{1,3})\s*(days?|months?)\s*(?:of\s*)?notice/i);
    if (m) {
      const n = Number(m[1]) * (/month/i.test(m[2]) ? 30 : 1);
      if (n <= 180) out.notice_period_days = f(n, "high");
    }
  }
  if (/serving\s+(?:my\s+|the\s+)?notice/i.test(text)) out.serving_notice = f(true, "high");
  const lwd = text.match(/(?:lwd|last\s+working\s+day)\s*[:\-–]?\s*(?:is|on)?\s*([0-9]{1,2}[\s/.-][A-Za-z0-9]{1,9}[\s/.,-]*\d{2,4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i);
  if (lwd) {
    const d = parseDate(lwd[1]);
    if (d) {
      out.last_working_day = f(d, "medium");
      out.serving_notice = f(true, "high");
    }
  }
  return out;
}

function toLakhs(num: string, unit: string): number | null {
  const n = Number(num.replace(/,/g, ""));
  if (!isFinite(n) || n <= 0) return null;
  if (/lpa|lakh|lac|\bl\b/i.test(unit)) return n;
  if (/cr|crore/i.test(unit)) return n * 100;
  if (/k\b/i.test(unit)) return Math.round((n * 12 * 1000) / 1e5 * 10) / 10; // per month in thousands
  if (n >= 100000) return Math.round((n / 1e5) * 100) / 100; // rupees per annum
  if (n < 200) return n; // assume lakhs
  return null;
}

export function extractCtc(text: string): Pick<ResumeFields, "current_ctc" | "expected_ctc"> {
  const out: Pick<ResumeFields, "current_ctc" | "expected_ctc"> = {};
  const amount = String.raw`(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)\s*(lpa|lakhs?|lacs?|l\b|cr|crores?|k\b)?`;
  const cur = text.match(new RegExp(String.raw`(?:current|present|existing)\s*(?:ctc|salary|package|compensation)\s*[:\-–]?\s*` + amount, "i"));
  if (cur) {
    const v = toLakhs(cur[1], cur[2] ?? "");
    if (v !== null) out.current_ctc = f(v, cur[2] ? "high" : "medium");
  }
  const exp = text.match(new RegExp(String.raw`expected\s*(?:ctc|salary|package|compensation)\s*[:\-–]?\s*` + amount, "i"));
  if (exp) {
    const v = toLakhs(exp[1], exp[2] ?? "");
    if (v !== null) out.expected_ctc = f(v, exp[2] ? "high" : "medium");
  }
  return out;
}

/** dd/mm/yyyy, dd-mm-yyyy, dd Month yyyy, Month dd, yyyy → YYYY-MM-DD */
export function parseDate(s: string): string | null {
  const t = s.trim().replace(/(\d)(st|nd|rd|th)\b/i, "$1");
  let m = t.match(/^(\d{1,2})[\s/.-](\d{1,2})[\s/.-](\d{4})$/);
  if (m) return iso(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  m = t.match(/^(\d{1,2})[\s/.-]+([A-Za-z]{3,9})[\s/.,-]+(\d{4})$/);
  if (m && monthIdx(m[2]) >= 0) return iso(Number(m[3]), monthIdx(m[2]), Number(m[1]));
  m = t.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m && monthIdx(m[1]) >= 0) return iso(Number(m[3]), monthIdx(m[1]), Number(m[2]));
  return null;
}
function iso(y: number, mo: number, d: number) {
  if (y < 1940 || y > 2100 || mo < 0 || mo > 11 || d < 1 || d > 31) return null;
  return `${y}-${String(mo + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function extractDob(text: string): Field<string> | undefined {
  const m = text.match(/(?:date\s+of\s+birth|d\.?\s?o\.?\s?b\.?|birth\s*date)\s*[:\-–]?\s*([0-9]{1,2}(?:st|nd|rd|th)?[\s/.-]+[A-Za-z0-9]{1,9}[\s/.,-]+\d{4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i);
  if (!m) return undefined;
  const d = parseDate(m[1]);
  return d ? f(d, "high") : undefined;
}

// ------------------------------------------------------------------ all fields

export function extractAll(rawText: string, opts: ParseOptions = {}): ResumeFields {
  const text = cleanText(rawText);
  const sections = splitSections(text);
  const lines = text.split("\n");
  const fields: ResumeFields = {};
  fields.email = extractEmail(text);
  fields.phone = extractPhone(text);
  Object.assign(fields, extractUrls(text));
  fields.full_name = extractName(lines, fields.email?.value);
  fields.skills = extractSkills(sections, text, opts.skills ?? []);
  fields.total_experience = extractExperience(text, sections);
  const work = extractWorkHistory(sections);
  if (work.length) {
    fields.work_history = f(work, "low");
    const first = work[0];
    const strong = TITLE_WORDS.test(first.title) && COMPANY_WORDS.test(first.company);
    if (first.title) fields.current_designation = f(first.title, strong ? "medium" : "low");
    if (first.company) fields.current_company = f(first.company, strong ? "medium" : "low");
  }
  const edu = extractEducation(sections, text);
  if (edu.list.length) fields.education = f(edu.list, "medium");
  if (edu.highest) fields.highest_qualification = f(edu.highest, "medium");
  fields.current_city = extractCity(sections, text);
  Object.assign(fields, extractNotice(text), extractCtc(text));
  fields.dob = extractDob(text);
  for (const k of Object.keys(fields) as (keyof ResumeFields)[]) if (fields[k] === undefined) delete fields[k];
  return fields;
}

const KEY_FIELDS: (keyof ResumeFields)[] = ["full_name", "email", "phone", "skills", "total_experience", "current_designation", "education", "current_city"];

/** 0..1 overall score: found key fields, weighted by their confidence */
export function overallConfidence(fields: ResumeFields) {
  const w = { high: 1, medium: 0.7, low: 0.4 } as const;
  const sum = KEY_FIELDS.reduce((s, k) => s + (fields[k] ? w[fields[k]!.confidence] : 0), 0);
  return Math.round((sum / KEY_FIELDS.length) * 100) / 100;
}
