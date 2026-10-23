import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Open / click tracking.
 *   open:  <img src="/api/e/o/<token>">  (approximate — many mail apps block or pre-load images)
 *   click: /api/e/c/<token>?u=<url>&s=<hmac(token|url)> — only URLs we signed are redirected (no open redirect)
 */

const secret = () => process.env.EMAIL_LINK_SECRET || process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dev-only-secret";

export const newTrackToken = () => randomBytes(16).toString("hex");

export function signLink(token: string, url: string, key = secret()) {
  return createHmac("sha256", key).update(`${token}|${url}`).digest("base64url").slice(0, 32);
}

export function verifyLink(token: string, url: string, sig: string, key = secret()) {
  const want = Buffer.from(signLink(token, url, key));
  const got = Buffer.from(sig ?? "");
  return want.length === got.length && timingSafeEqual(want, got) && /^https?:\/\//i.test(url);
}

export function clickUrl(base: string, token: string, url: string, key = secret()) {
  return `${base}/api/e/c/${token}?u=${encodeURIComponent(url)}&s=${signLink(token, url, key)}`;
}

/** signed "unsubscribe" link for one address (opt-out → suppression list) */
export const unsubscribeSig = (email: string, key = secret()) => signLink("unsubscribe", email.toLowerCase(), key);
export function verifyUnsubscribe(email: string, sig: string, key = secret()) {
  const want = Buffer.from(unsubscribeSig(email, key));
  const got = Buffer.from(sig ?? "");
  return want.length === got.length && timingSafeEqual(want, got);
}
export const unsubscribeUrl = (base: string, email: string) => `${base}/e/unsubscribe?e=${encodeURIComponent(email.toLowerCase())}&s=${unsubscribeSig(email)}`;

/** small "Unsubscribe" line at the end of the email (not tracked as a click) */
export function addUnsubscribe(html: string, url: string) {
  const line = `<p style="margin:18px 0 0;text-align:center;font:400 11.5px/1.5 Arial,sans-serif;color:#A39370">Don't want these emails? <a data-no-track href="${url.replace(/&/g, "&amp;")}" style="color:#A39370;text-decoration:underline">Unsubscribe</a></p>`;
  return /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${line}</body>`) : html + line;
}

/** rewrite every http(s) link in the HTML to the click tracker and add the open pixel */
export function addTracking(html: string, base: string, token: string, key = secret()) {
  const unesc = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const rewritten = html.replace(/(data-no-track )?href="(https?:\/\/[^"]+)"/gi, (m, skip: string | undefined, raw: string) => (skip ? m : `href="${esc(clickUrl(base, token, unesc(raw), key))}"`));
  const pixel = `<img src="${base}/api/e/o/${token}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;opacity:0" />`;
  return /<\/body>/i.test(rewritten) ? rewritten.replace(/<\/body>/i, `${pixel}</body>`) : rewritten + pixel;
}
