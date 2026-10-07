/** Every automated email, grouped by audience. Admins can turn each one off in Admin → Email settings. */
export type EmailAudience = "synerax" | "client" | "candidate" | "system";

export const EMAIL_EVENTS = [
  // to Synerax
  { key: "staff_client_job_posted", audience: "synerax", label: "Client posted a new job" },
  { key: "staff_client_job_changed", audience: "synerax", label: "Client edited, closed or deleted a job" },
  { key: "staff_client_decision", audience: "synerax", label: "Client approved or rejected a profile" },
  { key: "staff_client_interview_feedback", audience: "synerax", label: "Client gave interview feedback / final result" },
  { key: "staff_client_comment", audience: "synerax", label: "Client sent a message on a profile" },
  { key: "staff_candidate_applied", audience: "synerax", label: "Candidate applied via the portal" },
  { key: "staff_candidate_withdrew", audience: "synerax", label: "Candidate withdrew an application" },
  { key: "staff_daily_digest", audience: "synerax", label: "Daily digest of new registrations" },
  // to clients
  { key: "client_login_created", audience: "client", label: "Portal login created / password reset" },
  { key: "client_job_received", audience: "client", label: "Job received (pending review)" },
  { key: "client_job_published", audience: "client", label: "Job published" },
  { key: "client_profiles_shared", audience: "client", label: "Profiles shared (one email per share)" },
  { key: "client_interview_scheduled", audience: "client", label: "Interview scheduled / rescheduled" },
  { key: "client_pending_reminder", audience: "client", label: "Reminder: shared profiles pending over 48 h" },
  { key: "client_candidate_joined", audience: "client", label: "Candidate joined" },
  { key: "client_comment", audience: "client", label: "Synerax replied on a profile" },
  // to candidates
  { key: "candidate_welcome", audience: "candidate", label: "Welcome after registration" },
  { key: "candidate_profile_reminder", audience: "candidate", label: "Incomplete-profile reminder (after 3 days, max 2)" },
  { key: "candidate_application_received", audience: "candidate", label: "Application received" },
  { key: "candidate_profile_shared", audience: "candidate", label: "Profile shared with an employer" },
  { key: "candidate_shortlisted", audience: "candidate", label: "Shortlisted for interview" },
  { key: "candidate_interview_scheduled", audience: "candidate", label: "Interview scheduled (with calendar invite)" },
  { key: "candidate_not_selected", audience: "candidate", label: "Not selected (polite)" },
  { key: "candidate_offer", audience: "candidate", label: "Offer" },
  { key: "candidate_joined", audience: "candidate", label: "Joined — congratulations" },
  { key: "candidate_job_alerts", audience: "candidate", label: "New matching jobs (opt-in, max daily)" },
  // system
  { key: "test", audience: "system", label: "Test email" },
] as const satisfies readonly { key: string; audience: EmailAudience; label: string }[];

export type EmailEventKey = (typeof EMAIL_EVENTS)[number]["key"];

export const AUDIENCE_LABEL: Record<EmailAudience, string> = {
  synerax: "To the Synerax team",
  client: "To clients",
  candidate: "To candidates",
  system: "System",
};
