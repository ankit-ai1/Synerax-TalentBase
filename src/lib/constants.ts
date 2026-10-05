export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Synerax TalentBase";

export const STATUSES = [
  "New",
  "Screening",
  "Available",
  "Interviewing",
  "Offered",
  "Placed",
  "On Bench",
  "On Hold",
  "Not Interested",
  "Blacklisted",
] as const;

/** status -> badge colors (light + dark) */
export const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string; bar: string }> = {
  New: { bg: "bg-slate-100 dark:bg-slate-400/10", text: "text-slate-700 dark:text-slate-300", dot: "bg-slate-400", bar: "#94A3B8" },
  Screening: { bg: "bg-sky-50 dark:bg-sky-400/10", text: "text-sky-800 dark:text-sky-300", dot: "bg-sky-500", bar: "#0EA5E9" },
  Available: { bg: "bg-jade-50", text: "text-jade-700", dot: "bg-jade", bar: "#0F766E" },
  Interviewing: { bg: "bg-violet-50 dark:bg-violet-400/10", text: "text-violet-800 dark:text-violet-300", dot: "bg-violet-500", bar: "#8B5CF6" },
  Offered: { bg: "bg-saffron-50", text: "text-saffron-800", dot: "bg-saffron", bar: "#E9A23B" },
  Placed: { bg: "bg-emerald-50 dark:bg-emerald-400/10", text: "text-emerald-800 dark:text-emerald-300", dot: "bg-emerald-600", bar: "#059669" },
  "On Bench": { bg: "bg-teal-50 dark:bg-teal-400/10", text: "text-teal-800 dark:text-teal-300", dot: "bg-teal-500", bar: "#14B8A6" },
  "On Hold": { bg: "bg-amber-50 dark:bg-amber-400/10", text: "text-amber-800 dark:text-amber-300", dot: "bg-amber-500", bar: "#F59E0B" },
  "Not Interested": { bg: "bg-stone-100 dark:bg-stone-400/10", text: "text-stone-600 dark:text-stone-300", dot: "bg-stone-400", bar: "#A8A29E" },
  Blacklisted: { bg: "bg-red-50 dark:bg-red-500/10", text: "text-red-700 dark:text-red-300", dot: "bg-red-500", bar: "#EF4444" },
};

/** Job pipeline stages (order matters) */
export const STAGES = ["Sourced", "Screening", "Submitted", "Interview", "Offered", "Joined", "Rejected", "Dropped"] as const;
export const ACTIVE_STAGES = ["Sourced", "Screening", "Submitted", "Interview", "Offered", "Joined"] as const;
export const STAGE_STYLE: Record<string, { dot: string; soft: string; text: string; hex: string; hint: string }> = {
  Sourced: { dot: "bg-slate-400", soft: "bg-slate-100 dark:bg-slate-400/10", text: "text-slate-700 dark:text-slate-300", hex: "#94A3B8", hint: "Added to pipeline" },
  Screening: { dot: "bg-sky-500", soft: "bg-sky-50 dark:bg-sky-400/10", text: "text-sky-800 dark:text-sky-300", hex: "#0EA5E9", hint: "Call / basic check in progress" },
  Submitted: { dot: "bg-indigo-500", soft: "bg-indigo-50 dark:bg-indigo-400/10", text: "text-indigo-800 dark:text-indigo-300", hex: "#6366F1", hint: "Profile sent to client" },
  Interview: { dot: "bg-violet-500", soft: "bg-violet-50 dark:bg-violet-400/10", text: "text-violet-800 dark:text-violet-300", hex: "#8B5CF6", hint: "Interview rounds in progress" },
  Offered: { dot: "bg-saffron", soft: "bg-saffron-50", text: "text-saffron-800", hex: "#E9A23B", hint: "Offer received" },
  Joined: { dot: "bg-emerald-600", soft: "bg-emerald-50 dark:bg-emerald-400/10", text: "text-emerald-800 dark:text-emerald-300", hex: "#059669", hint: "Candidate has joined" },
  Rejected: { dot: "bg-red-500", soft: "bg-red-50 dark:bg-red-500/10", text: "text-red-700 dark:text-red-300", hex: "#EF4444", hint: "Rejected by client/HR" },
  Dropped: { dot: "bg-stone-400", soft: "bg-stone-100 dark:bg-stone-400/10", text: "text-stone-600 dark:text-stone-300", hex: "#A8A29E", hint: "Candidate declined" },
};

