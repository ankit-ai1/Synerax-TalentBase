/**
 * Resume parsing — one entry point, pluggable providers.
 *
 *   parseResume(file, mime) → { text, fields, confidence, warnings }
 *
 * Providers turn the extracted text into fields. Pick one with RESUME_PARSER:
 *   - "rules" (default): free, offline, rule-based (./rules.ts)
 *   - "ai": stub — swap in an LLM / parsing API later (./providers/ai.ts)
 * Never log `text`: it is personal data.
 */
import { extractText } from "./extract";
import { overallConfidence } from "./rules";
import { rulesProvider } from "./providers/rules";
import { aiProvider } from "./providers/ai";
import type { ParseOptions, ParseResult, ResumeProvider } from "./types";

export type { ParseResult, ResumeFields, Field, Confidence, WorkItem, EduItem, SkillDef } from "./types";

export function getProvider(name = process.env.RESUME_PARSER || "rules"): ResumeProvider {
  return name === "ai" ? aiProvider : rulesProvider;
}

export async function parseResume(file: Buffer, mime: string, opts: ParseOptions = {}): Promise<ParseResult> {
  const { text, warnings } = await extractText(file, mime, opts.fileName);
  if (!text || warnings.length) return { text, fields: {}, confidence: 0, warnings };
  let fields;
  try {
    fields = await getProvider().extractFields(text, opts);
  } catch {
    // an external provider failing must never break the form — fall back to the rules
    fields = await rulesProvider.extractFields(text, opts);
  }
  const confidence = overallConfidence(fields);
  const out: string[] = [];
  if (confidence < 0.35) out.push("We could only read a few details from your CV — please fill in the rest.");
  return { text, fields, confidence, warnings: out };
}

/** text only (used to store resume_text for search) */
export async function resumePlainText(file: Buffer, mime: string, fileName?: string) {
  const { text } = await extractText(file, mime, fileName);
  return text.replace(/\u0000/g, "").slice(0, 200_000);
}
