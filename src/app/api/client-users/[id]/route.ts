import { apiStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { tempPassword } from "@/lib/passwords";
import { after } from "next/server";
import { onClientLogin } from "@/lib/email/notify-events";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** Staff: activate/deactivate a client login, reset its password, or edit name/phone/designation */
export async function PATCH(req: Request, { params }: Ctx) {
  const a = await apiStaff();
  if ("error" in a) return a.error;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const admin = createAdminClient();

  const { data: cu } = await admin.from("client_users").select("id, user_id").eq("id", id).maybeSingle();
  if (!cu) return Response.json({ error: "Login not found" }, { status: 404 });

  const edits: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) edits.name = body.name.trim().slice(0, 120);
  if (typeof body.phone === "string") edits.phone = body.phone.trim().slice(0, 20) || null;
  if (typeof body.designation === "string") edits.designation = body.designation.trim().slice(0, 120) || null;
  if (typeof body.is_active === "boolean") edits.is_active = body.is_active;
  if (Object.keys(edits).length) {
    const { error } = await admin.from("client_users").update(edits).eq("id", id);
    if (error) return Response.json({ error: error.message }, { status: 400 });
  }
  if (typeof body.name === "string" && body.name.trim()) await admin.from("profiles").update({ full_name: body.name.trim() }).eq("id", cu.user_id);

  if (typeof body.is_active === "boolean") {
    await admin.from("profiles").update({ is_active: body.is_active }).eq("id", cu.user_id);
    const { error } = await admin.auth.admin.updateUserById(cu.user_id, { ban_duration: body.is_active ? "none" : "876000h" });
    if (error) return Response.json({ error: error.message }, { status: 400 });
  }

  if (body.reset_password === true) {
    const password = tempPassword();
    const { error } = await admin.auth.admin.updateUserById(cu.user_id, { password });
    if (error) return Response.json({ error: error.message }, { status: 400 });
    const { data: au } = await admin.auth.admin.getUserById(cu.user_id);
    if (au.user?.email) {
      const { data: row } = await admin.from("client_users").select("name").eq("id", id).maybeSingle();
      after(() => onClientLogin(cu.user_id, au.user!.email!, row?.name ?? "there", password, true));
    }
    return Response.json({ ok: true, password });
  }
  return Response.json({ ok: true });
}
