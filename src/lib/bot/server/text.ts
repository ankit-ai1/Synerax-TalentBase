import Fuse from "fuse.js";

/** Text helpers shared by the fallback engine, the FAQ search and the entity extractor */

/** Hinglish / shorthand → English (word level) */
const SYNONYMS: Record<string, string> = {
  naukri: "job", naukriyan: "jobs", kaam: "job", vacancy: "job", vacancies: "jobs", opening: "job", openings: "jobs",
  mera: "my", meri: "my", mere: "my", mujhe: "me", hamara: "our", hamari: "our", humara: "our", apna: "my", apni: "my",
  kitne: "how many", kitna: "how much", kitni: "how many", kab: "when", kahan: "where", kaise: "how", kya: "what", kyun: "why",
  dikhao: "show", dikha: "show", batao: "tell", bataiye: "tell", bolo: "tell", chahiye: "want", karo: "do", kar: "do", karna: "do",
  aaj: "today", kal: "tomorrow", abhi: "now", hafta: "week", hafte: "week", mahina: "month",
  baat: "talk", call: "call", phone: "phone", sampark: "contact",
  haan: "yes", nahi: "no", nahin: "no", theek: "ok",
  pending: "pending", baki: "pending", baaki: "pending", bacha: "pending",
  pls: "please", plz: "please", u: "you", ur: "your", r: "are", abt: "about", info: "information", reqs: "requirements",
  apps: "applications", app: "application", appl: "application", int: "interview", interviews: "interviews", intvw: "interview",
  jd: "job description", cv: "resume", biodata: "resume", lpa: "lpa", lakh: "lpa", lakhs: "lpa", lac: "lpa",
  sal: "salary", pkg: "package", ctc: "ctc", hr: "hr", mgr: "manager", dev: "developer", devs: "developers", eng: "engineer",
  wfh: "remote", "work-from-home": "remote", onsite: "onsite", office: "onsite",
};

export const STOP = new Set(
  "a an the is are am was were be been i me my mine we us our you your yours he she it its they them their this that these those do does did doing to of for in on at by with from and or but if so not no can could will would shall should may might must what whats how why when where which who whom whose there here please hi hello hey get got any some about into than then also just very much more most own same such only need needs want wanna like know tell let show give see check find synerax".split(" ")
);

export const norm = (s: string) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[^\p{L}\p{N}\s'₹.+#-]/gu, " ")
    .split(/\s+/)
    .map((w) => SYNONYMS[w] ?? w)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

/** words → comparable stems ("fees" ≈ "fee", "profiles" ≈ "profile") */
export const stem = (w: string) => (w.length > 4 ? w.replace(/ies$/, "y").replace(/(ing|ed|es|s)$/, "") : w);

export const tokens = (s: string, keepStop = false) =>
  norm(s)
    .split(/[^\p{L}\p{N}+#]+/u)
    .filter((w) => w.length >= 2 && (keepStop || (!STOP.has(w) && w.length >= 3)))
    .map(stem);

/**
 * Fuzzy "how much of A is in B" over word stems (Fuse.js per word → typo tolerant).
 * Returns { q: share of query words matched, d: share of document words matched }.
 */
export function makeMatcher<T>(docs: { item: T; text: string }[]) {
  const vocab = new Map<string, Set<number>>();
  const docTokens = docs.map((d) => new Set(tokens(d.text)));
  docTokens.forEach((set, i) => {
    for (const t of set) {
      if (!vocab.has(t)) vocab.set(t, new Set());
      vocab.get(t)!.add(i);
    }
  });
  const fuse = new Fuse([...vocab.keys()].map((t) => ({ t })), { keys: ["t"], includeScore: true, threshold: 0.3, minMatchCharLength: 3 });
  const cache = new Map<string, { t: string; w: number }[]>();
  const near = (t: string) => {
    if (!cache.has(t)) cache.set(t, fuse.search(t, { limit: 6 }).map((h) => ({ t: h.item.t, w: 1 - (h.score ?? 0) })));
    return cache.get(t)!;
  };
  return (query: string) => {
    const qt = [...new Set(tokens(query))];
    if (!qt.length) return [] as { item: T; score: number; q: number; d: number }[];
    const hit = new Map<number, number>();
    for (const t of qt) {
      const best = new Map<number, number>();
      for (const n of near(t)) for (const i of vocab.get(n.t) ?? []) best.set(i, Math.max(best.get(i) ?? 0, n.w));
      for (const [i, w] of best) hit.set(i, (hit.get(i) ?? 0) + w);
    }
    return [...hit]
      .map(([i, v]) => {
        const q = v / qt.length;
        const d = Math.min(1, v / Math.max(1, docTokens[i].size));
        // F-score leaning on the query side
        const score = (1.6 * q * d) / (0.6 * d + q || 1);
        return { item: docs[i].item, score, q, d };
      })
      .sort((a, b) => b.score - a.score);
  };
}

/** random pick so answers don't sound robotic (seeded by text for stable tests) */
export function pick<T>(list: T[], seed = ""): T {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return list[(seed ? h : Math.floor(Math.random() * 1e9)) % list.length];
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
