import "server-only";
import { ImapFlow } from "imapflow";
import { createAdminClient } from "@/lib/supabase/server";
import { normMessageId, parseBounce, type Bounce } from "./bounce-parse";

// values pasted into Vercel often carry spaces (app passwords are shown as "abcd efgh …")
const env = (k: string) => (process.env[k] ?? "").trim();
export const imapConfigured = () => !!(env("IMAP_HOST") && env("IMAP_USER") && env("IMAP_PASS"));

/** match one parsed bounce to a sent email: by the original Message-ID, else the latest email to that address (7 days) */
export async function applyBounce(b: Bounce) {
  const admin = createAdminClient();
  let id: string | null = null;
  const mid = normMessageId(b.messageId);
  if (mid) {
    const { data } = await admin.from("emails").select("id").in("provider_message_id", [`<${mid}>`, mid]).limit(1).maybeSingle();
    id = data?.id ?? null;
  }
  if (!id && b.recipient) {
    const { data } = await admin
      .from("emails")
      .select("id")
      .ilike("to_email", b.recipient)
      .eq("status", "sent")
      .gte("sent_at", new Date(Date.now() - 7 * 86400_000).toISOString())
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    id = data?.id ?? null;
  }
  if (!id) return null;
  if (b.permanent) {
    await admin.from("emails").update({ status: "bounced", bounced_at: new Date().toISOString(), bounce_reason: b.reason }).eq("id", id).in("status", ["sent", "bounced"]);
  }
  await admin.rpc("email_record_bounce", { p_email: id, p_permanent: b.permanent, p_reason: b.reason });
  return id;
}

/**
 * Reads new "Delivery Status Notification / Mail Delivery Subsystem / Undeliverable" messages from the sender's
 * mailbox (IMAP_HOST / IMAP_USER / IMAP_PASS — for Gmail: imap.gmail.com + the same app password) and marks
 * the matching emails as bounced. Remembers the last UID it read (email_quota.imap_last_uid).
 */
export async function checkBounces(max = 50) {
  if (!imapConfigured()) return { skipped: "IMAP is not configured" };
  const admin = createAdminClient();
  const { data: q } = await admin.from("email_quota").select("imap_last_uid").eq("id", 1).maybeSingle();
  const client = new ImapFlow({
    host: env("IMAP_HOST"),
    port: Number(env("IMAP_PORT") || 993),
    secure: Number(env("IMAP_PORT") || 993) === 993,
    auth: { user: env("IMAP_USER"), pass: env("IMAP_PASS").replace(/\s+/g, "") },
    logger: false,
  });
  let read = 0;
  let matched = 0;
  let lastUid = Number(q?.imap_last_uid ?? 0);
  await client.connect();
  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const since = new Date(Date.now() - 7 * 86400_000);
      const uids = (await client.search(
        {
          since,
          or: [{ from: "mailer-daemon" }, { from: "postmaster" }, { subject: "Delivery Status Notification" }, { subject: "Undeliverable" }, { subject: "Mail delivery failed" }, { subject: "Returned mail" }],
        },
        { uid: true }
      )) || [];
      const fresh = uids.filter((u) => u > lastUid).sort((a, b) => a - b).slice(0, max);
      for (const uid of fresh) {
        const msg = await client.fetchOne(String(uid), { source: true }, { uid: true });
        read++;
        lastUid = Math.max(lastUid, uid);
        const b = msg && msg.source ? parseBounce(msg.source.toString("utf8")) : null;
        if (b && (await applyBounce(b))) matched++;
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
  if (lastUid !== Number(q?.imap_last_uid ?? 0)) await admin.from("email_quota").update({ imap_last_uid: lastUid }).eq("id", 1);
  return { read, matched };
}
