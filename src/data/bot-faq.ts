/**
 * Chatbot knowledge base — edit freely.
 *
 * Each entry: a question, a short answer, who may see it (audience) and optional extra keywords
 * that people might type. The bot finds the best match with fuzzy search, so wording doesn't
 * have to be exact. Admins can add more Q&A without a deploy in Admin → Chatbot & chat
 * (those are stored in the database and shown together with these).
 */
import type { BotFaq } from "@/lib/bot/types";

export const BOT_FAQ: BotFaq[] = [
  // ---------------------------------------------------------------- everyone
  {
    id: "what-is-synerax",
    q: "What does Synerax do?",
    a: "Synerax is a staffing and recruitment partner. We help companies hire permanent and contract talent, and we help job seekers find roles that fit their skills, salary and location.",
    audience: ["visitor", "candidate", "client"],
    keywords: ["about", "company", "who are you", "synerax"],
  },
  {
    id: "industries",
    q: "Which industries do you hire for?",
    a: "IT & software, BFSI, healthcare, manufacturing, retail & e-commerce, telecom and logistics.",
    audience: ["visitor", "candidate", "client"],
    keywords: ["sectors", "domains", "industry", "fields"],
  },
  {
    id: "locations",
    q: "Which locations do you hire for?",
    a: "We hire across India for onsite, hybrid and remote roles, with strong networks in the major metros and growing tier-2 cities.",
    audience: ["visitor", "candidate", "client"],
    keywords: ["cities", "where", "remote", "city", "india"],
  },
  {
    id: "contact",
    q: "How can I contact Synerax?",
    a: "Email hr@synerax.in (Mon–Sat, 9 AM – 8 PM IST). We reply within 24 hours.",
    audience: ["visitor", "candidate", "client"],
    keywords: ["phone", "email", "number", "call", "office", "address", "timing", "hours"],
    link: { label: "Contact page", href: "/contact" },
  },
  {
    id: "office",
    q: "Where is your office?",
    a: "We're based in Noida, India.",
    audience: ["visitor", "candidate", "client"],
    keywords: ["address", "noida", "office location"],
  },

  // ---------------------------------------------------------------- candidates & visitors
  {
    id: "candidate-fee",
    q: "Do I have to pay any fee to get a job?",
    a: "No. Synerax never charges candidates — not for registration, interviews or placement. If anyone asks you for money in our name, please report it to hr@synerax.in.",
    audience: ["visitor", "candidate"],
    keywords: ["charges", "money", "payment", "free", "cost", "paid", "registration fee"],
  },
  {
    id: "how-register",
    q: "How do I register as a candidate?",
    a: "Create your free profile in two minutes: upload your CV, we fill most of the form for you, review it and submit.",
    audience: ["visitor"],
    keywords: ["sign up", "create account", "join", "profile", "register"],
    link: { label: "Register now", href: "/register" },
  },
  {
    id: "after-apply",
    q: "What happens after I apply for a job?",
    a: "A recruiter reviews your profile against the role. If it's a fit, we share your profile with the employer and keep you updated at every stage — you can track it under My applications.",
    audience: ["visitor", "candidate"],
    keywords: ["applied", "next step", "process", "status", "hear back"],
  },
  {
    id: "how-long",
    q: "How long does it take to hear back?",
    a: "Usually within a few working days. You'll see every update in your portal and get an email when something changes.",
    audience: ["visitor", "candidate"],
    keywords: ["time", "days", "reply", "response", "waiting", "when"],
  },
  {
    id: "cv-format",
    q: "Which CV format should I upload?",
    a: "Upload a PDF or Word (DOCX) file up to 4 MB. A text-based PDF works best — scanned images can't be read automatically.",
    audience: ["visitor", "candidate"],
    keywords: ["resume", "pdf", "docx", "format", "file size", "upload"],
  },
  {
    id: "privacy",
    q: "Who can see my profile and contact details?",
    a: "Only the Synerax team. Employers see your profile only when we share it for a specific role, and they never get your phone number or email from the portal.",
    audience: ["visitor", "candidate"],
    keywords: ["privacy", "data", "share", "phone number", "safe", "confidential"],
    link: { label: "Privacy policy", href: "/privacy" },
  },
  {
    id: "withdraw",
    q: "Can I withdraw an application?",
    a: "Yes. Open My applications and choose Withdraw on that job. You can apply again later if the job is still open.",
    audience: ["candidate"],
    keywords: ["cancel application", "remove", "withdraw"],
  },
  {
    id: "edit-profile",
    q: "How do I update my profile?",
    a: "Go to My profile and edit any section. A complete profile gets matched to more jobs.",
    audience: ["candidate"],
    keywords: ["edit", "change details", "update", "modify"],
    link: { label: "Open my profile", href: "/portal/profile" },
  },
  {
    id: "job-alerts",
    q: "How do job alerts work?",
    a: "If job alerts are on, we email you new jobs that match your profile, at most once a day. You can turn them off on My profile.",
    audience: ["candidate"],
    keywords: ["alerts", "notifications", "emails", "unsubscribe"],
  },
  {
    id: "interview-prep",
    q: "Will you help me prepare for interviews?",
    a: "Yes — your recruiter shares the interview format, the people you'll meet and tips for the round before every interview.",
    audience: ["candidate"],
    keywords: ["preparation", "tips", "interview help"],
  },

  // ---------------------------------------------------------------- clients & visitors (employers)
  {
    id: "how-hire",
    q: "How does hiring with Synerax work?",
    a: "Share the role, we understand the team and culture, screen every profile on a call, and send you a shortlist — typically within 72 hours for standard roles. We stay with you through offer and joining day.",
    audience: ["visitor", "client"],
    keywords: ["process", "hire", "recruitment process", "how it works", "steps"],
  },
  {
    id: "shortlist-time",
    q: "How fast will I get profiles?",
    a: "Our target is a first shortlist within 72 hours for standard roles; niche or senior roles can take a little longer.",
    audience: ["visitor", "client"],
    keywords: ["turnaround", "timeline", "days", "quick", "speed", "72"],
  },
  {
    id: "fees",
    q: "What are your fees?",
    a: "Fees depend on the role and hiring model (permanent or contract). Share your requirement and we'll send a clear proposal — no hidden costs.",
    audience: ["visitor", "client"],
    keywords: ["pricing", "charges", "cost", "commission", "percentage", "rate", "how much do you charge", "hiring fees", "fee"],
  },
  {
    id: "replacement",
    q: "Do you offer a replacement guarantee?",
    a: "Yes. If a placed candidate leaves within the agreed replacement period, we find a replacement at no extra cost. The period is set in your agreement.",
    audience: ["visitor", "client"],
    keywords: ["guarantee", "free replacement", "leaves", "backout"],
  },
  {
    id: "contract-staffing",
    q: "Do you provide contract staffing?",
    a: "Yes — we provide contract and temporary staff, and handle contracts, payroll and statutory compliance for them.",
    audience: ["visitor", "client"],
    keywords: ["temporary", "contract", "payroll", "third party", "c2h"],
  },
  {
    id: "post-job-review",
    q: "Why is my job 'Pending review'?",
    a: "Every job you post is checked by the Synerax team before it goes live — usually within one working day. We'll email you as soon as it's published.",
    audience: ["client"],
    keywords: ["pending", "not live", "published", "approval"],
  },
  {
    id: "candidate-contacts",
    q: "Can I get the candidate's phone number?",
    a: "To protect candidates, contact details aren't shown in the portal. Approve a profile and your Synerax team arranges the interview and next steps.",
    audience: ["client"],
    keywords: ["phone", "contact candidate", "email of candidate", "call candidate"],
  },
];
