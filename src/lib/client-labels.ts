/** Labels for client teams — safe for server and client components */

export const CLIENT_ROLE_OPTIONS = [
  { value: "client_admin", label: "Admin", hint: "Sees every job, manages the team, assigns tasks" },
  { value: "hiring_manager", label: "Hiring manager", hint: "Posts jobs; acts on own and assigned jobs" },
  { value: "recruiter", label: "Recruiter (HR)", hint: "Posts jobs; sees only own and assigned jobs" },
  { value: "ta_coordinator", label: "TA coordinator", hint: "Interviews, feedback and follow-ups on assigned items" },
] as const;
export type ClientRoleValue = (typeof CLIENT_ROLE_OPTIONS)[number]["value"];
export const roleLabel = (r: string | null | undefined) => CLIENT_ROLE_OPTIONS.find((o) => o.value === r)?.label ?? "Member";

export const TASK_TYPES = [
  { value: "review_profile", label: "Review a profile" },
  { value: "interview_feedback", label: "Give interview feedback" },
  { value: "schedule_interview", label: "Schedule an interview" },
  { value: "take_over_job", label: "Take over a job" },
  { value: "follow_up", label: "Follow up (e.g. joining)" },
  { value: "other", label: "Other" },
] as const;
export const TASK_TYPE_LABEL: Record<string, string> = Object.fromEntries(TASK_TYPES.map((t) => [t.value, t.label]));

export const TASK_STATUS = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
] as const;
export const TASK_PRIORITY = ["low", "medium", "high", "urgent"] as const;

export const ACTION_LABEL: Record<string, string> = {
  job_posted: "Posted a job",
  job_edited: "Edited a job",
  job_closed: "Closed a job",
  job_deleted: "Deleted a job",
  job_transferred: "Transferred a job",
  profile_approved: "Approved a profile",
  profile_rejected: "Rejected a profile",
  profile_selected: "Selected after interview",
  task_assigned: "Assigned a task",
  task_updated: "Updated a task",
  task_completed: "Completed a task",
  member_added: "Added a member",
  member_role_changed: "Changed a role",
  member_deactivated: "Deactivated a member",
  member_reactivated: "Reactivated a member",
  collaborator_added: "Added a collaborator",
  collaborator_removed: "Removed a collaborator",
  interview_scheduled: "Scheduled an interview",
  feedback_added: "Added interview feedback",
};

export type ClientTask = {
  id: string;
  title: string;
  type: string;
  note: string | null;
  status: "todo" | "in_progress" | "done" | "cancelled";
  priority: string;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
  assigned_to: { id: string; name: string; role: string } | null;
  assigned_by: string | null;
  job: { id: string; title: string; job_code: string } | null;
  application: { id: string; name: string } | null;
  comments: number;
};

export type ClientMember = {
  id: string;
  name: string;
  role: ClientRoleValue;
  status: "invited" | "active" | "deactivated";
  designation: string | null;
  me: boolean;
  email?: string;
  phone?: string | null;
  last_login_at?: string | null;
  invited_at?: string | null;
  open_tasks?: number;
  jobs_owned?: number;
};
