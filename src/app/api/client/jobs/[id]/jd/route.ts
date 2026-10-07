import { apiRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { streamDriveFile } from "@/lib/stream-file";

export const runtime = "nodejs";
export const maxDuration = 60;

/** The JD file a client attached to their own job */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await apiRole("client");
  if ("error" in a) return a.error;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("client_jd_file", { p_job: id });
  if (error || !data) return new Response("Not found", { status: 404 });
  return streamDriveFile(req, data as { file_id: string; file_name: string });
}
