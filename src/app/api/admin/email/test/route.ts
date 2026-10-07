import { z } from "zod";
import { apiAdmin } from "@/lib/auth";
import { sendEmail, smtpConfigured } from "@/lib/email/send";

const schema = z.object({ to: z.string().trim().email("Enter a valid email") });

/** Admin: send a test email through the configured SMTP server */
export async function POST(req: Request) {
  const a = await apiAdmin();
  if ("error" in a) return a.error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  if (!smtpConfigured()) return Response.json({ error: "SMTP is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS to the environment." }, { status: 400 });

  const r = await sendEmail({
    to: parsed.data.to,
    event: "test",
    force: true,
    subject: "Test email from Synerax TalentBase",
    related: { user_id: a.profile.id },
    content: {
      heading: "Email is working 🎉",
      body: [`This test was sent by ${a.profile.full_name} from Admin → Email settings.`, "If you can read this, automated emails to clients and candidates will be delivered."],
      cta: { label: "Open TalentBase", url: "/dashboard" },
    },
  });
  if (r.status !== "sent") return Response.json({ error: r.error ?? "Could not send" }, { status: 502 });
  return Response.json({ ok: true });
}
