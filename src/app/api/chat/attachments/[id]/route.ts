import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { streamDriveFile } from "@/lib/stream-file";

export const runtime = "nodejs";

/** Stream a chat attachment — only to people who can read that conversation (RLS on messages decides) */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile?.is_active) return new Response("Login required", { status: 401 });
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });

  // the user's own session: returns the row only if they may read the conversation
  const supabase = await createClient();
  const { data: msg } = await supabase.from("messages").select("id, deleted_at").eq("id", id).maybeSingle();
  if (!msg || msg.deleted_at) return new Response("Not found", { status: 404 });

  const { data: file } = await createAdminClient().from("chat_attachments").select("file_id, file_name, mime_type").eq("message_id", id).maybeSingle();
  if (!file) return new Response("Not found", { status: 404 });
  return streamDriveFile(req, { file_id: file.file_id, file_name: file.file_name, mime_type: file.mime_type });
}
