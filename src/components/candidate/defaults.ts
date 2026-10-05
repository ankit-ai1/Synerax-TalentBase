import type {
  CandidateFields,
  CandidateFormData,
  Certification,
  Education,
  Experience,
  Project,
  Reference,
} from "@/lib/types";

export const emptyCandidate = (): CandidateFields => ({
  first_name: "",
  middle_name: "",
  last_name: "",
  gender: "",
  dob: "",
  marital_status: "",
  nationality: "Indian",
  father_name: "",
  languages: [],
  email: "",
  alt_email: "",
  phone: "",
  alt_phone: "",
  whatsapp: "",
  linkedin_url: "",
  github_url: "",
  portfolio_url: "",
  current_address: "",
  current_city: "",
  current_state: "",
  current_pincode: "",
  permanent_address: "",
  permanent_city: "",
  permanent_state: "",
  permanent_pincode: "",
  country: "India",
  headline: "",
  summary: "",
  total_experience: "",
  relevant_experience: "",
  currently_employed: true,
  current_company: "",
  current_designation: "",
  current_employment_type: "",
  current_payroll: "",
  industry: "",
  functional_area: "",
  highest_qualification: "",
  career_gap: false,
  career_gap_details: "",
  reason_for_change: "",
  current_ctc: "",
  current_fixed_ctc: "",
  current_variable_ctc: "",
  expected_ctc: "",
  ctc_negotiable: false,
  last_hike_date: "",
  last_hike_percent: "",
  notice_period_days: "",
  serving_notice: false,
  last_working_day: "",
  available_from: "",
  notice_buyout: false,
  offers_in_hand: "",
  offer_details: "",
  preferred_locations: [],
  willing_to_relocate: false,
  work_mode_preference: "",
  job_type_preference: "",
  shift_preference: "",
  willing_to_travel: false,
  pan_number: "",
  uan_number: "",
  passport_number: "",
  passport_valid_till: "",
  visa_status: "",
  bgv_status: "Not started",
  status: "New",
  source: "",
  referred_by: "",
  rating: "",
  tags: [],
});

export const emptyExperience = (): Experience => ({
  company: "",
  designation: "",
  employment_type: "",
  location: "",
  start_date: "",
  end_date: "",
  is_current: false,
  ctc: "",
  responsibilities: "",
  reason_for_leaving: "",
});

export const emptyEducation = (): Education => ({
  level: "",
  degree: "",
  specialization: "",
  institute: "",
  university: "",
  start_year: "",
  end_year: "",
  grade: "",
  grade_type: "",
  education_mode: "",
});

export const emptyCertification = (): Certification => ({
  name: "",
  issuer: "",
  issue_date: "",
  expiry_date: "",
  credential_id: "",
  credential_url: "",
});

export const emptyProject = (): Project => ({
  title: "",
  client: "",
  role: "",
  technologies: "",
  start_date: "",
  end_date: "",
  description: "",
});

export const emptyReference = (): Reference => ({
  name: "",
  company: "",
  designation: "",
  relation: "",
  phone: "",
  email: "",
});

export const emptyForm = (): CandidateFormData => ({
  candidate: emptyCandidate(),
  skills: [],
  job_roles: [],
  experiences: [emptyExperience()],
  educations: [emptyEducation()],
  certifications: [],
  projects: [],
  references: [],
});

/** DB row (null values) -> form strings */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toFormStrings<T extends object>(empty: T, row: Record<string, any>): T {
  const out = { ...empty } as Record<string, unknown>;
  for (const k of Object.keys(empty)) {
    const v = row[k];
    const def = (empty as Record<string, unknown>)[k];
    if (v === null || v === undefined) continue;
    if (typeof def === "boolean") out[k] = Boolean(v);
    else if (Array.isArray(def)) out[k] = Array.isArray(v) ? v : [];
    else out[k] = String(v);
  }
  return out as T;
}
