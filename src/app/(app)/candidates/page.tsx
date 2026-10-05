import { Suspense } from "react";
import { FileUp, UserPlus } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { getMasters } from "@/lib/data";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";
import { SearchView } from "@/components/search/search-view";

export const metadata = { title: "Candidates" };

export default async function CandidatesPage() {
  const [profile, { skills, roles }] = await Promise.all([requireStaff(), getMasters()]);
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
        <SearchView skills={skills} roles={roles} isAdmin={profile.role === "admin"} meId={profile.id} />
      </Suspense>
    </>
  );
}
