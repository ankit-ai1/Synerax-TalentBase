"use client";

import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

/**
 * Staff may add candidates whose profile is below the apply threshold (they're never blocked).
 * The database flags those rows (applications.below_threshold) and logs an override activity — this just tells the recruiter.
 */
export async function warnBelowThreshold(jobId: string, candidateIds: string[]) {
  if (!candidateIds.length) return;
  const { data } = await createClient()
    .from("applications")
    .select("completion_at_add, candidate:candidates(first_name, last_name)")
    .eq("job_id", jobId)
    .in("candidate_id", candidateIds)
    .eq("below_threshold", true);
  const rows = (data ?? []) as unknown as { completion_at_add: number | null; candidate: { first_name: string; last_name: string | null } | null }[];
  if (!rows.length) return;
  const label = rows.length === 1
    ? `${[rows[0].candidate?.first_name, rows[0].candidate?.last_name].filter(Boolean).join(" ")}: profile ${rows[0].completion_at_add}% complete`
    : `${rows.length} candidates have incomplete profiles`;
  toast.warning(`${label} — added below the apply threshold (override logged)`);
}
