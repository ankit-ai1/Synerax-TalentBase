import { createAdminClient } from "@/lib/supabase/server";
import { verifyLink } from "@/lib/email/tracking";
import { siteUrl } from "@/lib/email/layout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** click tracker — redirects only to URLs we signed when the email was queued (no open redirect) */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const sp = new URL(req.url).searchParams;
  const url = sp.get("u") ?? "";
  const sig = sp.get("s") ?? "";
  if (!/^[a-f0-9]{32}$/.test(token) || !verifyLink(token, url, sig)) return Response.redirect(siteUrl(), 302);
  const db = createAdminClient();
  const { error } = await db.rpc("email_track", { p_token: token, p_kind: "click", p_url: url });
  if (error) await db.rpc("email_track", { p_token: token, p_kind: "click" }); // before migration 015

  return Response.redirect(url, 302);
}
