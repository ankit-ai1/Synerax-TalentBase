import { apiAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { trashFile } from "@/lib/drive";

export const runtime = "nodejs";

/** Permanently delete a candidate (admin only) — the Drive folder is trashed too */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await apiAdmin();
  if ("error" in a) return a.error;
  const { id } = await params;
  const supabase = await createClient();

  const { data: cand } = await supabase.from("candidates").select("id, drive_folder_id").eq("id", id).single();
  if (!cand) return Response.json({ error: "Candidate not found" }, { status: 404 });

  const { error } = await supabase.from("candidates").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 400 });

  if (cand.drive_folder_id) {
    try {
      await trashFile(cand.drive_folder_id);
    } catch (e) {
      console.warn("Drive folder trash failed", e);
    }
  }
  return Response.json({ ok: true });
}
