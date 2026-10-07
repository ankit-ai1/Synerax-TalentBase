/** Shapes returned by the candidate-portal RPCs (see supabase/schema.sql, PART 4) */

export type Completion = {
  percent: number;
  missing: { key: string; label: string; section: string; weight: number }[];
  optional: { key: string; label: string; section: string }[];
};

export type CandidateJob = {
  id: string;
  job_code: string;
  title: string;
  company: string;
  department: string | null;
  employment_type: string | null;
  work_mode: string | null;
  locations: string[];
  exp_min: number | null;
  exp_max: number | null;
  notice_max: number | null;
  qualification: string | null;
  openings: number;
  published_at: string | null;
  skills: { name: string; mandatory: boolean; min_years?: number | null }[];
  match: number | null;
  matched_skills: string[];
  applied: boolean;
  saved: boolean;
  // section 36 (optional so older databases still type-check)
  missing_skills?: string[];
  salary_min?: number | null;
  salary_max?: number | null;
};

export type CandidateJobDetail = Omit<CandidateJob, "applied" | "missing_skills"> & {
  description: string | null;
  interview_process: string | null;
  missing_skills: string[];
  application_id: string | null;
  fit?: { skills: number; experience: number; salary: number; notice: number; location: number } | null;
  similar?: { id: string; title: string; company: string; locations: string[]; work_mode: string | null; exp_min: number | null; exp_max: number | null; match: number | null }[];
};

export type PortalInterview = {
  id: string;
  round: string;
  mode: string;
  scheduled_at: string;
  duration_min: number;
  location: string | null;
  meeting_link: string | null;
  status: string;
};

export type MyApplication = {
  id: string;
  job_id: string;
  job_title: string;
  company: string;
  locations: string[];
  work_mode: string | null;
  applied_at: string;
  updated_at: string;
  origin: string;
  withdrawn: boolean;
  step: number;
  status_label: string;
  can_withdraw: boolean;
  interviews: PortalInterview[];
  history?: { step: number; at: string }[];
  closed_at?: string | null;
  recruiter?: PortalContact | null;
};

export type PortalContact = { id: string; name: string; designation: string | null; email: string; phone: string | null; avatar_url: string | null; role: string };

export type PortalExtras = { recruiter: PortalContact | null; photo_id: string | null; resume_id: string | null; saved_jobs: number; matching_jobs: number };

export type MyProfile = {
  candidate: Record<string, unknown> & {
    id: string;
    candidate_code: string;
    first_name: string;
    last_name: string | null;
    email: string | null;
    open_to_work: boolean;
    job_alerts: boolean;
  };
  skills: { skill_id: string; name: string; years: number | null; level: string | null; is_primary: boolean }[];
  experiences: Record<string, unknown>[];
  educations: Record<string, unknown>[];
  certifications: Record<string, unknown>[];
  documents: { id: string; doc_type: string; file_name: string; size_bytes: number | null; created_at: string }[];
  completion: Completion;
};

/** Candidate-friendly pipeline steps */
export const PORTAL_STEPS = ["Applied", "Under review", "Shared with employer", "Interview", "Offer", "Joined"] as const;

/** Every profile-strength item (mirrors candidate_completion in the database) */
export const COMPLETION_ITEMS = [
  { key: "basic", label: "Basic details", hint: "Full name and city", section: "basic", weight: 10 },
  { key: "contact", label: "Contact details", hint: "Email and mobile", section: "contact", weight: 10 },
  { key: "current_job", label: "Current job & CTC", hint: "Role, experience and salary", section: "professional", weight: 15 },
  { key: "notice", label: "Notice period", hint: "Or last working day", section: "professional", weight: 10 },
  { key: "skills", label: "Skills", hint: "At least 3, with years", section: "skills", weight: 15 },
  { key: "work_history", label: "Work history", hint: "Past companies and roles", section: "experience", weight: 10 },
  { key: "education", label: "Education", hint: "Highest degree", section: "education", weight: 10 },
  { key: "cv", label: "CV / resume", hint: "PDF or Word", section: "documents", weight: 15 },
  { key: "preferences", label: "Job preferences", hint: "Locations and work mode", section: "preferences", weight: 5 },
] as const;

export const profileLevel = (pct: number) =>
  pct >= 90 ? { label: "All-star", tone: "jade" as const } : pct >= 60 ? { label: "Intermediate", tone: "saffron" as const } : { label: "Beginner", tone: "ink" as const };

/** Where each completion item is edited */
export const SECTION_ANCHOR: Record<string, string> = {
  basic: "/portal/profile#basic",
  contact: "/portal/profile#contact",
  professional: "/portal/profile#professional",
  skills: "/portal/profile#skills",
  experience: "/portal/profile#experience",
  education: "/portal/profile#education",
  documents: "/portal/profile#documents",
  preferences: "/portal/profile#preferences",
};

/** "3–7 yrs" style label (plain helper — usable from server and client components) */
export const expRange = (min: number | null, max: number | null) =>
  min == null && max == null ? null : min != null && max != null ? `${min}–${max} yrs` : min != null ? `${min}+ yrs` : `Up to ${max} yrs`;

/** "₹18–30 LPA" style label, null when hidden */
export const salaryLabel = (min?: number | null, max?: number | null) =>
  min == null && max == null ? null : min != null && max != null ? `₹${min}–${max} LPA` : min != null ? `₹${min}+ LPA` : `Up to ₹${max} LPA`;
