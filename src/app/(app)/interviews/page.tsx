import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/misc";
import { InterviewsView } from "@/components/interviews/interviews-view";
import { ScheduleButton } from "@/components/interviews/schedule-button";
import { INTERVIEW_SELECT } from "@/lib/selects";

export const metadata = { title: "Interviews" };

export default async function InterviewsPage() {
  const profile = await requireStaff();
  const supabase = await createClient();
  const from = new Date(Date.now() - 60 * 86400e3).toISOString();
  const to = new Date(Date.now() + 60 * 86400e3).toISOString();
  const { data } = await supabase.from("interviews").select(INTERVIEW_SELECT).gte("scheduled_at", from).lte("scheduled_at", to).order("scheduled_at");
  return (
    <>
      <PageHeader title="Interviews" description="All rounds — when, who, for which job, and feedback." actions={<ScheduleButton />} />
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <InterviewsView interviews={(data ?? []) as any[]} meId={profile.id} />
    </>
  );
}
