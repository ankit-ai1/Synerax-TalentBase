import { Bell, CalendarClock, FileCheck2, Send, Sparkles, Trophy, UserCheck, type LucideIcon } from "lucide-react";

/** Icon per notification type (plain module — safe for server and client components) */
const TYPE_ICON: Record<string, LucideIcon> = {
  interview_scheduled: CalendarClock,
  candidate_interview_scheduled: CalendarClock,
  profiles_shared: Send,
  profile_shared: Send,
  candidate_profile_shared: Send,
  candidate_joined: Trophy,
  candidate_offer: Trophy,
  job_published: FileCheck2,
  job_received: FileCheck2,
  candidate_application_received: FileCheck2,
  job_alert: Sparkles,
  candidate_shortlisted: UserCheck,
};
export const notificationIconName = (type: string): LucideIcon => TYPE_ICON[type] ?? Bell;
