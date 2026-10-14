import { z } from "zod";

import { ENQUIRY_TYPES, HIRING_TYPES } from "./lead-options";
import { normalizePhone, phoneError } from "./phone";

export { LEAD_TYPES, LEAD_STATUSES, ENQUIRY_TYPES, HIRING_TYPES } from "./lead-options";

const str = (max: number) => z.string().trim().max(max);
const opt = (max: number) => str(max).optional().default("");
const phone = z
  .string()
  .trim()
  .max(30)
  .transform((v) => normalizePhone(v))
  .superRefine((v, ctx) => {
    const msg = phoneError(v);
    if (msg) ctx.addIssue({ code: "custom", message: msg });
  });

const common = {
  name: str(120).min(2, "Please enter your name"),
  email: z.string().trim().max(200).email("Enter a valid email"),
  /** honeypot — real users never fill this */
  website: z.string().max(0).optional().default(""),
};

export const leadSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("contact"),
    ...common,
    phone: phone.optional().or(z.literal("")).default(""),
    company: opt(160),
    enquiry: z.enum(ENQUIRY_TYPES),
    message: str(4000).min(10, "Please add a few more details"),
  }),
  z.object({
    type: z.literal("employer"),
    ...common,
    phone,
    company: str(160).min(2, "Please enter your company"),
    role: str(160).min(2, "Which role are you hiring for?"),
    openings: opt(10),
    location: opt(160),
    experience: opt(40),
    budget: opt(40),
    hiringType: z.enum(HIRING_TYPES),
    timeline: opt(60),
    message: opt(4000),
  }),
]);

export type LeadInput = z.input<typeof leadSchema>;
export type Lead = z.output<typeof leadSchema>;
