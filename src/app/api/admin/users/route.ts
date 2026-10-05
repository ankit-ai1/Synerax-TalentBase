import { apiAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Create a new Admin/HR user */
export async function POST(req: Request) {
  const a = await apiAdmin();
  if ("error" in a) return a.error;

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const full_name = String(body.full_name ?? "").trim();
  const password = String(body.password ?? "");
  const role = body.role === "admin" ? "admin" : "hr";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "Invalid email" }, { status: 400 });
  if (!full_name) return Response.json({ error: "Name is required" }, { status: 400 });
  if (password.length < 8) return Response.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role },
  });
  if (error) {
    const msg = error.message.includes("already") ? "A user with this email already exists" : error.message;
    return Response.json({ error: msg }, { status: 400 });
  }
  // the trigger creates the profile; make sure role/name are set
  await admin.from("profiles").upsert({ id: data.user.id, email, full_name, role, is_active: true });
  return Response.json({ ok: true, id: data.user.id });
}
