import { z } from "zod";
import { apiClientMember, rpcError } from "@/lib/client-api";
import { notifyClientUsers } from "@/lib/client-team";

export const runtime = "nodejs";

/** owner / client_admin: hand a job to another member → they are notified */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await apiClientMember();
  if ("error" in c) return c.error;
  const { id } = await params;
  const parsed = z.object({ to: z.string().uuid() }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Choose a member" }, { status: 400 });
  const { data: job } = await c.sb.rpc("client_job", { p_job: id });
  const { data, error } = await c.sb.rpc("client_job_transfer", { p_job: id, p_to: parsed.data.to });
  if (error) return rpcError(error.message);
  const to = (data as { to: { user_id: string; name: string } }).to;
  if (to.user_id !== c.userId) {
    await notifyClientUsers([to.user_id], {
      event: "client_job_transferred",
      title: `${c.me.user.name} transferred “${(job as { title?: string } | null)?.title ?? "a job"}” to you`,
      body: "You now own this job — its shared profiles and decisions are yours.",
      link: `/client/jobs/${id}`,
      cta: "Open the job",
      clientId: c.me.client.id,
      jobId: id,
    });
  }
  return Response.json({ ok: true, to });
}
