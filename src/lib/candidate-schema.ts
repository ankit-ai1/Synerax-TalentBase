import { z } from "zod";
import { normalizePhone, phoneError } from "./phone";

/**
 * THE candidate rules — shared by self-registration (wizard + API), the staff "Add/Edit candidate" form
 * (client + /api/candidates) and the bulk importer. Change a rule here and it changes everywhere.
 */

// in the browser, skip zod's eval-based fast path (same results; keeps the strict CSP free of eval)
if (typeof window !== "undefined") z.config({ jitless: true });

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const CV_MAX_BYTES = 4 * 1024 * 1024;
export const CV_ALLOWED = /\.(pdf|docx?)$/i;

/** E.164 phone (any country; bare numbers are Indian) with a country-specific message */
const phone = (requiredMsg?: string) =>
  z
    .string()
    .trim()
    .transform((v) => normalizePhone(v))
    .superRefine((v, ctx) => {
      const msg = v ? phoneError(v) : requiredMsg;
      if (msg) ctx.addIssue({ code: "custom", message: msg });
    });
const email = z.string().trim().toLowerCase().max(200).regex(EMAIL_RE, "Enter a valid email");
const optEmail = z.string().trim().toLowerCase().max(200).refine((v) => !v || EMAIL_RE.test(v), "Enter a valid email");

/** the core profile every candidate has, however they were created */
const core = {
  email,
  phone: phone("Please enter your mobile number"),
  current_city: z.string().trim().min(2, "Please enter your current city").max(80),
  current_designation: z.string().trim().min(2, "Please enter your current designation").max(120),
  current_ctc: z.coerce.number().min(0, "Enter your current CTC").max(500),
  expected_ctc: z.coerce.number().min(0, "Enter your expected CTC").max(500),
  // the salary as entered (amount + currency + period); current_ctc / expected_ctc above are its INR LPA equivalent
  current_ctc_amount: z.coerce.number().min(0).max(1e9).optional(),
  current_ctc_currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  current_ctc_period: z.enum(["annual", "monthly"]).optional(),
  expected_ctc_amount: z.coerce.number().min(0).max(1e9).optional(),
  expected_ctc_currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  expected_ctc_period: z.enum(["annual", "monthly"]).optional(),
  notice_period_days: z.coerce.number().int().min(0).max(180),
  serving_notice: z.boolean(),
  last_working_day: z.string().trim().optional().default(""),
};

const lastWorkingDay = (v: { serving_notice?: boolean | null; last_working_day?: string | null }, ctx: z.RefinementCtx) => {
  if (v.serving_notice && !/^\d{4}-\d{2}-\d{2}$/.test(v.last_working_day ?? "")) {
    ctx.addIssue({ code: "custom", path: ["last_working_day"], message: "Please enter your last working day" });
  }
};

/** Candidate self-registration (/register, careers page) — wizard (client) and /api/portal/register (server) */
export const registrationSchema = z
  .object({
    full_name: z.string().trim().min(2, "Please enter your full name").max(120),
    ...core,
    exp_years: z.coerce.number().int().min(0).max(50),
    exp_months: z.coerce.number().int().min(0).max(11),
    skills: z.array(z.string().trim().min(1).max(60)).min(3, "Add at least 3 skills").max(25),
    consent: z.literal(true, { message: "Please accept the consent to continue" }),
  })
  .superRefine(lastWorkingDay);

export type Registration = z.output<typeof registrationSchema>;

/**
 * Staff "Add/Edit candidate": the same field rules, but staff often have only part of a profile —
 * name plus email or phone is enough; anything filled in must still be valid.
 */
export const staffCandidateSchema = z
  .object({
    first_name: z.string().trim().min(1, "First name is required").max(80),
    email: optEmail,
    alt_email: optEmail,
    phone: phone(),
    alt_phone: phone(),
    whatsapp: phone(),
    serving_notice: z.boolean().nullish(),
    last_working_day: z.string().trim().nullish(),
  })
  .passthrough()
  .superRefine((v, ctx) => {
    if (!v.email && !v.phone) ctx.addIssue({ code: "custom", path: ["phone"], message: "At least one of email or phone is required" });
    lastWorkingDay(v, ctx);
  });

/** first message per field (for inline errors) */
export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const k = String(i.path[0] ?? "form");
    if (!out[k]) out[k] = i.code === "invalid_type" ? "This field is required" : i.message;
  }
  return out;
}

/** bulk import: one row → normalised values or the reason it was rejected */
export function checkImportRow(r: Record<string, string>): string | null {
  if (!r.first_name?.trim()) return "First name is missing";
  if (r.email && !EMAIL_RE.test(r.email.trim())) return "Invalid email";
  for (const k of ["phone", "alt_phone", "whatsapp"]) {
    if (r[k] && phoneError(r[k])) return `Invalid ${k.replace("_", " ")}`;
  }
  if (!r.email && !r.phone) return "Email or phone is required";
  return null;
}
