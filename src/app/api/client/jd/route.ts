import { apiRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { findOrCreateFolder, rootFolderId, uploadFile } from "@/lib/drive";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX = 4 * 1024 * 1024;
const ALLOWED = /\.(pdf|docx?|txt|rtf)$/i;

/** Client uploads a JD file; returns the Drive id to attach via client_save_job */
export async function POST(req: Request) {
  const a = await apiRole("client");
  if ("error" in a) return a.error;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file received" }, { status: 400 });
  if (file.size > MAX) return Response.json({ error: "JD must be 4 MB or smaller" }, { status: 413 });
  if (!ALLOWED.test(file.name)) return Response.json({ error: "JD must be a PDF, Word or text file" }, { status: 415 });

  const admin = createAdminClient();
  const { data: cu } = await admin.from("client_users").select("client_id, clients(name, client_code)").eq("user_id", a.profile.id).eq("is_active", true).maybeSingle();
  if (!cu) return Response.json({ error: "Your login isn't linked to a company" }, { status: 403 });
  const client = (Array.isArray(cu.clients) ? cu.clients[0] : cu.clients) as { name: string; client_code: string } | null;

  try {
    const jdRoot = await findOrCreateFolder("_Client JDs", rootFolderId());
    const folder = await findOrCreateFolder(`${client?.client_code ?? "Client"} - ${client?.name ?? ""}`, jdRoot);
    const uploaded = await uploadFile({ name: `JD - ${file.name}`, mimeType: file.type, data: Buffer.from(await file.arrayBuffer()), parentId: folder });
    return Response.json({ file_id: uploaded.id, file_name: file.name });
  } catch (e) {
    console.error("JD upload failed", e);
    return Response.json({ error: "Upload failed. Please try again." }, { status: 502 });
  }
}
