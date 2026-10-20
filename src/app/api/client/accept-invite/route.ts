import { apiClientMember } from "@/lib/client-api";

export const runtime = "nodejs";

/** a client member finished /auth/set-password → mark them active (and record the login) */
export async function POST() {
  const c = await apiClientMember();
  if ("error" in c) return c.error;
  await c.sb.rpc("client_touch_login");
  return Response.json({ ok: true });
}
