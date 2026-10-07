import { apiStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { streamDriveFile } from "@/lib/stream-file";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Staff: view the JD file a client attached to a job */
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
