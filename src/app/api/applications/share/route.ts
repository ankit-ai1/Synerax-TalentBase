import { after } from "next/server";
import { z } from "zod";
import { apiStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { onProfilesShared } from "@/lib/email/notify-events";

const schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  cv_doc: z.string().uuid().nullable().optional(),
  note: z.string().trim().max(2000).nullable().optional(),
  unshare: z.boolean().optional(),
});

/** Staff: share pipeline profiles with the job's client (or take them back) */
export async function POST(req: Request) {
  const a = await apiStaff();
  if ("error" in a) return a.error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { ids, cv_doc, note, unshare } = parsed.data;
  const supabase = await createClient();

  if (unshare) {
    const { data, error } = await supabase.rpc("unshare_from_client", { p_application_ids: ids });
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ count: data ?? 0 });
  }

  // which of these were not shared before → only those trigger "new profile" emails
  const { data: before } = await supabase.from("applications").select("id, shared_with_client").in("id", ids);
  const fresh = (before ?? []).filter((r) => !r.shared_with_client).map((r) => r.id);

  const { data, error } = await supabase.rpc("share_with_client", {
    p_application_ids: ids,
    p_cv_doc: ids.length === 1 ? (cv_doc ?? null) : null,
    p_note: note || null,
  });
  if (error) return Response.json({ error: error.message }, { status: 400 });

  if (fresh.length) after(() => onProfilesShared(fresh));
  return Response.json({ count: data ?? 0 });
}
