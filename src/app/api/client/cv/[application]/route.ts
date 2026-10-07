import { apiRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { streamDriveFile } from "@/lib/stream-file";

export const runtime = "nodejs";
export const maxDuration = 60;

/** The client-ready CV of a profile shared with the caller's company (checked by client_cv_file) */
export async function GET(req: Request, { params }: { params: Promise<{ application: string }> }) {
  const a = await apiRole("client");
  if ("error" in a) return a.error;
  const { application } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(application)) return new Response("Not found", { status: 404 });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("client_cv_file", { p_application: application });
  if (error || !data) return new Response("Not found", { status: 404 });
  return streamDriveFile(req, data as { file_id: string; file_name: string; mime_type: string | null });
}