export const JOB_STATUSES = ["Draft", "Open", "On Hold", "Filled", "Closed"] as const;
export const JOB_STATUS_STYLE: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-700 dark:bg-slate-400/10 dark:text-slate-300",
  Open: "bg-jade-50 text-jade-700",
  "On Hold": "bg-amber-50 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300",
  Filled: "bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300",
  Closed: "bg-stone-100 text-stone-600 dark:bg-stone-400/10 dark:text-stone-300",
};
export const PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;
export const PRIORITY_STYLE: Record<string, { text: string; bars: number }> = {
  Low: { text: "text-ink-400", bars: 1 },
  Medium: { text: "text-sky-600 dark:text-sky-400", bars: 2 },
  High: { text: "text-saffron-600", bars: 3 },
  Urgent: { text: "text-red-600 dark:text-red-400", bars: 4 },
};
export const CLIENT_STATUSES = ["Active", "Prospect", "On Hold", "Inactive"] as const;
export const CLIENT_STATUS_STYLE: Record<string, string> = {
  Active: "bg-jade-50 text-jade-700",
  Prospect: "bg-sky-50 text-sky-800 dark:bg-sky-400/10 dark:text-sky-300",
  "On Hold": "bg-amber-50 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300",
  Inactive: "bg-stone-100 text-stone-600 dark:bg-stone-400/10 dark:text-stone-300",
};
export const INDUSTRIES = ["IT Services", "Product / SaaS", "BFSI", "Fintech", "Healthcare", "Pharma", "Manufacturing", "Retail / E-commerce", "Telecom", "Education", "Logistics", "Consulting", "Media", "Government", "Other"];
export const ROUND_NAMES = ["HR", "Technical", "Technical 2", "Managerial", "Client", "Final", "Assignment"];
export const INTERVIEW_MODES = ["Video", "Phone", "In-person"];
export const INTERVIEW_STATUSES = ["Scheduled", "Completed", "Cancelled", "No-show", "Rescheduled"];
export const INTERVIEW_RESULTS = ["Pending", "Selected", "Rejected", "On Hold"];
export const RESULT_STYLE: Record<string, string> = {
  Pending: "bg-slate-100 text-slate-700 dark:bg-slate-400/10 dark:text-slate-300",
  Selected: "bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300",
  Rejected: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
  "On Hold": "bg-amber-50 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300",
};
export const REJECTION_REASONS = [
  "Skills mismatch",
  "Insufficient experience",
  "CTC expectation too high",
  "Notice period too long",
  "Communication weak",
  "Location issue",
  "Position put on hold by client",
  "Candidate not interested",
  "Accepted a better offer",
  "No-show",
  "Other",
];

export const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];
export const MARITAL = ["Single", "Married", "Divorced", "Widowed"];
export const EMPLOYMENT_TYPES = ["Full-time", "Contract", "Part-time", "Internship", "Freelance"];
export const WORK_MODES = ["Onsite", "Hybrid", "Remote", "Any"];
export const JOB_TYPES = ["Full-time", "Contract", "Contract to Hire", "Freelance", "Any"];
export const SHIFTS = ["Day", "Night", "Rotational", "Any"];
export const SKILL_LEVELS = ["Beginner", "Intermediate", "Expert"];
export const BGV = ["Not started", "In progress", "Cleared", "Failed"];
export const QUALIFICATIONS = [
  "10th",
  "12th",
  "Diploma",
  "ITI",
  "Graduation",
  "Post Graduation",
  "PhD",
];
export const EDU_LEVELS = QUALIFICATIONS;
export const GRADE_TYPES = ["Percentage", "CGPA (10)", "CGPA (4)", "Grade"];
export const EDU_MODES = ["Full-time", "Part-time", "Distance / Correspondence"];
export const SOURCES = [
  "Naukri",
  "LinkedIn",
  "Indeed",
  "Foundit (Monster)",
  "Shine",
  "Instahyre",
  "Referral",
  "Walk-in",
  "Company Website",
  "Job Fair",
  "WhatsApp / Social",
  "Database",
  "Other",
];
export const NOTICE_OPTIONS = [
  { value: "0", label: "Immediate" },
  { value: "15", label: "15 days" },
  { value: "30", label: "30 days" },
  { value: "45", label: "45 days" },
  { value: "60", label: "60 days" },
  { value: "90", label: "90 days" },
  { value: "120", label: "More than 90 days" },
];
export const DOC_TYPES = [
  "Resume",
  "Photo",
  "Aadhaar",
  "PAN",
  "Passport",
  "Offer Letter",
  "Relieving Letter",
  "Experience Letter",
  "Payslip",
  "Education Certificate",
  "Other",
];
export const LANGUAGES = [
  "English",
  "Hindi",
  "Bengali",
  "Marathi",
  "Telugu",
  "Tamil",
  "Gujarati",
  "Kannada",
  "Malayalam",
  "Odia",
  "Punjabi",
  "Urdu",
];
export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];
export const CITIES = [
  "Bangalore", "Hyderabad", "Pune", "Mumbai", "Navi Mumbai", "Thane", "Chennai", "Delhi",
  "Noida", "Gurgaon", "Kolkata", "Ahmedabad", "Jaipur", "Chandigarh", "Indore", "Coimbatore",
  "Kochi", "Trivandrum", "Bhubaneswar", "Lucknow", "Nagpur", "Vadodara", "Mysore",
  "Ranchi", "Patna", "Visakhapatnam", "Remote",
];
