import { getMasters } from "@/lib/data";
import { PageHeader } from "@/components/ui/misc";
import { CandidateForm } from "@/components/candidate/candidate-form";
import { emptyForm } from "@/components/candidate/defaults";

export const metadata = { title: "Add candidate" };

export default async function NewCandidatePage() {
  const { skills, roles } = await getMasters();
  return (
    <>
      <PageHeader title="Add candidate" description="The more details you fill in, the more accurately search will find this candidate." />
      <CandidateForm mode="create" initial={emptyForm()} skills={skills} roles={roles} />
    </>
  );
}
