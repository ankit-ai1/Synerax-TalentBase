import type { Option } from "@/components/pickers";

export type JobFormData = {
  id?: string;
  title: string;
  client: Option | null;
  job_role_id: string;
  department: string;
  description: string;
  openings: string;
  employment_type: string;
  work_mode: string;
  locations: string[];
  exp_min: string;
  exp_max: string;
  ctc_min: string;
  ctc_max: string;
  notice_max: string;
  qualification: string;
  priority: string;
  status: string;
  target_date: string;
  hiring_manager: string;
  notes: string;
  skills: { skill_id: string; name: string; is_mandatory: boolean; min_years: string }[];
  assignees: string[];
};

export const emptyJob = (): JobFormData => ({
  title: "",
  client: null,
  job_role_id: "",
  department: "",
  description: "",
  openings: "1",
  employment_type: "Full-time",
  work_mode: "",
  locations: [],
  exp_min: "",
  exp_max: "",
  ctc_min: "",
  ctc_max: "",
  notice_max: "",
  qualification: "",
  priority: "Medium",
  status: "Open",
  target_date: "",
  hiring_manager: "",
  notes: "",
  skills: [],
  assignees: [],
});

