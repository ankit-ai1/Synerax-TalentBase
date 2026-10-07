import { registrationSchema, CV_ALLOWED, CV_MAX_BYTES } from "@/lib/registration-schema";
import { finalizeRegistration, storePending } from "@/lib/registration";
import { clientIp, rateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Public: called right after the browser signs the candidate up.
 * Stores the profile + CV against the new (unverified) account. The candidate profile itself is
 * only created/linked after the email is verified (see /auth/callback).
 */
export async function POST(req: Request) {
  if (rateLimited(`register:${clientIp(req)}`, 8, 10 * 60 * 1000)) {
    return Response.json({ error: "Too many attempts. Please try again in a few minutes." }, { status: 429 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return Response.json({ error: "Invalid request" }, { status: 400 });
  const userId = String(form.get("user_id") ?? "");
  const cv = form.get("cv");
  let payload: unknown;
  try {
    payload = JSON.parse(String(form.get("payload") ?? "{}"));
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = registrationSchema.safeParse(payload);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Please check the form." }, { status: 400 });
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return Response.json({ error: "Invalid request" }, { status: 400 });
  if (!(cv instanceof File)) return Response.json({ error: "Please upload your CV" }, { status: 400 });
  if (cv.size > CV_MAX_BYTES) return Response.json({ error: "CV must be 4 MB or smaller" }, { status: 413 });
  if (!CV_ALLOWED.test(cv.name)) return Response.json({ error: "CV must be a PDF, DOC or DOCX file" }, { status: 415 });

  try {
    const user = await storePending(userId, parsed.data, cv);
    // Email confirmation turned off in Supabase → the account is already verified, finish now
    if (user.email_confirmed_at) {
      const res = await finalizeRegistration(userId);
      return Response.json({ ok: true, finalized: res.status === "created" || res.status === "linked" || res.status === "already" });
    }
    return Response.json({ ok: true, finalized: false });
  } catch (e) {
    console.error("Registration failed", e);
    return Response.json({ error: e instanceof Error ? e.message : "Registration failed. Please try again." }, { status: 500 });
  }
}
