import { after } from "next/server";
import { z } from "zod";
import { apiStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { onJobPublished } from "@/lib/email/notify-events";

const schema = z.object({
  publish: z.boolean(),
  public_description: z.string().trim().max(8000).nullable().optional(),
  interview_process: z.string().trim().max(2000).nullable().optional(),
  show_client_name: z.boolean().optional(),
  assignees: z.array(z.string().uuid()).max(30).optional(),
});

/** Staff: save the careers-page fields and publish / unpublish a job */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await apiStaff();
  if ("error" in a) return a.error;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Not found" }, { status: 404 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const b = parsed.data;

  const supabase = await createClient();
  const { data: job } = await supabase.from("jobs").select("id, status, published, published_at").eq("id", id).maybeSingle();
  if (!job) return Response.json({ error: "Job not found" }, { status: 404 });

  const firstPublish = b.publish && !job.published;
  const patch: Record<string, unknown> = { published: b.publish };
  if (b.public_description !== undefined) patch.public_description = b.public_description || null;
  if (b.interview_process !== undefined) patch.interview_process = b.interview_process || null;
  if (b.show_client_name !== undefined) patch.show_client_name = b.show_client_name;
  if (b.publish) {
    if (!job.published_at) patch.published_at = new Date().toISOString();
    // a client-posted job goes live as Open once reviewed
    if (job.status === "Pending review" || job.status === "Draft") patch.status = "Open";
  }

  const { error } = await supabase.from("jobs").update(patch).eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 400 });

  if (b.assignees) {
    await supabase.from("job_assignees").delete().eq("job_id", id);
    if (b.assignees.length) {
      const { error: aErr } = await supabase.from("job_assignees").insert(b.assignees.map((user_id) => ({ job_id: id, user_id })));
      if (aErr) return Response.json({ error: aErr.message }, { status: 400 });
    }
  }

  if (firstPublish) after(() => onJobPublished(id));
  return Response.json({ ok: true, status: patch.status ?? job.status, published: b.publish });
}
