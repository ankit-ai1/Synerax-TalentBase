import { after } from "next/server";
import { z } from "zod";
import { apiStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { onStaffComment } from "@/lib/email/notify-events";

const schema = z.object({ body: z.string().trim().min(1, "Message is empty").max(4000) });

/** Staff: the client conversation on one shared profile */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await apiStaff();
  if ("error" in a) return a.error;
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("application_comments")
    .select("id, body, author_role, created_at, author:profiles(full_name)")
    .eq("application_id", id)
    .order("created_at");
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ comments: data ?? [] });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await apiStaff();
  if ("error" in a) return a.error;
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("application_comments")
    .insert({ application_id: id, author_id: a.profile.id, author_role: "staff", body: parsed.data.body })
    .select("id, body, author_role, created_at, author:profiles(full_name)")
    .single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  after(() => onStaffComment(id, parsed.data.body));
  return Response.json({ comment: data });
}
