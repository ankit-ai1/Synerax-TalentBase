import { z } from "zod";
import { apiStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { tempPassword } from "@/lib/passwords";
import { after } from "next/server";
import { onClientLogin } from "@/lib/email/notify-events";

export const runtime = "nodejs";

const schema = z.object({
  client_id: z.string().uuid(),
  name: z.string().trim().min(2, "Name is required").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: z.string().trim().max(20).optional().default(""),
  designation: z.string().trim().max(120).optional().default(""),
});

/** Staff (admin/HR) create a client-portal login for one of their clients */
export async function POST(req: Request) {
  const a = await apiStaff();
  if ("error" in a) return a.error;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Please check the form" }, { status: 400 });
  const { client_id, name, email, phone, designation } = parsed.data;

  const admin = createAdminClient();
  const { data: client } = await admin.from("clients").select("id, name").eq("id", client_id).maybeSingle();
  if (!client) return Response.json({ error: "Client not found" }, { status: 404 });

  const password = tempPassword();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } });
  if (error || !data.user) {
    const msg = error?.message.includes("already") ? "A user with this email already exists" : error?.message ?? "Could not create the login";
    return Response.json({ error: msg }, { status: 400 });
  }
  const userId = data.user.id;

  // The sign-up trigger always creates a 'candidate' profile — set the real role server-side
  const { error: pErr } = await admin.from("profiles").upsert({ id: userId, email, full_name: name, role: "client", is_active: true });
  const { data: cu, error: cuErr } = pErr
    ? { data: null, error: pErr }
    : await admin
        .from("client_users")
        .insert({ client_id, user_id: userId, name, phone: phone || null, designation: designation || null, created_by: a.profile.id })
        .select("id")
        .single();
  if (cuErr || !cu) {
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    return Response.json({ error: cuErr?.message ?? "Could not link the login to the client" }, { status: 500 });
  }

  after(() => onClientLogin(userId, email, name, password, false));
  return Response.json({ ok: true, id: cu.id, email, password });
}
