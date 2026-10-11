import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { findOrCreateFolder, rootFolderId, uploadFile } from "@/lib/drive";
import { rateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX = 4 * 1024 * 1024; // Vercel's request limit is ~4.5 MB
/** content type comes from the extension, never from the browser (stops HTML/script uploads rendering inline) */
const MIME: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  txt: "text/plain",
  rtf: "application/rtf",
};
const extOf = (name: string) => (name.includes(".") ? name.slice(name.lastIndexOf(".") + 1).toLowerCase() : "");

/**
 * Send a file in a chat. Works for staff, clients and candidates.
 * The permission check runs with the user's OWN session (chat_can_send); only then does the
 * server upload to Drive and attach the file. The Drive file id is stored in a server-only table.
 */
export async function POST(req: Request) {
  const profile = await getCurrentProfile();
  if (!profile?.is_active) return Response.json({ error: "Login required" }, { status: 401 });
  if (rateLimited(`chat-file:${profile.id}`, 20, 10 * 60 * 1000)) return Response.json({ error: "Too many files — please wait a few minutes." }, { status: 429 });

  const form = await req.formData();
  const file = form.get("file");
  const conversationId = String(form.get("conversation_id") ?? "");
  const body = String(form.get("body") ?? "").trim().slice(0, 5000);
  if (!(file instanceof File)) return Response.json({ error: "No file received" }, { status: 400 });
  if (file.size > MAX) return Response.json({ error: "File is larger than 4 MB" }, { status: 413 });
  const mime = MIME[extOf(file.name)];
  if (!mime) return Response.json({ error: "Only PDF, Word, Excel, image or text files are allowed" }, { status: 415 });
  if (!/^[0-9a-f-]{36}$/i.test(conversationId)) return Response.json({ error: "Conversation not found" }, { status: 404 });

  const supabase = await createClient();
  const { data: allowed, error: permErr } = await supabase.rpc("chat_can_send", { p_conversation: conversationId });
  if (permErr || allowed !== true) return Response.json({ error: "Not allowed" }, { status: 403 });

  try {
    const folder = await findOrCreateFolder("Chat attachments", rootFolderId());
    const uploaded = await uploadFile({
      name: `${new Date().toISOString().slice(0, 10)} - ${file.name}`,
      mimeType: mime,
      data: Buffer.from(await file.arrayBuffer()),
      parentId: folder,
    });

    const admin = createAdminClient();
    const { data: msg, error } = await admin
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: profile.id,
        sender_role: profile.role,
        body,
        kind: "text",
        attachment: { name: file.name, size: file.size, mime },
      })
      .select("id")
      .single();
    if (error || !msg) throw new Error(error?.message ?? "Could not save the message");
    const { error: attErr } = await admin
      .from("chat_attachments")
      .insert({ message_id: msg.id, file_id: uploaded.id!, file_name: file.name, mime_type: mime, size_bytes: file.size });
    if (attErr) throw new Error(attErr.message);
    return Response.json({ id: msg.id });
  } catch (e) {
    console.error("chat attachment failed", e instanceof Error ? e.message : e);
    return Response.json({ error: "Couldn't upload the file right now. Please try again." }, { status: 502 });
  }
}
