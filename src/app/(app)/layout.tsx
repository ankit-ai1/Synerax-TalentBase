import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { istDayRange } from "@/lib/utils";
import { AppShell } from "@/components/shell/app-shell";

export const dynamic = "force-dynamic";

export const metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireStaff();
  const supabase = await createClient();
  const { from, to } = istDayRange();

  // sidebar badges
  const [tasks, interviews, jobs, review] = await Promise.all([
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "Open").eq("assigned_to", profile.id).lt("due_at", to),
    supabase.from("interviews").select("id", { count: "exact", head: true }).gte("scheduled_at", from).lt("scheduled_at", to).neq("status", "Cancelled"),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "Open"),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "Pending review"),
  ]);

  return (
    <AppShell profile={profile} counts={{ tasks: tasks.count ?? 0, interviews: interviews.count ?? 0, jobs: jobs.count ?? 0, review: review.count ?? 0 }}>
      {children}
    </AppShell>
  );
}
