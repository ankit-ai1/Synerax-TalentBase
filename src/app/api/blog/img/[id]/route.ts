import { Readable } from "node:stream";
import { createAdminClient } from "@/lib/supabase/server";
import { downloadFile } from "@/lib/drive";

export const runtime = "nodejs";

/** Public: a blog image (uploaded from the editor). Immutable → cached by browsers and the CDN for a year. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const { data } = await createAdminClient().from("blog_images").select("file_id, mime_type").eq("id", id).maybeSingle();
  if (!data) return new Response("Not found", { status: 404 });
  try {
    const stream = await downloadFile(data.file_id);
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: { "content-type": data.mime_type, "cache-control": "public, max-age=31536000, s-maxage=31536000, immutable", "x-content-type-options": "nosniff" },
    });
  } catch {
    return new Response("Image unavailable", { status: 502 });
  }
}
