export type Role = "admin" | "hr";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  aliases: string[];
}

export interface JobRole {
  id: string;
  name: string;
  department: string;
}

/** All scalar candidate fields — kept as strings in the form, converted in the DB */
export interface CandidateFields {
  first_name: string;
  middle_name: string;
  last_name: string;
  gender: string;
  dob: string;
  marital_status: string;
  nationality: string;
  father_name: string;
  languages: string[];

  email: string;
  alt_email: string;
  phone: string;
  alt_phone: string;
  whatsapp: string;
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;

  current_address: string;
  current_city: string;
  current_state: string;
  current_pincode: string;
  permanent_address: string;
  permanent_city: string;
  permanent_state: string;
  permanent_pincode: string;
  country: string;

  headline: string;
  summary: string;
  total_experience: string;
  relevant_experience: string;
  currently_employed: boolean;
  current_company: string;
  current_designation: string;
  current_employment_type: string;
  current_payroll: string;
  industry: string;
  functional_area: string;
  highest_qualification: string;
  career_gap: boolean;
  career_gap_details: string;
  reason_for_change: string;

  current_ctc: string;
  current_fixed_ctc: string;
  current_variable_ctc: string;
  expected_ctc: string;
  ctc_negotiable: boolean;
  last_hike_date: string;
  last_hike_percent: string;

  notice_period_days: string;
  serving_notice: boolean;
  last_working_day: string;
  available_from: string;
  notice_buyout: boolean;
  offers_in_hand: string;
  offer_details: string;

  preferred_locations: string[];
  willing_to_relocate: boolean;
  work_mode_preference: string;
  job_type_preference: string;
  shift_preference: string;
  willing_to_travel: boolean;

  pan_number: string;
  uan_number: string;
  passport_number: string;
  passport_valid_till: string;
  visa_status: string;
  bgv_status: string;

  status: string;
  source: string;
  referred_by: string;
  rating: string;
  tags: string[];
}

export interface SkillEntry {
  skill_id: string;
  name: string;
  years: string;
  level: string;
  is_primary: boolean;
}

export interface RoleEntry {
  job_role_id: string;
  name: string;
  is_primary: boolean;
}

export interface Experience {
  company: string;
  designation: string;
  employment_type: string;
  location: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  ctc: string;
  responsibilities: string;
  reason_for_leaving: string;
}

export interface Education {
  level: string;
  degree: string;
  specialization: string;
  institute: string;
  university: string;
  start_year: string;
  end_year: string;
  grade: string;
  grade_type: string;
  education_mode: string;
}

export interface Certification {
  name: string;
  issuer: string;
  issue_date: string;
  expiry_date: string;
  credential_id: string;
  credential_url: string;
}

export interface Project {
  title: string;
  client: string;
  role: string;
  technologies: string;
  start_date: string;
  end_date: string;
  description: string;
}

export interface Reference {
  name: string;
  company: string;
  designation: string;
  relation: string;
  phone: string;
  email: string;
}

export interface CandidateFormData {
  id?: string;
  candidate: CandidateFields;
  skills: SkillEntry[];
  job_roles: RoleEntry[];
  experiences: Experience[];
  educations: Education[];
  certifications: Certification[];
  projects: Project[];
  references: Reference[];
}

export interface CandidateDocument {
  id: string;
  candidate_id: string;
  doc_type: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  drive_file_id: string;
  is_archived: boolean;
  uploaded_by: string | null;
  created_at: string;
  uploader?: { full_name: string } | null;
}

export interface SearchItem {
  id: string;
  candidate_code: string;
  first_name: string;
  last_name: string | null;
  headline: string | null;
  current_designation: string | null;
  current_company: string | null;
  current_city: string | null;
  preferred_locations: string[];
  total_experience: number | null;
  current_ctc: number | null;
  expected_ctc: number | null;
  notice_period_days: number | null;
  serving_notice: boolean;
  last_working_day: string | null;
  status: string;
  rating: number | null;
  updated_at: string;
  work_mode_preference: string | null;
  skill_match: number | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  gender: string | null;
  tags: string[];
  created_at: string;
  available_from: string | null;
  active_jobs: number;
  skills: { id: string; name: string; years: number | null; primary: boolean; matched: boolean }[];
  roles: string[];
}

export interface SearchResult {
  total: number;
  page: number;
  page_size: number;
  items: SearchItem[];
}
