import { Building2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LinkButton } from "@/components/ui/button";
import { Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { ClientsGrid } from "@/components/clients/clients-grid";

export const metadata = { title: "Clients" };

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function ClientsPage() {
  const supabase = await createClient();
  const [{ data: clients }, { data: jobs }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, client_code, name, industry, city, status, fee_type, fee_value, created_at, manager:profiles!clients_account_manager_fkey(full_name), client_contacts(name, is_primary)")
      .order("name"),
    supabase.from("jobs").select("id, client_id, status, openings, applications(stage)"),
  ]);

  const stats: Record<string, { open: number; total: number; pipeline: number; joined: number; positions: number }> = {};
  for (const j of (jobs ?? []) as any[]) {
    if (!j.client_id) continue;
    const s = (stats[j.client_id] ??= { open: 0, total: 0, pipeline: 0, joined: 0, positions: 0 });
    s.total++;
    if (j.status === "Open") {
      s.open++;
      s.positions += j.openings;
    }
    for (const a of j.applications ?? []) {
      if (a.stage === "Joined") s.joined++;
      else if (!["Rejected", "Dropped"].includes(a.stage)) s.pipeline++;
    }
  }

  const rows = (clients ?? []).map((c: any) => ({
    ...c,
    primary: (c.client_contacts ?? []).find((x: any) => x.is_primary)?.name ?? c.client_contacts?.[0]?.name ?? null,
    stats: stats[c.id] ?? { open: 0, total: 0, pipeline: 0, joined: 0, positions: 0 },
  }));

  return (
    <>
      <PageHeader
        title="Clients"
        description="The companies you hire for — jobs, contacts and placements in one place."
        actions={
          <LinkButton href="/clients/new">
            <Plus className="h-4 w-4" /> Add client
          </LinkButton>
        }
      />
      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Building2 className="h-6 w-6" />}
            title="No clients yet"
            description="Add your first client, then create job openings for them and add candidates to the pipeline."
            action={
              <LinkButton href="/clients/new">
                <Plus className="h-4 w-4" /> Add your first client
              </LinkButton>
            }
          />
        </Card>
      ) : (
        <ClientsGrid clients={rows} />
      )}
    </>
  );
}
