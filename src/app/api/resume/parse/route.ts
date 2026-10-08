import { getCurrentProfile } from "@/lib/auth";
import { isStaffRole } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/server";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import { parseResume } from "@/lib/resume";
import { getSkillDefs, loadCurrentCv, saveResumeText } from "@/lib/resume/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX = 4 * 1024 * 1024;
const ALLOWED = /\.(pdf|docx)$/i;

/**
 * POST /api/resume/parse — returns { fields, confidence, warnings } (never the CV text).
 *   file=<PDF/DOCX>                → parse an uploaded CV (registration flow allowed without login)
 *   current=1                      → candidate portal: parse my current CV
 *   candidate_id=<uuid> [&store=1] → staff: parse that candidate's current CV ("Re-parse CV"); store=1 also
 *                                    refreshes the stored resume_text used by search
 * Rate limits: 10 parses / IP / hour without login, 40 / user / hour when logged in.
 * The CV text is never logged.
 */
export async function POST(req: Request) {
  const profile = await getCurrentProfile().catch(() => null);
  const loggedIn = !!profile?.is_active;
  const key = loggedIn ? `resume:u:${profile!.id}` : `resume:ip:${clientIp(req)}`;
  if (rateLimited(key, loggedIn ? 40 : 10, 60 * 60 * 1000)) {
    return Response.json({ error: "Too many CVs read in the last hour. Please fill the form manually or try again later." }, { status: 429 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return Response.json({ error: "Invalid request" }, { status: 400 });
  const file = form.get("file");
  const candidateId = String(form.get("candidate_id") ?? "");
  const useCurrent = form.get("current") === "1";

  let buf: Buffer;
  let mime = "";
  let name = "";
  let storeFor: string | null = null;

  if (file instanceof File) {
    if (file.size > MAX) return Response.json({ error: "CV must be 4 MB or smaller" }, { status: 413 });
    if (!ALLOWED.test(file.name)) return Response.json({ fields: {}, confidence: 0, warnings: ["Please upload a PDF or DOCX file — we can't read old .doc files or images."] });
    buf = Buffer.from(await file.arrayBuffer());
    mime = file.type;
    name = file.name;
  } else if (candidateId || useCurrent) {
    if (!loggedIn) return Response.json({ error: "Login required" }, { status: 401 });
    let cid = candidateId;
    if (candidateId) {
      if (!isStaffRole(profile!.role)) return Response.json({ error: "Not allowed" }, { status: 403 });
      if (form.get("store") === "1") storeFor = candidateId;
    } else {
      const { data: me } = await createAdminClient().from("candidates").select("id").eq("user_id", profile!.id).maybeSingle();
      if (!me) return Response.json({ error: "Profile not found" }, { status: 404 });
      cid = me.id;
      storeFor = me.id;
    }
    const cv = await loadCurrentCv(cid).catch(() => null);
    if (!cv) return Response.json({ fields: {}, confidence: 0, warnings: ["No CV on file yet — upload one first."] });
    ({ buf, mime, name } = cv);
  } else {
    return Response.json({ error: "Please choose a CV file" }, { status: 400 });
  }

  try {
    const res = await parseResume(buf, mime, { fileName: name, skills: await getSkillDefs().catch(() => []) });
    if (storeFor && res.text) await saveResumeText(storeFor, res.text);
    return Response.json({ fields: res.fields, confidence: res.confidence, warnings: res.warnings });
  } catch {
    // never echo the CV text in errors or logs
    console.error("resume parse failed", { name: name.slice(-40), size: buf.length });
    return Response.json({ fields: {}, confidence: 0, warnings: ["We couldn't read this CV, please fill the details manually."] });
  }
}
