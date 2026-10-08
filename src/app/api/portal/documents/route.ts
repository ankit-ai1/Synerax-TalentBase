import { apiRole } from "@/lib/auth";
import { indexResumeFile } from "@/lib/resume/server";
import { createAdminClient } from "@/lib/supabase/server";
import { uploadFile } from "@/lib/drive";
import { CANDIDATE_DOC_TYPES, ensureCandidateFolder, getMyCandidate } from "@/lib/portal";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX = 4 * 1024 * 1024;
const RULES: Record<string, RegExp> = {
  Resume: /\.(pdf|docx?)$/i,
  Photo: /\.(jpe?g|png|webp)$/i,
};
const DEFAULT_RULE = /\.(pdf|docx?|jpe?g|png|webp)$/i;

/** Candidate uploads a document to their own profile. A new CV replaces (archives) the previous one. */
export async function POST(req: Request) {
  const a = await apiRole("candidate");
  if ("error" in a) return a.error;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const docType = String(form?.get("doc_type") ?? "Other");
  if (!(CANDIDATE_DOC_TYPES as readonly string[]).includes(docType)) return Response.json({ error: "Invalid document type" }, { status: 400 });
  if (!(file instanceof File)) return Response.json({ error: "No file received" }, { status: 400 });
  if (file.size > MAX) return Response.json({ error: "File must be 4 MB or smaller" }, { status: 413 });
  if (!(RULES[docType] ?? DEFAULT_RULE).test(file.name)) {
    return Response.json({ error: docType === "Resume" ? "CV must be a PDF, DOC or DOCX file" : docType === "Photo" ? "Photo must be a JPG, PNG or WEBP image" : "Unsupported file type" }, { status: 415 });
  }

  const admin = createAdminClient();
  const cand = await getMyCandidate(admin, a.profile.id);
  if (!cand) return Response.json({ error: "Your profile isn't ready yet" }, { status: 404 });

  try {
    const folderId = await ensureCandidateFolder(admin, cand);
    const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
    const data = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadFile({
      name: `${docType} - ${file.name.slice(0, file.name.length - ext.length)}${ext}`,
      mimeType: file.type,
      data,
      parentId: folderId,
    });
    // one active CV / photo at a time — older ones are archived (kept for history)
    if (docType === "Resume" || docType === "Photo") {
      await admin.from("candidate_documents").update({ is_archived: true }).eq("candidate_id", cand.id).eq("doc_type", docType).eq("is_archived", false);
    }
    const { data: doc, error } = await admin
      .from("candidate_documents")
      .insert({
        candidate_id: cand.id,
        doc_type: docType,
        file_name: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
        drive_file_id: uploaded.id!,
        uploaded_by: a.profile.id,
      })
      .select("id, doc_type, file_name, size_bytes, created_at")
      .single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    await admin.from("candidates").update({ updated_at: new Date().toISOString() }).eq("id", cand.id);
    if (docType === "Resume") await indexResumeFile(cand.id, data, file.type, file.name);
    return Response.json({ document: doc });
  } catch (e) {
    console.error("Portal upload failed", e);
    return Response.json({ error: "Upload failed. Please try again." }, { status: 502 });
  }
}
