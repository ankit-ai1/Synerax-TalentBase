import { createAdminClient } from "@/lib/supabase/server";
import { getEmailSettings, sendEmail } from "@/lib/email/send";
import type { EmailEventKey } from "@/lib/email/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Target = {
  conversation_id: string;
  type: "candidate" | "client";
  side: "staff" | "member";
  user_id: string;
  email: string;
  full_name: string | null;
  from_label: string;
  link: string;
};

/**
 * "You have a new message" e-mails. Called every 5 minutes by Supabase pg_cron (see supabase/migrations/005b_chat_cron.sql).
 * A message must stay unread for 10+ minutes; at most one e-mail per conversation per hour per person.
 * E-mails never contain the message text — so no candidate contact details can ever reach a client by e-mail.
 * Protected by CRON_SECRET.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("chat_email_targets");
  if (error) {
    console.error("chat_email_targets", error.message);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
  const targets = (data ?? []) as Target[];
  const settings = await getEmailSettings();
  let sent = 0;
  for (const t of targets.slice(0, 100)) {
    const event: EmailEventKey = t.side === "staff" ? "chat_unread_staff" : t.type === "client" ? "chat_unread_client" : "chat_unread_candidate";
    const first = (t.full_name ?? "").split(" ")[0] || "there";
    const fromSynerax = t.side === "member";
    const res = await sendEmail({
      to: t.email,
      event,
      settings,
      subject: fromSynerax ? "You have a new message from Synerax" : `New message from ${t.from_label}`,
      content: {
        preheader: fromSynerax ? "Your Synerax team sent you a message." : `${t.from_label} is waiting for a reply.`,
        heading: fromSynerax ? "You have a new message from Synerax" : `New message from ${t.from_label}`,
        body: [
          `Hi ${first},`,
          fromSynerax
            ? "Your Synerax team sent you a message. Sign in to read it and reply."
            : `${t.from_label} sent a message that hasn't been read yet. Open the inbox to reply.`,
        ],
        cta: { label: "Open messages", url: t.link },
        note: "You get at most one e-mail per conversation per hour.",
      },
      related: { user_id: t.user_id },
    });
    // mark even when skipped (e.g. turned off) so we don't re-check the same pair every 5 minutes
    await admin.rpc("chat_mark_emailed", { p_conversation: t.conversation_id, p_user: t.user_id });
    if (res.status === "sent" || res.status === "queued") sent++;
  }
  return Response.json({ ok: true, candidates: targets.length, sent });
}
