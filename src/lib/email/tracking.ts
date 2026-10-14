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

/** rewrite every http(s) link in the HTML to the click tracker and add the open pixel */
export function addTracking(html: string, base: string, token: string, key = secret()) {
  const unesc = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const rewritten = html.replace(/href="(https?:\/\/[^"]+)"/gi, (_m, raw: string) => `href="${esc(clickUrl(base, token, unesc(raw), key))}"`);
  const pixel = `<img src="${base}/api/e/o/${token}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;opacity:0" />`;
  return /<\/body>/i.test(rewritten) ? rewritten.replace(/<\/body>/i, `${pixel}</body>`) : rewritten + pixel;
}
