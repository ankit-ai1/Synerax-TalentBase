import { apiStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { findOrCreateFolder, rootFolderId, uploadFile } from "@/lib/drive";

export const runtime = "nodejs";

const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const MAX = 5 * 1024 * 1024;

/** Staff: upload a blog image to Google Drive ("Blog images" folder); returns its public URL /api/blog/img/<id> */
export async function POST(req: Request) {
  const a = await apiStaff();
  if ("error" in a) return a.error;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file" }, { status: 400 });
  if (!TYPES.includes(file.type)) return Response.json({ error: "Use a JPG, PNG, WebP, GIF or AVIF image" }, { status: 400 });
  if (file.size > MAX) return Response.json({ error: "Images must be 5 MB or smaller" }, { status: 400 });
  const alt = String(form?.get("alt") ?? "").slice(0, 200) || null;
  try {
    const folder = await findOrCreateFolder("Blog images", rootFolderId());
    const name = `${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_").slice(-80)}`;
    const up = await uploadFile({ name, mimeType: file.type, data: Buffer.from(await file.arrayBuffer()), parentId: folder });
    const { data, error } = await createAdminClient().from("blog_images").insert({ file_id: up.id, file_name: name, mime_type: file.type, alt, created_by: a.profile.id }).select("id").single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ id: data.id, url: `/api/blog/img/${data.id}` });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 502 });
  }
}
