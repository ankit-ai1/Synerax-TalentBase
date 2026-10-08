import { extractAll } from "../rules";
import type { ResumeProvider } from "../types";

/** Default provider: free, offline, rule-based extraction */
export const rulesProvider: ResumeProvider = {
  name: "rules",
  extractFields: (text, opts) => extractAll(text, opts),
};
