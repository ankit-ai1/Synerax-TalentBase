import "server-only";
import { revalidatePath } from "next/cache";

/**
 * Refresh every cached public page that lists jobs, right after a job changes (create / edit / publish /
 * close / delete). Pages also re-check every 60 s on their own, so date-based expiry needs no action.
 */
export function revalidateCareers() {
  for (const p of ["/careers", "/job-seekers", "/sitemap.xml"]) revalidatePath(p);
  revalidatePath("/job-board/[slug]", "page"); // /jobs/<landing> + /jobs/<title>-job-0012
}
