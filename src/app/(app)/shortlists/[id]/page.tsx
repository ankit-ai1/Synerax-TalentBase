import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ShortlistDetail } from "@/components/shortlists/shortlist-client";

export const metadata = { title: "Shortlist" };

export default async function ShortlistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireStaff();
  const supabase = await createClient();
  const [{ data: list }, { data: members }] = await Promise.all([
    supabase.from("shortlists").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("shortlist_candidates")
      .select("note, added_at, candidate:candidates(id, first_name, last_name, current_designation, total_experience, current_ctc, expected_ctc, notice_period_days, current_city, status, phone, email)")
      .eq("shortlist_id", id)
      .order("added_at", { ascending: false }),
  ]);
  if (!list) notFound();
  return (
    <>
      <Link href="/shortlists" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-400 hover:text-ink-800">
        <ChevronLeft className="h-4 w-4" /> Shortlists
      </Link>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <ShortlistDetail list={list} members={((members ?? []) as any[]).filter((m) => m.candidate)} isAdmin={profile.role === "admin"} />
    </>
  );
}
