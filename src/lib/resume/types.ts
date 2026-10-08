/** Shared types for resume parsing (rule-based today, pluggable AI provider later) */

export type Confidence = "high" | "medium" | "low";
export type Field<T> = { value: T; confidence: Confidence };

export type WorkItem = { title: string; company: string; from: string; to: string };
export type EduItem = { degree: string; institution: string; year: string };

export interface ResumeFields {
  full_name?: Field<string>;
  email?: Field<string>;
  phone?: Field<string>; // 10-digit Indian mobile
  linkedin_url?: Field<string>;
  github_url?: Field<string>;
  portfolio_url?: Field<string>;
  skills?: Field<string[]>;
  total_experience?: Field<number>; // years, one decimal
  current_designation?: Field<string>;
  current_company?: Field<string>;
  work_history?: Field<WorkItem[]>;
  education?: Field<EduItem[]>;
  highest_qualification?: Field<string>;
  current_city?: Field<string>;
  notice_period_days?: Field<number>;
  serving_notice?: Field<boolean>;
  last_working_day?: Field<string>; // YYYY-MM-DD
  current_ctc?: Field<number>; // lakhs per annum
  expected_ctc?: Field<number>; // lakhs per annum
  dob?: Field<string>; // YYYY-MM-DD
}

export interface ParseResult {
  /** plain text of the CV — store it, but never log it */
  text: string;
  fields: ResumeFields;
  /** 0..1 — share of the key fields that were found */
  confidence: number;
  warnings: string[];
}

/** a skill from the master list (name + aliases) */
export type SkillDef = { name: string; aliases?: string[] };

export interface ParseOptions {
  skills?: SkillDef[];
  fileName?: string;
}

/** A parser provider turns extracted text into fields */
export interface ResumeProvider {
  name: string;
  extractFields(text: string, opts: ParseOptions): Promise<ResumeFields> | ResumeFields;
}
