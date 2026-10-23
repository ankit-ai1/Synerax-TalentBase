import { apiStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { streamDriveFile } from "@/lib/stream-file";
import { findOrCreateFolder, rootFolderId, uploadFile } from "@/lib/drive";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX = 5 * 1024 * 1024;
const ALLOWED = /\.(pdf|docx?|txt|rtf)$/i;

/** Staff: view / download the JD file attached to a job (client upload or staff upload) */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await apiStaff();
  if ("error" in a) return a.error;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const supabase = await createClient();
  const { data } = await supabase.from("jobs").select("jd_file_id, jd_file_name").eq("id", id).maybeSingle();
  if (!data?.jd_file_id) return new Response("Not found", { status: 404 });
  return streamDriveFile(req, { file_id: data.jd_file_id, file_name: data.jd_file_name ?? "JD" });
}

/** Staff: attach the original JD file to a job (stored in Google Drive, "_Staff JDs" folder) */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await apiStaff();
  if ("error" in a) return a.error;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Not found" }, { status: 404 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file received" }, { status: 400 });
  if (file.size > MAX) return Response.json({ error: "JD must be 5 MB or smaller" }, { status: 413 });
  if (!ALLOWED.test(file.name)) return Response.json({ error: "JD must be a PDF, Word or text file" }, { status: 415 });
  const supabase = await createClient();
  const { data: job } = await supabase.from("jobs").select("id, job_code, title").eq("id", id).maybeSingle();
  if (!job) return Response.json({ error: "Job not found" }, { status: 404 });
  try {
    const folder = await findOrCreateFolder("_Staff JDs", rootFolderId());
    const up = await uploadFile({ name: `${job.job_code} - ${file.name}`, mimeType: file.type, data: Buffer.from(await file.arrayBuffer()), parentId: folder });
    const { error } = await supabase.from("jobs").update({ jd_file_id: up.id, jd_file_name: file.name }).eq("id", id);
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ ok: true, file_name: file.name });
  } catch (e) {
    console.error("JD upload failed", e);
    return Response.json({ error: "Upload failed. Please try again." }, { status: 502 });
  }
}
