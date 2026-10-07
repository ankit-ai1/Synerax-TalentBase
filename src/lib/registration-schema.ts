import { z } from "zod";

/** Candidate self-registration — shared by the wizard (client) and the API (server) */
export const registrationSchema = z
  .object({
    full_name: z.string().trim().min(2, "Please enter your full name").max(120),
    email: z.string().trim().toLowerCase().email("Enter a valid email").max(200),
    phone: z
      .string()
      .trim()
      .transform((v) => v.replace(/[\s-]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, ""))
      .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number")),
    current_city: z.string().trim().min(2, "Please enter your current city").max(80),
    exp_years: z.coerce.number().int().min(0).max(50),
    exp_months: z.coerce.number().int().min(0).max(11),
    current_designation: z.string().trim().min(2, "Please enter your current designation").max(120),
    skills: z.array(z.string().trim().min(1).max(60)).min(3, "Add at least 3 skills").max(25),
    current_ctc: z.coerce.number().min(0, "Enter your current CTC").max(500),
    expected_ctc: z.coerce.number().min(0, "Enter your expected CTC").max(500),
    notice_period_days: z.coerce.number().int().min(0).max(180),
    serving_notice: z.boolean(),
    last_working_day: z.string().trim().optional().default(""),
    consent: z.literal(true, { message: "Please accept the consent to continue" }),
  })
  .superRefine((v, ctx) => {
    if (v.serving_notice && !/^\d{4}-\d{2}-\d{2}$/.test(v.last_working_day)) {
      ctx.addIssue({ code: "custom", path: ["last_working_day"], message: "Please enter your last working day" });
    }
  });

export type Registration = z.output<typeof registrationSchema>;

export const CV_MAX_BYTES = 4 * 1024 * 1024;
export const CV_ALLOWED = /\.(pdf|docx?)$/i;
