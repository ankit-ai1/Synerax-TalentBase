import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getCandidate, getMasters, toFormData } from "@/lib/data";
import { PageHeader } from "@/components/ui/misc";
import { CandidateForm } from "@/components/candidate/candidate-form";
import { fullName } from "@/lib/utils";

export const metadata = { title: "Edit candidate" };

export default async function EditCandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row, masters] = await Promise.all([getCandidate(id), getMasters()]);
  if (!row) notFound();
  const initial = toFormData(row);
  return (
    <>
      <Link href={`/candidates/${id}`} className="mb-3 inline-flex items-center gap-1 text-sm text-ink-400 hover:text-ink-800">
        <ChevronLeft className="h-4 w-4" /> Back to profile
      </Link>
      <PageHeader title={`Edit ${fullName(row)}`} description={row.candidate_code} />
      <CandidateForm mode="edit" initial={initial} skills={masters.skills} roles={masters.roles} />
    </>
  );
}
