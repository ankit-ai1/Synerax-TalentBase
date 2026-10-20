import { z } from "zod";
import { apiStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { CLIENT_ROLES, inviteClientMember } from "@/lib/client-team";

export const runtime = "nodejs";

const schema = z.object({
  client_id: z.string().uuid(),
  name: z.string().trim().min(2, "Name is required").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: z.string().trim().max(20).optional().default(""),
  designation: z.string().trim().max(120).optional().default(""),
  role: z.enum(CLIENT_ROLES).optional(),
});

/** Staff (admin/HR): add a member to a client's team — invite email with a set-password link. The first member is the company admin. */
export async function POST(req: Request) {
  const a = await apiStaff();
  if ("error" in a) return a.error;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Please check the form" }, { status: 400 });
  const { client_id, role, ...rest } = parsed.data;
  const { count } = await createAdminClient().from("client_users").select("id", { count: "exact", head: true }).eq("client_id", client_id).eq("role", "client_admin").neq("status", "deactivated");
  try {
    const r = await inviteClientMember({ clientId: client_id, ...rest, role: role ?? (count ? "recruiter" : "client_admin"), invitedBy: a.profile.id });
    return Response.json({ ok: true, ...r });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Could not add the member" }, { status: 400 });
  }
}
