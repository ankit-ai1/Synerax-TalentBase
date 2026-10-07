import Link from "next/link";
import { ArrowRight, Building2, ClipboardCheck, FileText, MapPin } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { range } from "@/components/jobs/job-row";
import { formatDateTime, timeAgo } from "@/lib/utils";

export const metadata = { title: "Pending review" };

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function ReviewQueuePage() {
  await requireStaff();
  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select("id, job_code, title, openings, locations, work_mode, exp_min, exp_max, ctc_min, ctc_max, jd_file_name, posted_by_client, created_at, client:clients(id, name), poster:profiles!jobs_posted_by_fkey(full_name)")
    .eq("status", "Pending review")
    .order("created_at", { ascending: true });
  const jobs = (data ?? []) as any[];

  return (
    <>
      <PageHeader
        title="Pending review"
        description="Jobs posted by clients from their portal. Review each one, write the public description and publish it to the careers page."
      />
      {jobs.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardCheck className="h-6 w-6" />}
            title="All caught up"
            description="When a client posts a job from their portal it lands here for review before it goes live."
          />
        </Card>
      ) : (
        <Card className="divide-y divide-line">
          {jobs.map((j) => (
            <Link key={j.id} href={`/jobs/${j.id}#publish`} className="group flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-surface-2 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-ink-900">{j.title}</p>
                  <span className="font-mono text-[11px] text-ink-400">{j.job_code}</span>
                  {j.jd_file_name && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-3 px-2 py-0.5 text-[11px] text-ink-600">
                      <FileText className="h-3 w-3" /> JD attached
                    </span>
                  )}
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-500">
                  {j.client && (
                    <span className="inline-flex items-center gap-1.5 font-medium text-ink-700">
                      <Building2 className="h-3.5 w-3.5 text-ink-400" /> {j.client.name}
                    </span>
                  )}
                  {(j.locations ?? []).length > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-ink-400" /> {[(j.locations ?? []).join(", "), j.work_mode].filter(Boolean).join(" · ")}
                    </span>
                  )}
                  {range(j.exp_min, j.exp_max, "yrs") && <span>{range(j.exp_min, j.exp_max, "yrs")}</span>}
                  {range(j.ctc_min, j.ctc_max, "LPA") && <span>₹{range(j.ctc_min, j.ctc_max, "LPA")}</span>}
                  <span>
                    {j.openings} opening{j.openings === 1 ? "" : "s"}
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-4 text-[13px] text-ink-500">
                <span title={formatDateTime(j.created_at)}>
                  {j.poster?.full_name ? `${j.poster.full_name} · ` : ""}
                  {timeAgo(j.created_at)}
                </span>
                <span className="inline-flex items-center gap-1 font-medium text-jade-700">
                  Review <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </Card>
      )}
    </>
  );
}
