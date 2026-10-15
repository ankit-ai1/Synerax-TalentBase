import { Suspense } from "react";
import { FileUp, UserPlus } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { getMasters } from "@/lib/data";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";
import { SearchView } from "@/components/search/search-view";
import { createClient } from "@/lib/supabase/server";

// dashboard drill-downs — dashboard_segment() is the same definition the dashboard card counts
const SEGMENTS: Record<string, string> = { placed_month: "Placed this month", immediate: "Immediate joiners (notice ≤ 15 days)" };

export const metadata = { title: "Candidates" };

export default async function CandidatesPage({ searchParams }: { searchParams: Promise<{ segment?: string }> }) {
  const [profile, { skills, roles }] = await Promise.all([requireStaff(), getMasters()]);
  const key = (await searchParams).segment ?? "";
  const segment = SEGMENTS[key]
    ? { key, label: SEGMENTS[key], ids: (((await (await createClient()).rpc("dashboard_segment", { p: key })).data ?? []) as string[]) }
    : null;
  return (
    <>
      <PageHeader
        title="Candidates"
        description="Search by skills, role, experience, CTC and notice period. Select candidates to add to a job, shortlist or message them."
        actions={
          <>
            <LinkButton href="/import" variant="secondary">
              <FileUp className="h-4 w-4" /> Import
            </LinkButton>
            <LinkButton href="/candidates/new">
              <UserPlus className="h-4 w-4" /> Add candidate
            </LinkButton>
          </>
        }
      />
      <Suspense>
        <SearchView key={segment?.key ?? "all"} skills={skills} roles={roles} isAdmin={profile.role === "admin"} meId={profile.id} segment={segment} />
      </Suspense>
    </>
  );
}
