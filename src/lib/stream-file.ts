import "server-only";
import { Readable } from "node:stream";
import { downloadFile } from "@/lib/drive";

/** Stream a Drive file through the app (Drive links are never public) */
export async function streamDriveFile(req: Request, file: { file_id: string; file_name: string; mime_type?: string | null }) {
  try {
    const stream = await downloadFile(file.file_id);
    const download = new URL(req.url).searchParams.has("download");
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "content-type": file.mime_type || "application/octet-stream",
        "content-disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(file.file_name)}`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new Response("File unavailable", { status: 502 });
  }
}
