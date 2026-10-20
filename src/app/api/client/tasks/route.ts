import { apiClientMember, rpcError } from "@/lib/client-api";
import { notifyClientUsers } from "@/lib/client-team";
import { TASK_TYPE_LABEL } from "@/lib/client-labels";

export const runtime = "nodejs";


/** create a task (for yourself; client_admin for anyone) → the assignee gets an in-app + email notification */
export async function POST(req: Request) {
  const c = await apiClientMember();
  if ("error" in c) return c.error;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ error: "Invalid request" }, { status: 400 });
  const { data, error } = await c.sb.rpc("client_task_create", { p: body });
  if (error) return rpcError(error.message);
  const t = data as { id: string; title: string; type: string; self: boolean; assignee_user_id: string; due_at: string | null; job: { id: string; title: string } | null; application: { name: string } | null };
  if (!t.self) {
    const what = [t.application?.name, t.job?.title].filter(Boolean).join(" · ");
    const due = t.due_at ? ` · due ${new Date(t.due_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}` : "";
    await notifyClientUsers([t.assignee_user_id], {
      event: "client_task_assigned",
      title: `New task from ${c.me.user.name}: ${t.title}`,
      body: `${TASK_TYPE_LABEL[t.type] ?? "Task"}${what ? ` — ${what}` : ""}${due}`,
      link: "/client/tasks",
      cta: "Open my tasks",
      clientId: c.me.client.id,
      jobId: t.job?.id,
    });
  }
  return Response.json({ ok: true, task: t });
}
