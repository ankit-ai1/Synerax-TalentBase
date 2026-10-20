import "server-only";
import { apiRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";

export type ClientMe = { client: { id: string; name: string }; user: { id: string; name: string; role: string; status: string; email: string } };

/** a signed-in client user + their member record (role) — for the /api/client/* routes */
export async function apiClientMember(): Promise<{ me: ClientMe; userId: string; sb: Awaited<ReturnType<typeof createClient>> } | { error: Response }> {
  const a = await apiRole("client");
  if ("error" in a) return a;
  const sb = await createClient();
  const { data, error } = await sb.rpc("client_me");
  if (error || !data) return { error: Response.json({ error: "Not allowed" }, { status: 403 }) };
  return { me: data as ClientMe, userId: a.profile.id, sb };
}

export const rpcError = (message: string | undefined, status = 400) => Response.json({ error: friendlyError(message) }, { status: /Not allowed/.test(message ?? "") ? 403 : status });
