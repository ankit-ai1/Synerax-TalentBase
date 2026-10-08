import { extractAll } from "../rules";
import type { ResumeProvider } from "../types";

/**
 * AI provider (stub). Enable with RESUME_PARSER=ai once implemented.
 *
 * TODO: send `text` to an LLM / resume-parsing API and map its answer to ResumeFields
 * (same shape and confidence levels as ../rules.ts). Keep the CV text out of logs, add a timeout,
 * and on any failure throw — parseResume() then falls back to the rule-based provider.
 * Until then this simply returns the rule-based result.
 */
export const aiProvider: ResumeProvider = {
  name: "ai",
  extractFields: (text, opts) => extractAll(text, opts),
};
