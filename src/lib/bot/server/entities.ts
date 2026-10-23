import { BUILTIN_SKILLS, INDIAN_CITIES } from "@/lib/resume/data";
import { norm } from "./text";
import { parseMoney, type Money } from "@/lib/money";

/** Things we can pull out of a typed message without any AI */
export type Entities = {
  skills: string[];
  cities: string[];
  lpa?: number;
  /** salary in a currency other than INR, e.g. 30000 AED / month */
  money?: Money;
  noticeDays?: number;
  years?: number;
  workMode?: "Remote" | "Hybrid" | "Onsite";
  status?: "interview" | "offer" | "applied" | "review" | "shared" | "closed" | "active" | "all";
  decision?: "Approved" | "Rejected";
  range?: "today" | "week" | "month";
  due?: "today" | "tomorrow";
  quoted?: string;
};

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const SKILLS = BUILTIN_SKILLS.flatMap((s) => [s.name, ...(s.aliases ?? [])].map((a) => ({ name: s.name, re: new RegExp(`(?<![\\w+#.])${esc(a.toLowerCase()).replace(/ /g, "[\\s.-]?")}(?![\\w+#])`, "i") })));
const CITIES = INDIAN_CITIES.flatMap((c) => [c.name, ...c.aliases].map((a) => ({ name: c.name, re: new RegExp(`\\b${esc(a.toLowerCase())}\\b`, "i") })));
// short skill names that are also English words only count when written like a skill
const AMBIGUOUS = new Set(["Go", "R", "C", "Excel", "Communication", "Sales", "Marketing"]);

export function extractEntities(raw: string): Entities {
  const text = ` ${norm(raw)} `;
  const e: Entities = { skills: [], cities: [] };

  for (const s of SKILLS) {
    if (e.skills.includes(s.name)) continue;
    if (AMBIGUOUS.has(s.name) && !new RegExp(`\\b${esc(s.name)}\\b`).test(raw)) continue;
    if (s.re.test(text)) e.skills.push(s.name);
  }
  for (const c of CITIES) if (!e.cities.includes(c.name) && c.re.test(text)) e.cities.push(c.name);

  const lpa = text.match(/(\d+(?:\.\d+)?)\s*(?:lpa|l\b|lacs?|lakhs?|lakh per annum)/) ?? text.match(/(?:ctc|salary|package)\D{0,12}(\d+(?:\.\d+)?)/);
  if (lpa) e.lpa = Number(lpa[1]);
  if (/(\$|£|€|\b(usd|aed|dhs?|sar|qar|omr|kwd|bhd|sgd|gbp|eur|cad|aud|dirhams?|riyals?|dinars?|dollars?|pounds?|euros?)\b)/i.test(raw)) {
    const m = parseMoney(raw.replace(/\b\d{1,3}\s*(days?|din|months? notice)\b/gi, ""));
    if (m && m.currency !== "INR") {
      e.money = m;
      e.lpa = undefined;
    }
  }

  if (/\b(immediate(ly)?|right away|asap|no notice|serving.*over)\b/.test(text)) e.noticeDays = 0;
  const nd = text.match(/(\d{1,3})\s*(?:days?|din)\b/);
  if (nd) e.noticeDays = Number(nd[1]);
  const nm = text.match(/(\d)\s*(?:months?|mahine?)\b/);
  if (nm && e.noticeDays === undefined) e.noticeDays = Number(nm[1]) * 30;

  const yr = text.match(/(\d{1,2})\s*\+?\s*(?:years?|yrs?|saal)\b/);
  if (yr) e.years = Number(yr[1]);

  if (/\bremote\b/.test(text)) e.workMode = "Remote";
  else if (/\bhybrid\b/.test(text)) e.workMode = "Hybrid";
  else if (/\b(onsite|on-site|in office|work from office)\b/.test(text)) e.workMode = "Onsite";

  if (/\binterview/.test(text)) e.status = "interview";
  else if (/\boffer/.test(text)) e.status = "offer";
  else if (/\b(shared|shortlist)/.test(text)) e.status = "shared";
  else if (/\b(under review|review|screening)\b/.test(text)) e.status = "review";
  else if (/\b(rejected|not selected|closed|withdrawn)\b/.test(text)) e.status = "closed";
  else if (/\b(active|open|ongoing|in progress)\b/.test(text)) e.status = "active";
  else if (/\b(all|every)\b/.test(text)) e.status = "all";

  if (/\b(approve|accept|select|shortlist|go ahead with|move forward|yes to)\b/.test(text)) e.decision = "Approved";
  else if (/\b(reject|decline|not suitable|not a fit|pass on|drop)\b/.test(text)) e.decision = "Rejected";

  if (/\b(today|aaj|todays)\b/.test(text)) e.range = "today";
  else if (/\b(this week|week|weekly|7 days)\b/.test(text)) e.range = "week";
  else if (/\b(this month|month|monthly|30 days)\b/.test(text)) e.range = "month";
  if (/\btomorrow\b/.test(text)) e.due = "tomorrow";
  else if (/\btoday\b/.test(text)) e.due = "today";

  const q = raw.match(/["“']([^"”']{3,80})["”']/);
  if (q) e.quoted = q[1].trim();
  return e;
}

/** what's left after removing command words — a name or a job title the user mentioned */
export function remainder(raw: string, drop: RegExp[]): string {
  let s = ` ${norm(raw)} `;
  for (const r of drop) s = s.replace(r, " ");
  return s
    .replace(/\b(please|can|could|you|me|my|the|a|an|of|for|about|on|to|is|are|show|tell|give|find|get|details?|profile|status|info|information)\b/g, " ")
    .replace(/[?.!,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
