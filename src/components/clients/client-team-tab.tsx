import Link from "next/link";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { Card, CardHeader, EmptyState } from "@/components/ui/misc";
import { TeamManager } from "@/components/client/team-manager";
import { ACTION_LABEL, TASK_TYPE_LABEL, type ClientMember } from "@/lib/client-labels";
import { cn, formatDateTime, timeAgo } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** members of a client company with the admin-view stats (emails + last sign-in via the service role) */
export async function loadClientMembers(clientId: string): Promise<ClientMember[]> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const [{ data: rows }, { data: tasks }, { data: jobs }] = await Promise.all([
    supabase.from("client_users").select("id, user_id, name, phone, designation, role, status, last_login_at, invited_at").eq("client_id", clientId).order("created_at"),
    supabase.from("client_tasks").select("assigned_to").eq("client_id", clientId).in("status", ["todo", "in_progress"]),
    supabase.from("jobs").select("posted_by_client_user").eq("client_id", clientId).is("client_deleted_at", null).not("status", "in", "(Filled,Closed)"),
  ]);
  const count = (list: any[] | null, key: string, id: string) => (list ?? []).filter((x) => x[key] === id).length;
  return Promise.all(
    (rows ?? []).map(async (u: any) => {
      const { data } = await admin.auth.admin.getUserById(u.user_id);
      return {
        id: u.id,
        name: u.name,
        role: u.role,
        status: u.status,
        designation: u.designation,
        me: false,
        email: data.user?.email ?? "—",
        phone: u.phone,
        last_login_at: u.last_login_at ?? data.user?.last_sign_in_at ?? null,
        invited_at: u.invited_at,
        open_tasks: count(tasks, "assigned_to", u.id),
        jobs_owned: count(jobs, "posted_by_client_user", u.id),
      } as ClientMember;
    })
  );
}

/** Synerax staff: a client's team, its tasks and its activity log */
export async function ClientTeamTab({ clientId, members }: { clientId: string; members: ClientMember[] }) {
  const supabase = await createClient();
  const [{ data: tasks }, { data: log }] = await Promise.all([
    supabase
      .from("client_tasks")
      .select("id, title, type, status, priority, due_at, completed_at, assignee:client_users!client_tasks_assigned_to_fkey(name), job:jobs(id, title)")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("client_activity_log")
      .select("id, action, details, created_at, job:jobs(id, title), member:client_users!client_activity_log_actor_client_user_fkey(name), actor:profiles!client_activity_log_actor_user_fkey(full_name, role)")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(60),
  ]);
  return (
    <div className="space-y-6">
      <TeamManager members={members} mode="staff" clientId={clientId} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Client tasks" description="Tasks inside the client's team" />
          {(tasks ?? []).length === 0 ? (
            <EmptyState title="No tasks yet" compact />
          ) : (
            <ul className="divide-y divide-line">
              {(tasks as any[]).map((t) => {
                const overdue = t.status !== "done" && t.status !== "cancelled" && t.due_at && new Date(t.due_at).getTime() < Date.now();
                return (
                  <li key={t.id} className="flex items-start justify-between gap-3 px-5 py-3 text-[13px]">
                    <div className="min-w-0">
                      <p className="font-medium text-ink-900">{t.title}</p>
                      <p className="text-[12px] text-ink-500">
                        {[TASK_TYPE_LABEL[t.type], t.assignee?.name && `→ ${t.assignee.name}`].filter(Boolean).join(" · ")}
                        {t.job && (
                          <>
                            {" · "}
                            <Link href={`/jobs/${t.job.id}`} className="text-jade-700 hover:underline">
                              {t.job.title}
                            </Link>
                          </>
                        )}
                      </p>
                    </div>
                    <span className={cn("shrink-0 text-[12px]", overdue ? "font-semibold text-red-600 dark:text-red-400" : "text-ink-500")}>
                      {t.status === "done" ? "Done" : overdue ? "Overdue" : t.status === "in_progress" ? "In progress" : t.status === "cancelled" ? "Cancelled" : "To do"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="Client activity" description="Jobs, decisions, tasks and team changes" />
          {(log ?? []).length === 0 ? (
            <EmptyState title="No activity yet" compact />
          ) : (
            <ul className="divide-y divide-line">
              {(log as any[]).map((l) => (
                <li key={l.id} className="flex items-start justify-between gap-3 px-5 py-2.5 text-[13px]">
                  <p className="min-w-0 text-ink-700">
                    <b className="font-semibold text-ink-900">{l.member?.name ?? (l.actor?.role === "admin" || l.actor?.role === "hr" ? `${l.actor.full_name} (Synerax)` : "System")}</b> {(ACTION_LABEL[l.action] ?? l.action).toLowerCase()}
                    {l.job && (
                      <>
                        {" · "}
                        <Link href={`/jobs/${l.job.id}`} className="text-jade-700 hover:underline">
                          {l.job.title}
                        </Link>
                      </>
                    )}
                  </p>
                  <span className="shrink-0 text-[12px] text-ink-400" title={formatDateTime(l.created_at)}>
                    {timeAgo(l.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
