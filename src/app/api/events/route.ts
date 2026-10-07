import { after } from "next/server";
import { z } from "zod";
import { apiStaff } from "@/lib/auth";
import { onInterviewSaved, onStageChanged } from "@/lib/email/notify-events";

const schema = z.object({ type: z.enum(["stage", "interview"]), id: z.string().uuid() });

/**
 * Staff UI pings this after changing a stage or saving an interview.
 * Handlers re-read the database and deduplicate, so repeated pings never send twice.
 */
export async function POST(req: Request) {
  const a = await apiStaff();
  if ("error" in a) return a.error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { type, id } = parsed.data;
  after(async () => {
    if (type === "interview") await onInterviewSaved(id);
    else await onStageChanged(id);
  });
  return Response.json({ ok: true });
}
