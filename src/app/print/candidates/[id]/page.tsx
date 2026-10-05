import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getCandidate } from "@/lib/data";
import { PrintProfile } from "@/components/candidate/print-profile";

export const metadata = { title: "Candidate profile" };

export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireStaff();
  const c = await getCandidate(id);
  if (!c) notFound();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <PrintProfile c={c as any} preparedBy={me.full_name} />;
}
