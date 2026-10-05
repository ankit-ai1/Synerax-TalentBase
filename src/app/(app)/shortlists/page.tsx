import Link from "next/link";
import { Bookmark } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AvatarStack, Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { NewShortlistButton } from "@/components/shortlists/shortlist-client";
import { timeAgo } from "@/lib/utils";

export const metadata = { title: "Shortlists" };

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function ShortlistsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shortlists")
    .select("id, name, description, updated_at, creator:profiles!shortlists_created_by_fkey(full_name), job:jobs(id, title), shortlist_candidates(candidate:candidates(first_name, last_name))")
    .order("updated_at", { ascending: false });
  const lists = (data ?? []) as any[];
  return (
    <>
      <PageHeader
        title="Shortlists"
        description="Candidate folders — for client submissions, talent pools or anything else."
        actions={<NewShortlistButton />}
      />
      {lists.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Bookmark className="h-6 w-6" />}
            title="No shortlists yet"
            description="Select candidates in search and click 'Shortlist', or create a new one here."
            action={<NewShortlistButton />}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {lists.map((l) => {
            const names = (l.shortlist_candidates ?? []).map((x: any) => `${x.candidate?.first_name ?? ""} ${x.candidate?.last_name ?? ""}`.trim());
            return (
              <Link
                key={l.id}
                href={`/shortlists/${l.id}`}
                className="group flex flex-col rounded-xl border border-line bg-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-pop"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-saffron-50 text-saffron-600">
                    <Bookmark className="h-5 w-5 fill-current" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink-900 group-hover:text-jade-700">{l.name}</p>
                    <p className="truncate text-xs text-ink-400">{l.description || (l.job ? `For ${l.job.title}` : "—")}</p>
                  </div>
                  <span className="text-2xl font-semibold tabular text-ink-900">{names.length}</span>
                </div>
                <div className="mt-5 flex items-center justify-between">
                  {names.length ? <AvatarStack names={names} max={5} /> : <span className="text-xs text-ink-400">Empty</span>}
                  <span className="text-xs text-ink-400">
                    {l.creator?.full_name ? `${l.creator.full_name} · ` : ""}
                    {timeAgo(l.updated_at)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
