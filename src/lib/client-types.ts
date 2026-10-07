/** Shapes returned by the client-portal RPCs (see supabase/schema.sql, PART 4) */

export type ClientJob = {
  id: string;
  job_code: string;
  title: string;
  status: string;
  published: boolean;
  department: string | null;
  openings: number;
  locations: string[];
  work_mode: string | null;
  employment_type: string | null;
  exp_min: number | null;
  exp_max: number | null;
  ctc_min: number | null;
  ctc_max: number | null;
  target_date: string | null;
  created_at: string;
  published_at: string | null;
  posted_by_client: boolean;
  client_close_reason: string | null;
  shared: number;
  pending_decision: number;
  approved: number;
  joined: number;
};

export type ClientJobDetail = Omit<ClientJob, "shared" | "pending_decision" | "approved" | "joined" | "posted_by_client"> & {
  notice_max: number | null;
  qualification: string | null;
  description: string | null;
  interview_process: string | null;
  jd_file_name: string | null;
  closed_by_client_at: string | null;
  can_edit: boolean;
  skills: { skill_id: string; name: string; mandatory: boolean; min_years: number | null }[];
};

export type ClientInterview = {
  id: string;
  round: string;
  mode: string;
  scheduled_at: string;
  duration_min: number;
  location: string | null;
  meeting_link: string | null;
  status: string;
  client_feedback: string | null;
  client_rating: number | null;
};

export type SharedProfile = {
  application_id: string;
  name: string;
  headline: string | null;
  current_designation: string | null;
  total_experience: number | null;
  current_city: string | null;
  notice_period_days: number | null;
  serving_notice: boolean | null;
  expected_ctc: number | null;
  highest_qualification: string | null;
  skills: { name: string; years: number | null }[];
  education: { degree: string | null; specialization: string | null; institute: string | null; end_year: number | null }[];
  recruiter_note: string | null;
  match: number | null;
  shared_at: string | null;
  has_cv: boolean;
  stage: string;
  decision: "Pending" | "Approved" | "Rejected" | null;
  decision_at: string | null;
  reject_reason: string | null;
  feedback: string | null;
  interviews: ClientInterview[];
  comments: number;
};

export const CLOSE_REASONS = ["Filled via Synerax", "Filled internally", "On hold", "Cancelled"] as const;
export const CLIENT_REJECT_REASONS = [
  "Skills don't match",
  "Not enough experience",
  "Too senior for the role",
  "Salary expectation too high",
  "Notice period too long",
  "Location doesn't work",
  "Already interviewed / known to us",
  "Other",
] as const;
