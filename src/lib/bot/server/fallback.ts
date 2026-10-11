import type { BotFaq, BotMode } from "../types";
import type { ToolDef } from "./registry";
import { extractEntities } from "./entities";
import { faqsFor, searchFaq } from "./knowledge";
import { cosine, embed, indexVectors } from "./embed";
import { makeMatcher, norm } from "./text";
import { toolsFor } from "./tools";

/**
 * Free fallback "understanding" (no AI provider): normalisation + Hinglish synonyms + typo-tolerant
 * word matching against 8–15 example phrasings per tool + keyword signals + entity extraction,
 * plus meaning-based matching with local MiniLM embeddings when available.
 * Same tools, same templates, same confirmation flow as the AI path.
 */
export type Understood =
  | { kind: "tool"; tool: string; params: Record<string, unknown>; score: number; via: string }
  | { kind: "faq"; faq: BotFaq; score: number }
  | { kind: "smalltalk"; intent: "greet" | "thanks" | "menu" | "handoff" | "bye" }
  | { kind: "answer"; text: string; unsure?: boolean }
  | { kind: "none" };

const GREET = /^(hi+|hello+|hey+|hii+|helo|namaste|namaskar|good (morning|afternoon|evening)|yo|hola)\b[\s!.,]*(there|bot|team)?[\s!.]*$/;
const THANKS = /^(thanks?|thank you|thx|ty|ok(ay)? thanks?|great|cool|awesome|perfect|dhanyavad|shukriya|nice)\b[\s!.]*$/;
const BYE = /^(bye|goodbye|see you|tata|ok bye)\b/;
const MENU = /^(menu|main menu|help|options|start over|restart|what can you do|what all can you do|how can you help)\??$/;
const HANDOFF = /\b(talk to (a )?(human|person|someone|agent|team|real person)|real person|customer (care|support)|speak to (a )?(human|person|someone))\b/;
const QUESTION = /\?|^(what|how|why|when|where|which|who|do|does|did|is|are|can|could|will|would|should)\b/;
const DESIRE = /\b(i want|we want|i need|we need|we are looking|looking for|please|help me|i would like|we would like|chahiye)\b/;

type Doc = { tool: ToolDef; text: string };
const matchers = new Map<BotMode, ReturnType<typeof makeMatcher<Doc>>>();
function toolMatcher(mode: BotMode) {
  if (!matchers.has(mode)) {
    const docs = toolsFor(mode)
      .filter((t) => t.name !== "get_faq")
      .flatMap((t) => t.examples.map((ex) => ({ item: { tool: t, text: ex }, text: ex })));
    matchers.set(mode, makeMatcher(docs));
  }
  return matchers.get(mode)!;
}

/** map cosine similarity (MiniLM: ~0.35 unrelated … ~0.9 same meaning) to 0–1 */
const semScore = (c: number) => Math.max(0, Math.min(1, (c - 0.35) / 0.55));
/** blend: the stronger signal leads, the weaker one breaks ties (exact lexical ties are common) */
const blend = (lex: number, sem: number | null) => (sem === null ? lex : 0.6 * Math.max(lex, sem) + 0.4 * Math.min(lex, sem));
/** FAQ text matches are precise (and the model is weak on typos) → the stronger signal leads */
const faqBlend = (lex: number, sem: number | null) => (sem === null ? lex : 0.85 * Math.max(lex, sem) + 0.15 * Math.min(lex, sem));

export async function fallbackUnderstand(text: string, mode: BotMode, faqs: BotFaq[], opts: { semantic?: boolean } = {}): Promise<Understood> {
  const t = norm(text);
  if (!t) return { kind: "none" };
  if (GREET.test(t)) return { kind: "smalltalk", intent: "greet" };
  if (THANKS.test(t)) return { kind: "smalltalk", intent: "thanks" };
  if (BYE.test(t)) return { kind: "smalltalk", intent: "bye" };
  if (MENU.test(t)) return { kind: "smalltalk", intent: "menu" };
  if (HANDOFF.test(t) && (mode === "visitor" || mode === "hr" || mode === "admin")) return { kind: "smalltalk", intent: "handoff" };

  const tools = toolsFor(mode).filter((x) => x.name !== "get_faq");
  const visibleFaqs = faqsFor(mode, faqs);

  // ---- lexical (typo tolerant)
  const lex = new Map<string, number>();
  for (const h of toolMatcher(mode)(text)) lex.set(h.item.tool.name, Math.max(lex.get(h.item.tool.name) ?? 0, h.score));
  const faqLex = new Map<string, number>();
  for (const h of searchFaq(text, visibleFaqs)) faqLex.set(h.item.id, Math.max(faqLex.get(h.item.id) ?? 0, h.score));

  // ---- meaning-based (local embeddings), if ready in time
  let sem: Map<string, number> | null = null;
  let faqSem: Map<string, number> | null = null;
  if (opts.semantic !== false) {
    const v = (await embed([text], 2500))?.[0];
    if (v) {
      const idx = indexVectors();
      sem = new Map();
      faqSem = new Map();
      for (const tool of tools) {
        let best = 0;
        for (const ex of tool.examples) {
          const e = idx.get(ex);
          if (e) best = Math.max(best, cosine(v, e));
        }
        sem.set(tool.name, semScore(best));
      }
      for (const f of visibleFaqs) {
        const e = idx.get(f.q);
        if (e) faqSem.set(f.id, semScore(cosine(v, e)));
      }
    }
  }

  // "I want / we need / please …" = the user wants something done → favour tools over FAQs
  const isQuestion = QUESTION.test(t);
  const wantsAction = !isQuestion && DESIRE.test(t);
  const ranked = tools
    .map((tool) => {
      let score = blend(lex.get(tool.name) ?? 0, sem ? (sem.get(tool.name) ?? 0) : null);
      // keyword signals (action verbs count a bit more: "apply", "approve", "close"…)
      if (tool.keywords?.test(t)) score += tool.kind === "action" ? 0.24 : 0.18;
      if (wantsAction) score += 0.1;
      return { tool, score, via: sem ? "rules+semantic" : "rules" };
    })
    .sort((a, b) => b.score - a.score);
  const top = ranked[0];
  const faqBest = visibleFaqs
    .map((f) => ({ faq: f, score: faqBlend(faqLex.get(f.id) ?? 0, faqSem ? (faqSem.get(f.id) ?? 0) : null) }))
    .sort((a, b) => b.score - a.score)[0];

  // a question ("what are your fees for hiring?") is informational: don't start an action when an FAQ fits
  if (isQuestion && top?.tool.kind === "action" && faqBest && faqBest.score >= 0.6) return { kind: "faq", faq: faqBest.faq, score: faqBest.score };
  // a clear FAQ question beats tools; otherwise the stronger signal wins
  if (faqBest && faqBest.score >= 0.7 && isQuestion && (!top || faqBest.score >= top.score - 0.05)) return { kind: "faq", faq: faqBest.faq, score: faqBest.score };
  if (top && top.score >= 0.45 && (!faqBest || top.score >= faqBest.score - 0.02)) {
    const params = top.tool.extract?.(text, extractEntities(text)) ?? {};
    return { kind: "tool", tool: top.tool.name, params: strip(params), score: Math.min(1, top.score), via: top.via };
  }
  if (faqBest && faqBest.score >= 0.5) return { kind: "faq", faq: faqBest.faq, score: faqBest.score };
  return { kind: "none" };
}

/** drop undefined / empty values so zod defaults & optional fields behave */
export function strip(o: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && !v.length)));
}
