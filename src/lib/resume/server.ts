import "server-only";
import type { Readable } from "node:stream";
import { createAdminClient } from "@/lib/supabase/server";
import { downloadFile } from "@/lib/drive";
import { resumePlainText } from "./index";
import type { SkillDef } from "./types";

/** Skills master (+ aliases) for matching — cached per server instance for 10 minutes */
let cache: { at: number; defs: SkillDef[] } | null = null;
export async function getSkillDefs(): Promise<SkillDef[]> {
  if (cache && Date.now() - cache.at < 10 * 60 * 1000) return cache.defs;
  const { data } = await createAdminClient().from("skills").select("name, aliases").limit(5000);
  const defs = (data ?? []).map((s) => ({ name: s.name as string, aliases: (s.aliases as string[]) ?? [] }));
  cache = { at: Date.now(), defs };
  return defs;
}

async function streamToBuffer(s: Readable) {
  const chunks: Buffer[] = [];
  for await (const c of s) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  return Buffer.concat(chunks);
}

/** The candidate's current CV (latest non-archived Resume document) from Drive */
export async function loadCurrentCv(candidateId: string): Promise<{ buf: Buffer; mime: string; name: string } | null> {
  const { data: doc } = await createAdminClient()
    .from("candidate_documents")
    .select("drive_file_id, file_name, mime_type")
    .eq("candidate_id", candidateId)
    .eq("doc_type", "Resume")
    .eq("is_archived", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!doc?.drive_file_id) return null;
  const buf = await streamToBuffer(await downloadFile(doc.drive_file_id));
  return { buf, mime: doc.mime_type ?? "", name: doc.file_name ?? "" };
}

/** Store the CV's plain text (for searching inside CVs) and refresh the search index. Never throws. */
export async function saveResumeText(candidateId: string, text: string) {
  try {
    const admin = createAdminClient();
    await admin.from("candidates").update({ resume_text: text || null }).eq("id", candidateId);
    await admin.rpc("refresh_candidate_search", { p_id: candidateId });
  } catch (e) {
    console.error("saveResumeText failed for", candidateId, e instanceof Error ? e.message : "");
  }
}

/** Extract + store text from an uploaded CV file (used after uploads) */
export async function indexResumeFile(candidateId: string, buf: Buffer, mime: string, fileName: string) {
  if (!/\.(pdf|docx)$/i.test(fileName) && !/pdf|wordprocessingml/i.test(mime)) return;
  const text = await resumePlainText(buf, mime, fileName).catch(() => "");
  if (text) await saveResumeText(candidateId, text);
}
