import { apiStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createFolder, folderExists, rootFolderId, uploadFile } from "@/lib/drive";
import { DOC_TYPES } from "@/lib/constants";
import { indexResumeFile } from "@/lib/resume/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX = 4 * 1024 * 1024; // Vercel's request limit is ~4.5 MB
const ALLOWED = /\.(pdf|docx?|jpe?g|png|webp|txt|rtf)$/i;

export async function POST(req: Request) {
  const a = await apiStaff();
  if ("error" in a) return a.error;

  const form = await req.formData();
  const file = form.get("file");
  const candidateId = String(form.get("candidate_id") ?? "");
  const docTypeRaw = String(form.get("doc_type") ?? "Other");
  const docType = DOC_TYPES.includes(docTypeRaw) ? docTypeRaw : "Other";

  if (!(file instanceof File)) return Response.json({ error: "No file received" }, { status: 400 });
  if (file.size > MAX) return Response.json({ error: "File is larger than 4 MB" }, { status: 413 });
  if (!ALLOWED.test(file.name)) return Response.json({ error: "Only PDF, Word, image or text files are allowed" }, { status: 415 });

  const supabase = await createClient();
  const { data: cand, error } = await supabase
    .from("candidates")
    .select("id, candidate_code, first_name, last_name, drive_folder_id")
    .eq("id", candidateId)
    .single();
  if (error || !cand) return Response.json({ error: "Candidate not found" }, { status: 404 });

  try {
    let folderId = cand.drive_folder_id as string | null;
    if (!folderId || !(await folderExists(folderId))) {
      folderId = await createFolder(
        `${cand.candidate_code} - ${[cand.first_name, cand.last_name].filter(Boolean).join(" ")}`,
        rootFolderId()
      );
      await supabase.from("candidates").update({ drive_folder_id: folderId }).eq("id", cand.id);
    }

    const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
    const base = file.name.slice(0, file.name.length - ext.length);
    const driveName = `${docType} - ${base}${ext}`;

    const data = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadFile({
      name: driveName,
      mimeType: file.type,
      data,
      parentId: folderId,
    });

    const { data: doc, error: insErr } = await supabase
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
      .select()
      .single();
    if (insErr) return Response.json({ error: insErr.message }, { status: 500 });
    if (docType === "Resume") await indexResumeFile(cand.id, data, file.type, file.name);

    return Response.json({ document: doc });
  } catch (e) {
    console.error("Drive upload failed", e);
    return Response.json({ error: e instanceof Error ? e.message : "Drive upload failed" }, { status: 502 });
  }
}
