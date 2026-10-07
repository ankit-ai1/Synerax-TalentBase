import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { createFolder, folderExists, rootFolderId } from "@/lib/drive";

type Admin = ReturnType<typeof createAdminClient>;

/** The signed-in candidate's own row (server-side, service role — callers must already have checked the role) */
export async function getMyCandidate(admin: Admin, userId: string) {
  const { data } = await admin
    .from("candidates")
    .select("id, candidate_code, first_name, last_name, email, drive_folder_id")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

/** Make sure the candidate has a Drive folder; returns its id */
export async function ensureCandidateFolder(
  admin: Admin,
  cand: { id: string; candidate_code: string; first_name: string; last_name: string | null; drive_folder_id: string | null }
) {
  let folderId = cand.drive_folder_id;
  if (!folderId || !(await folderExists(folderId))) {
    folderId = await createFolder(`${cand.candidate_code} - ${[cand.first_name, cand.last_name].filter(Boolean).join(" ")}`, rootFolderId());
    await admin.from("candidates").update({ drive_folder_id: folderId }).eq("id", cand.id);
  }
  return folderId;
}

/** Document types a candidate can upload themselves */
export const CANDIDATE_DOC_TYPES = ["Resume", "Photo", "Education Certificate", "Experience Letter", "Other"] as const;
