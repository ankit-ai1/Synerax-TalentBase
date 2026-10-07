import { Readable } from "node:stream";
import { apiRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { downloadFile } from "@/lib/drive";
import { getMyCandidate } from "@/lib/portal";

export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

async function ownDoc(userId: string, id: string) {
  const admin = createAdminClient();
  const cand = await getMyCandidate(admin, userId);
  if (!cand || !/^[0-9a-f-]{36}$/i.test(id)) return { admin, doc: null };
  const { data: doc } = await admin
    .from("candidate_documents")
    .select("id, doc_type, file_name, mime_type, drive_file_id, is_archived")
    .eq("id", id)
    .eq("candidate_id", cand.id)
    .maybeSingle();
  return { admin, doc };
}

/** View / download one of the candidate's own documents */
export async function GET(req: Request, { params }: Ctx) {
  const a = await apiRole("candidate");
  if ("error" in a) return a.error;
  const { id } = await params;
  const { doc } = await ownDoc(a.profile.id, id);
  if (!doc || doc.is_archived) return new Response("Not found", { status: 404 });
  try {
    const stream = await downloadFile(doc.drive_file_id);
    const download = new URL(req.url).searchParams.has("download");
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "content-type": doc.mime_type || "application/octet-stream",
        "content-disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(doc.file_name)}`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new Response("File unavailable", { status: 502 });
  }
}

/** Remove (archive) a document. The current CV can only be replaced, not removed. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const a = await apiRole("candidate");
  if ("error" in a) return a.error;
  const { id } = await params;
  const { admin, doc } = await ownDoc(a.profile.id, id);
  if (!doc || doc.is_archived) return Response.json({ error: "Not found" }, { status: 404 });
  if (doc.doc_type === "Resume") return Response.json({ error: "Upload a new CV to replace this one" }, { status: 400 });
  await admin.from("candidate_documents").update({ is_archived: true }).eq("id", doc.id);
  return Response.json({ ok: true });
}
