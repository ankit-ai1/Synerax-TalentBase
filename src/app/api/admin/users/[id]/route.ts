import { apiAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Change role, activate/deactivate, or reset password */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await apiAdmin();
  if ("error" in a) return a.error;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const admin = createAdminClient();

  if (id === a.profile.id && (body.role === "hr" || body.is_active === false)) {
    return Response.json({ error: "You can't remove your own admin access" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (body.role === "admin" || body.role === "hr") patch.role = body.role;
  if (typeof body.is_active === "boolean") patch.is_active = body.is_active;
  if (typeof body.full_name === "string" && body.full_name.trim()) patch.full_name = body.full_name.trim();

  if (Object.keys(patch).length) {
    const { error } = await admin.from("profiles").update(patch).eq("id", id);
    if (error) return Response.json({ error: error.message }, { status: 400 });
  }

  if (typeof body.is_active === "boolean") {
    // deactivate = login block
    const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: body.is_active ? "none" : "876000h" });
    if (error) return Response.json({ error: error.message }, { status: 400 });
  }

  if (typeof body.password === "string") {
    if (body.password.length < 8) return Response.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    const { error } = await admin.auth.admin.updateUserById(id, { password: body.password });
    if (error) return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json({ ok: true });
}
