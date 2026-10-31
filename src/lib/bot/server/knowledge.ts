import { site } from "@/content/site";
import type { BotAudience, BotFaq, BotMode } from "../types";
import { makeMatcher } from "./text";

/** FAQ audience for a bot mode (staff may see every answer) */
export const audienceOf = (mode: BotMode): BotAudience[] => (mode === "hr" || mode === "admin" ? ["visitor", "candidate", "client"] : [mode]);

export const faqsFor = (mode: BotMode, faqs: BotFaq[]) => {
  const aud = audienceOf(mode);
  return faqs.filter((f) => f.audience.some((a) => aud.includes(a)));
};

const matchers = new WeakMap<BotFaq[], ReturnType<typeof makeMatcher<BotFaq>>>();
export function searchFaq(question: string, faqs: BotFaq[]) {
  let m = matchers.get(faqs);
  if (!m) {
    m = makeMatcher(faqs.map((f) => ({ item: f, text: `${f.q} ${(f.keywords ?? []).join(" ")}` })));
    matchers.set(faqs, m);
  }
  // keywords are alternatives, not all expected → score by how much of the QUESTION matched
  return m(question)
    .map((h) => ({ ...h, score: 0.85 * h.q + 0.15 * h.d }))
    .sort((x, y) => y.score - x.score);
}

/**
 * PUBLIC knowledge only — website copy, company info and FAQs. This is the only Synerax content the
 * AI provider ever receives. No database rows, no names, no ids. (Sample testimonials/logos are left out.)
 */
export function publicKnowledge(mode: BotMode, faqs: BotFaq[]) {
  const c = site.contact;
  const lines: string[] = [
    `Company: ${site.name} (${site.legalName}) — ${site.tagline}. ${site.description}`,
    `Contact: email ${c.email}, ${c.address.join(", ")}. Hours: ${c.hours.map((h) => `${h.days} ${h.time}`).join("; ")}. ${c.responseTime}.`,
    `Services: ${site.services.map((s) => `${s.title} — ${s.summary}`).join(" | ")}`,
    `How hiring works: ${site.process.map((p, i) => `${i + 1}. ${p.title}: ${p.text}`).join(" ")}`,
    `Industries: ${site.industries.map((i) => `${i.title} (${i.roles.slice(0, 4).join(", ")})`).join("; ")}`,
    `Commitments: ${site.metrics.map((m) => `${m.label}: ${"prefix" in m ? m.prefix : ""}${m.value}${"suffix" in m ? m.suffix : ""} (${m.context})`).join("; ")}`,
    `Mission: ${site.about.mission} Vision: ${site.about.vision}`,
    `Candidates never pay any fee. Employers can post jobs in the client portal; every job is reviewed by Synerax before it goes live.`,
    "FAQ:",
    ...faqsFor(mode, faqs).map((f) => `Q: ${f.q} A: ${f.a}`),
  ];
  return lines.join("\n").slice(0, 12000);
}
