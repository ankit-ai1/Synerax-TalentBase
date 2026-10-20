import { z } from "zod";
import { apiClientMember } from "@/lib/client-api";
import { CLIENT_ROLES, inviteClientMember } from "@/lib/client-team";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: z.string().trim().max(20).optional().default(""),
  designation: z.string().trim().max(120).optional().default(""),
  role: z.enum(CLIENT_ROLES),
});

/** client_admin: add a member to their own company (invite email with a set-password link) */
export async function POST(req: Request) {
  const c = await apiClientMember();
  if ("error" in c) return c.error;
  if (c.me.user.role !== "client_admin") return Response.json({ error: "Only your company admin can add members" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Please check the form" }, { status: 400 });
  try {
    const r = await inviteClientMember({ clientId: c.me.client.id, ...parsed.data, invitedBy: c.userId });
    return Response.json({ ok: true, ...r });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Could not add the member" }, { status: 400 });
  }
}
