import { z } from "zod";
import { site } from "@/content/site";
import type { BotCard, BotTurn } from "../types";
import { defineTool, P } from "./registry";
import { faqsFor, searchFaq } from "./knowledge";
import { pick, plural } from "./text";
import { normalizePhone, phoneError } from "@/lib/phone";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ALL = ["visitor", "candidate", "client", "hr", "admin"] as const;
const exp = (a?: number | null, b?: number | null) => (a != null && b != null ? `${a}–${b} yrs` : a != null ? `${a}+ yrs` : b != null ? `up to ${b} yrs` : "");
const where = (j: any) => (j.work_mode === "Remote" ? "Remote" : [(j.locations ?? []).slice(0, 2).join(", "), j.work_mode].filter(Boolean).join(" · "));
const salary = (j: any) => (j.salary_min || j.salary_max ? `₹${j.salary_min ?? "?"}–${j.salary_max ?? "?"} LPA` : "");

export const getFaq = defineTool({
  name: "get_faq",
  modes: [...ALL],
  kind: "read",
  description: "Answer a general question about Synerax (fees, process, timelines, privacy, how the portal works) from the FAQ.",
  params: z.object({ question: z.string().trim().min(2).max(300) }),
  examples: ["do you charge candidates", "what are your fees", "how does hiring work", "how fast will i get profiles", "is my data safe", "do you offer replacement guarantee", "which industries do you hire for", "what happens after i apply"],
  extract: (text) => ({ question: text }),
  async run(p, ctx) {
    const hit = searchFaq(p.question, faqsFor(ctx.mode, ctx.faqs))[0];
    if (!hit || hit.score < 0.45) return [];
    return [{ text: hit.item.a, link: hit.item.link }];
  },
});

export const companyInfo = defineTool({
  name: "company_info",
  modes: [...ALL],
  kind: "read",
  description: "Synerax contact details, office, working hours, services or industries.",
  params: z.object({ topic: z.enum(["contact", "office", "hours", "services", "industries", "about"]).optional() }),
  examples: ["how can i contact you", "what is your phone number", "email address", "where is your office", "office timings", "what services do you offer", "which industries", "about synerax", "aapka number kya hai", "contact details"],
  keywords: /\b(contact|phone number|email|address|office|timing|hours|reach you|services|industries|about synerax|who are you)\b/,
  extract: (text) => {
    const t = text.toLowerCase();
    const topic = /service/.test(t) ? "services" : /industr|sector/.test(t) ? "industries" : /office|address|located|where/.test(t) ? "office" : /hour|timing|open/.test(t) ? "hours" : /about|who are|what is synerax/.test(t) ? "about" : "contact";
    return { topic: topic as "services" | "industries" | "office" | "hours" | "about" | "contact" };
  },
  async run(p) {
    const c = site.contact;
    switch (p.topic) {
      case "services":
        return [{ text: `We offer ${site.services.map((s) => s.title.toLowerCase()).join(", ")}.`, cards: site.services.slice(0, 6).map((s) => ({ title: s.title, subtitle: s.summary, href: `/services#${s.slug}` })) }];
      case "industries":
        return [{ text: `We hire for ${site.industries.map((i) => i.title).join(", ")}.`, link: { label: "Industries", href: "/industries" } }];
      case "office":
        return [{ text: `We're based in ${c.address.join(", ")}.`, link: { label: "Contact page", href: "/contact" } }];
      case "hours":
        return [{ text: `We're available ${c.hours.map((h) => `${h.days}: ${h.time}`).join("; ")}. ${c.responseTime}.` }];
      case "about":
        return [{ text: `${site.legalName} is a ${site.tagline.toLowerCase()}. ${site.about.mission}`, link: { label: "About us", href: "/about" } }];
      default:
        return [{ text: `Email ${c.email} or call ${c.phone} (${c.hours[0].days}, ${c.hours[0].time}). ${c.responseTime}.`, link: { label: "Contact page", href: "/contact" } }];
    }
  },
});

export const searchPublicJobs = defineTool({
  name: "search_public_jobs",
  modes: ["visitor"],
  kind: "read",
  description: "Search open jobs on the website by skill/keyword, city, work mode or years of experience.",
  params: z.object({ q: P.optText(80), location: P.optText(60), work_mode: z.enum(["Remote", "Hybrid", "Onsite"]).optional(), experience: P.optNum(0, 50) }),
  examples: ["show me open jobs", "react jobs in pune", "any java openings", "jobs in bangalore", "remote developer jobs", "do you have jobs for freshers", "data analyst vacancies", "koi naukri hai kya", "jobs for 5 years experience", "current openings", "find jobs", "hiring for nurses?", "how many job positions are there", "how many jobs are open"],
  keywords: /\b(jobs?|openings?|vacanc\w*|positions?|roles? available|hiring for|naukri)\b/,
  extract: (_t, e) => ({ q: e.skills[0], location: e.cities[0], work_mode: e.workMode, experience: e.years }),
  async run(p, ctx) {
    const { data, error } = await ctx.sb.rpc("public_jobs", { f: { q: p.q ?? "", location: p.location ?? "", work_mode: p.work_mode ?? "", experience: p.experience ?? "", limit: 20 } });
    if (error) throw new Error(error.message);
    const all = (data ?? []) as any[];
    const jobs = all.slice(0, 6);
    const total = all.length >= 20 ? "20+" : String(all.length);
    const what = [p.q, p.location && `in ${p.location}`, p.work_mode?.toLowerCase()].filter(Boolean).join(" ");
    if (!jobs.length)
      return [{ text: pick([`I couldn't find open ${what || ""} jobs right now.`, `No open ${what || ""} roles at the moment.`]).replace(/\s+/g, " ") + " Register and we'll match you as soon as one opens.", link: { label: "Register as a candidate", href: "/register" } }];
    return [
      {
        text:
          all.length > jobs.length
            ? `There are ${total} open ${what ? `${what} ` : ""}jobs right now — here are the latest ${jobs.length}:`
            : pick([`There ${jobs.length === 1 ? "is" : "are"} ${plural(jobs.length, "open job")}${what ? ` for ${what}` : ""} right now:`, `I found ${plural(jobs.length, "opening")}${what ? ` matching ${what}` : ""}:`], what),
        cards: jobs.map((j): BotCard => ({ title: j.title, subtitle: [j.company, where(j)].filter(Boolean).join(" · "), meta: [exp(j.exp_min, j.exp_max), salary(j), (j.skills ?? []).slice(0, 3).join(", ")].filter(Boolean).join(" · "), chips: [{ label: "Details", tool: "job_public_details", params: { id: j.id } }] })),
        chips: [{ label: "Register to apply", href: "/register", tone: "primary" }],
      },
    ];
  },
});

