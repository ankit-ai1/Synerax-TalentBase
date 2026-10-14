/**
 * Reads a raw bounce message (RFC 3464 DSN from Gmail's "Mail Delivery Subsystem", Outlook "Undeliverable", Postfix …)
 * and pulls out what we need to match it to a sent email. Pure — unit-tested.
 */
export type Bounce = { recipient: string | null; messageId: string | null; reason: string; permanent: boolean };

const BOUNCE_HINT = /^(from|subject):.*(mailer-daemon|postmaster|mail delivery (subsystem|system|failed)|delivery status notification|undeliver|returned mail|failure notice|delivery (has )?failed|delivery failure|could not be delivered)/im;

export const normMessageId = (id: string | null | undefined) => (id ?? "").trim().replace(/^<|>$/g, "").toLowerCase() || null;

export function parseBounce(raw: string): Bounce | null {
  const text = raw.replace(/\r\n/g, "\n");
  const split = text.indexOf("\n\n");
  const head = split > 0 ? text.slice(0, split) : text;
  const body = split > 0 ? text.slice(split + 2) : "";
  if (!BOUNCE_HINT.test(head)) return null;
  // "Delivery Status Notification (Delay)" / "Action: delayed" → not a bounce yet
  if (/^subject:.*\(delay\)/im.test(head) || /^action:\s*delayed/im.test(body)) return null;

  const recipient =
    body.match(/^final-recipient:\s*rfc822;\s*<?([^\s<>;]+@[^\s<>;]+)>?/im)?.[1] ??
    body.match(/^original-recipient:\s*rfc822;\s*<?([^\s<>;]+@[^\s<>;]+)>?/im)?.[1] ??
    head.match(/^x-failed-recipients:\s*<?([^\s<>,]+@[^\s<>,]+)/im)?.[1] ??
    body.match(/(?:wasn't|was not|couldn't be|could not be) delivered to\s*<?([^\s<>]+@[^\s<>.]+\.[^\s<>]*[a-z])/i)?.[1] ??
    body.match(/delivery to the following recipients? failed[^\n]*\n+\s*<?([^\s<>]+@[^\s<>]+)>?/i)?.[1] ??
    null;

  // the ORIGINAL message's id lives in the returned headers inside the body (the bounce's own id is in `head`)
  const messageId =
    body.match(/^message-id:\s*(<[^>\n]+>)/im)?.[1] ??
    head.match(/^(?:x-original-message-id|in-reply-to):\s*(<[^>\n]+>)/im)?.[1] ??
    head.match(/^references:\s*(<[^>\n]+>)/im)?.[1] ??
    null;

  const diag = body.match(/^diagnostic-code:\s*(?:smtp;\s*)?([^\n]+(?:\n[ \t]+[^\n]+)*)/im)?.[1]?.replace(/\s+/g, " ").trim();
  const status = body.match(/^status:\s*([245]\.\d{1,3}\.\d{1,3})/im)?.[1];
  const human = body.match(/^(?!.*https?:).*(?:does not exist|doesn't exist|not found|no such user|mailbox (?:is )?(?:full|unavailable)|couldn't be found|could not be found|user unknown|rejected)[^\n]*/im)?.[0]?.trim();
  const reason = (diag || [status, human].filter(Boolean).join(" ") || "Delivery failed").slice(0, 500);
  const permanent = status ? status.startsWith("5") : !/mailbox (is )?full|try again|temporar/i.test(reason);

  return { recipient: recipient?.toLowerCase() ?? null, messageId, reason, permanent };
}
