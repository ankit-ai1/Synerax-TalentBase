import { createAdminClient } from "@/lib/supabase/server";
import { verifyUnsubscribe } from "@/lib/email/tracking";

export const runtime = "nodejs";

/** confirmed unsubscribe → the address joins the suppression list (opt-out) */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const e = String(form?.get("e") ?? "").trim().toLowerCase();
  const s = String(form?.get("s") ?? "");
  const back = new URL("/e/unsubscribe", req.url);
  if (!e || !verifyUnsubscribe(e, s)) {
    back.searchParams.set("error", "1");
    return Response.redirect(back, 303);
  }
  await createAdminClient().from("email_suppressions").upsert({ email: e, reason: "opt_out", details: "Unsubscribed from an email" }, { onConflict: "email", ignoreDuplicates: true });
  back.searchParams.set("done", "1");
  return Response.redirect(back, 303);
}
