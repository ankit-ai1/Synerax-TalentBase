import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/misc";
import { Reports, RangePicker } from "@/components/reports/reports";
import { addDays, todayIST } from "@/lib/utils";

export const metadata = { title: "Reports" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ range?: string; from?: string; to?: string }> }) {
  const sp = await searchParams;
  const profile = await requireStaff();
  const today = todayIST();
  const range = sp.range ?? "90";
  let from = addDays(today, -89);
  let to = today;
  if (range === "30") from = addDays(today, -29);
  if (range === "7") from = addDays(today, -6);
  if (range === "month") from = today.slice(0, 8) + "01";
  if (range === "year") from = today.slice(0, 4) + "-01-01";
  if (range === "custom" && sp.from && sp.to) {
    from = sp.from;
    to = sp.to;
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("report_stats", { p_from: from, p_to: to });
  return (
    <>
      <PageHeader
        title="Reports"
        description="Hiring funnel, source performance, team productivity and clients — for the selected time period."
        actions={<RangePicker range={range} from={from} to={to} />}
      />
      {error ? (
        <p className="text-sm text-red-600">{error.message}</p>
      ) : (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <Reports data={data as any} isAdmin={profile.role === "admin"} />
      )}
    </>
  );
}