export const jobPublicDetails = defineTool({
  name: "job_public_details",
  modes: ["visitor"],
  kind: "read",
  description: "Details of one open job (from a job id shown earlier).",
  params: z.object({ id: P.id }),
  examples: ["tell me more about this job", "job details", "what does this role involve"],
  async run(p, ctx) {
    const { data } = await ctx.sb.rpc("public_job", { p_job: p.id });
    const j = data as any;
    if (!j) return [{ text: "That job is no longer open." }];
    return [
      {
        text: `${j.title} — ${[j.company, where(j)].filter(Boolean).join(" · ")}`,
        cards: [{ title: j.title, subtitle: [exp(j.exp_min, j.exp_max), salary(j), j.employment_type].filter(Boolean).join(" · "), lines: [(j.skills ?? []).slice(0, 6).join(", "), String(j.description ?? "").slice(0, 400)].filter(Boolean) }],
        chips: [{ label: "Register to apply", href: "/register", tone: "primary" }],
      },
    ];
  },
});

const leadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  company: z.string().trim().min(2).max(160),
  phone: z
    .string()
    .trim()
    .max(30)
    .transform((v) => normalizePhone(v))
    .superRefine((v, ctx) => {
      const msg = phoneError(v);
      if (msg) ctx.addIssue({ code: "custom", message: msg });
    }),
  email: z.string().trim().max(200).email("Enter a valid email"),
  requirement: z.string().trim().min(3).max(2000),
});
export const createLead = defineTool({
  name: "create_lead",
  modes: ["visitor"],
  kind: "action",
  description: "An employer wants to hire through Synerax: collect name, company, phone, email and requirement (a form is shown for missing details).",
  params: leadSchema.partial(),
  examples: ["i want to hire", "we are hiring developers", "need staff for my company", "hire talent", "i need 5 java developers", "looking for recruitment partner", "can you help us hire", "hume developers chahiye", "post a requirement", "talk to sales", "contact me for hiring"],
  keywords: /\b(hire|hiring|recruit\w*|staffing partner|manpower|need (people|staff|developers?|engineers?)|requirement)\b/,
  extract: (text) => ({ requirement: text.length > 12 ? text : undefined }),
  async prepare(p) {
    const ok = leadSchema.safeParse(p);
    if (!ok.success)
      return {
        turns: [
          {
            text: pick(["Happy to help you hire. Share a few details and our team will call you within 24 hours:", "Great — tell us about the role and we'll get back within 24 hours:"]),
            form: {
              id: "lead",
              tool: "create_lead",
              submitLabel: "Review",
              initial: Object.fromEntries(Object.entries(p).filter(([, v]) => v).map(([k, v]) => [k, String(v)])),
              fields: [
                { name: "name", label: "Your name", required: true },
                { name: "company", label: "Company", required: true },
                { name: "phone", label: "Phone", type: "tel", required: true },
                { name: "email", label: "Work email", type: "email", required: true },
                { name: "requirement", label: "Requirement", type: "textarea", required: true, placeholder: "e.g. 3 Java developers, 4–7 yrs, Pune" },
              ],
            },
          },
        ],
      };
    return { params: ok.data, confirm: { title: "Send these details to Synerax?", details: [`${ok.data.name} · ${ok.data.company}`, `${ok.data.phone} · ${ok.data.email}`, ok.data.requirement.slice(0, 200)], confirmLabel: "Send" } };
  },
  async execute(p, ctx) {
    const v = leadSchema.parse(p);
    const { error } = await ctx.sb.from("website_leads").insert({ type: "employer", name: v.name, email: v.email.toLowerCase(), phone: v.phone, company: v.company, data: { role: v.requirement.slice(0, 160), message: v.requirement, source: "chatbot" } });
    if (error) throw new Error("We couldn't send your details right now. Please try again or email us.");
    ctx.defer(async () => {
      const { getEmailSettings, sendEmail } = await import("@/lib/email/send");
      const settings = await getEmailSettings();
      if (!settings.notify_emails.length) return;
      await sendEmail({
        to: settings.notify_emails,
        event: "staff_chatbot_lead",
        settings,
        subject: `New hiring lead: ${v.company}`,
        content: { heading: "New hiring lead from the website assistant", body: [`${v.name} from ${v.company} wants to hire through Synerax.`], facts: [{ label: "Phone", value: v.phone }, { label: "Email", value: v.email }, { label: "Requirement", value: v.requirement.slice(0, 600) }], cta: { label: "Open website leads", url: "/admin/leads" } },
      });
    });
    return [{ text: "Thank you! Our team will contact you within 24 hours.", tone: "success" } satisfies BotTurn];
  },
});

export const PUBLIC_TOOLS = [getFaq, companyInfo, searchPublicJobs, jobPublicDetails, createLead];
