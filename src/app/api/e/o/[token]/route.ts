import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

/** open pixel — counts are approximate (image blocking, Apple Mail privacy pre-loading) */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (/^[a-f0-9]{32}$/.test(token)) await createAdminClient().rpc("email_track", { p_token: token, p_kind: "open" });
  return new Response(GIF, { headers: { "content-type": "image/gif", "cache-control": "no-store, no-cache, must-revalidate, private", "content-length": String(GIF.length) } });
}
