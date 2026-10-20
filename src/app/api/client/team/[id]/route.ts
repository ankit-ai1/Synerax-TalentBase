import { z } from "zod";
import { apiClientMember, rpcError } from "@/lib/client-api";
import { createAdminClient } from "@/lib/supabase/server";
import { CLIENT_ROLES, notifyClientUsers, resendClientInvite, setClientLoginBlocked } from "@/lib/client-team";

export const runtime = "nodejs";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("role"), role: z.enum(CLIENT_ROLES) }),
  z.object({ action: z.literal("deactivate"), transfer_to: z.string().uuid().nullish() }),
  z.object({ action: z.literal("reactivate") }),
  z.object({ action: z.literal("resend") }),
]);

/** client_admin: change role · deactivate (handing jobs + open tasks to someone) · reactivate · resend invite */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await apiClientMember();
  if ("error" in c) return c.error;
  if (c.me.user.role !== "client_admin") return Response.json({ error: "Only your company admin can manage members" }, { status: 403 });
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const body = parsed.data;
  // the member must belong to the caller's company (the RPCs check again)
  const { data: m } = await createAdminClient().from("client_users").select("id, client_id").eq("id", id).maybeSingle();
  if (!m || m.client_id !== c.me.client.id) return Response.json({ error: "Not allowed" }, { status: 403 });

  if (body.action === "role") {
    const { error } = await c.sb.rpc("client_member_set_role", { p_member: id, p_role: body.role });
    return error ? rpcError(error.message) : Response.json({ ok: true });
  }
  if (body.action === "deactivate") {
    const { data, error } = await c.sb.rpc("client_member_deactivate", { p_member: id, p_transfer_to: body.transfer_to ?? null });
    if (error) return rpcError(error.message);
    await setClientLoginBlocked(id, true);
    const r = data as { jobs: number; tasks: number; to: { id: string; name: string; user_id: string } | null };
    if (r.to && (r.jobs || r.tasks)) {
      await notifyClientUsers([r.to.user_id], {
        event: "client_job_transferred",
        title: `${r.jobs} job${r.jobs === 1 ? "" : "s"} and ${r.tasks} task${r.tasks === 1 ? "" : "s"} were handed over to you`,
        body: `${c.me.user.name} moved them to you when a team member left.`,
        link: "/client/jobs",
        cta: "Open my jobs",
        clientId: c.me.client.id,
      });
    }
    return Response.json({ ok: true, ...r });
  }
  if (body.action === "reactivate") {
    const { error } = await c.sb.rpc("client_member_reactivate", { p_member: id });
    if (error) return rpcError(error.message);
    await setClientLoginBlocked(id, false);
    return Response.json({ ok: true });
  }
  try {
    return Response.json({ ok: true, ...(await resendClientInvite(id, c.userId)) });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Could not resend" }, { status: 400 });
  }
}
