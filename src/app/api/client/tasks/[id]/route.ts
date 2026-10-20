import { apiClientMember, rpcError } from "@/lib/client-api";
import { notifyClientUsers } from "@/lib/client-team";

export const runtime = "nodejs";

/** update a task (status by the assignee; anything incl. reassign by client_admin) — a reassigned task notifies the new assignee */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await apiClientMember();
  if ("error" in c) return c.error;
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ error: "Invalid request" }, { status: 400 });
  const { data, error } = await c.sb.rpc("client_task_update", { p_task: id, p: body });
  if (error) return rpcError(error.message);
  const t = data as { title: string; reassigned: boolean; assignee_user_id: string; job: { id: string } | null };
  if (t.reassigned && t.assignee_user_id !== c.userId) {
    await notifyClientUsers([t.assignee_user_id], {
      event: "client_task_assigned",
      title: `Task assigned to you: ${t.title}`,
      body: `${c.me.user.name} assigned you this task.`,
      link: "/client/tasks",
      cta: "Open my tasks",
      clientId: c.me.client.id,
      jobId: t.job?.id,
    });
  }
  return Response.json({ ok: true, task: t });
}
