import { Readable } from "node:stream";
import { apiAdmin, apiStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { downloadFile, trashFile } from "@/lib/drive";

export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

/** Stream the file through the app — the Drive link is not public */
export async function GET(req: Request, { params }: Ctx) {
  const a = await apiStaff();
  if ("error" in a) return a.error;
  const { id } = await params;

  const supabase = await createClient();
  const { data: doc } = await supabase.from("candidate_documents").select("*").eq("id", id).single();
  if (!doc) return new Response("Document not found", { status: 404 });

  try {
    const stream = await downloadFile(doc.drive_file_id);
    const download = new URL(req.url).searchParams.has("download");
    const encoded = encodeURIComponent(doc.file_name);
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "content-type": doc.mime_type || "application/octet-stream",
        "content-disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encoded}`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (e) {
    console.error("Drive download failed", e);
    return new Response("File not found in Google Drive. It may have been deleted there.", { status: 502 });
  }
}

/** Archive / restore — HR can do this too */
export async function PATCH(req: Request, { params }: Ctx) {
  const a = await apiStaff();
  if ("error" in a) return a.error;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const supabase = await createClient();
  const { error } = await supabase
    .from("candidate_documents")
    .update({ is_archived: Boolean(body.is_archived) })
    .eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}

/** Permanent delete — admin only; moved to trash in Drive */
export async function DELETE(_req: Request, { params }: Ctx) {
  const a = await apiAdmin();
  if ("error" in a) return a.error;
  const { id } = await params;
  const supabase = await createClient();
  const { data: doc } = await supabase.from("candidate_documents").select("id, drive_file_id").eq("id", id).single();
  if (!doc) return Response.json({ error: "Document not found" }, { status: 404 });

  try {
    await trashFile(doc.drive_file_id);
  } catch (e) {
    console.warn("Drive trash failed (continuing)", e);
  }
  const { error } = await supabase.from("candidate_documents").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}
