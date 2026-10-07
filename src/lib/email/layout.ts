/** One branded, responsive HTML layout + plain-text fallback for every email */

export type EmailContent = {
  preheader?: string;
  heading: string;
  /** paragraphs — plain text, escaped */
  body: string[];
  /** optional key/value facts table (e.g. interview time, job, location) */
  facts?: { label: string; value: string }[];
  cta?: { label: string; url: string };
  /** small grey line under the CTA */
  note?: string;
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function siteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
  return raw.replace(/\/$/, "");
}

export const absUrl = (path: string) => (path.startsWith("http") ? path : `${siteUrl()}${path.startsWith("/") ? "" : "/"}${path}`);

export function renderEmail(c: EmailContent, senderName = "Synerax Talent") {
  const brand = esc(senderName);
  const facts = c.facts?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid #E4E7ED;border-radius:12px;border-collapse:separate">
        ${c.facts
          .map(
            (f, i) => `<tr><td style="padding:10px 14px;${i ? "border-top:1px solid #E4E7ED;" : ""}font:500 13px/1.4 Arial,sans-serif;color:#606A84;width:38%">${esc(f.label)}</td>
            <td style="padding:10px 14px;${i ? "border-top:1px solid #E4E7ED;" : ""}font:600 14px/1.4 Arial,sans-serif;color:#172036">${esc(f.value)}</td></tr>`
          )
          .join("")}
      </table>`
    : "";
  const cta = c.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 8px"><tr><td style="border-radius:12px;background:#0F766E">
        <a href="${esc(absUrl(c.cta.url))}" style="display:inline-block;padding:13px 24px;font:600 15px Arial,sans-serif;color:#ffffff;text-decoration:none;border-radius:12px">${esc(c.cta.label)}</a>
      </td></tr></table>`
    : "";

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(c.heading)}</title></head>
<body style="margin:0;padding:0;background:#F5F6F9">
<span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${esc(c.preheader ?? c.body[0] ?? "")}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F6F9;padding:28px 12px"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px">
    <tr><td style="padding:0 6px 16px;font:700 18px Arial,sans-serif;color:#0C111F">Synerax <span style="color:#0F766E">Talent</span></td></tr>
    <tr><td style="background:#ffffff;border:1px solid #E4E7ED;border-radius:18px;padding:30px 28px">
      <h1 style="margin:0 0 14px;font:700 22px/1.3 Arial,sans-serif;color:#0C111F">${esc(c.heading)}</h1>
      ${c.body.map((p) => `<p style="margin:0 0 12px;font:400 15px/1.6 Arial,sans-serif;color:#2D3751">${esc(p)}</p>`).join("")}
      ${facts}${cta}
      ${c.note ? `<p style="margin:14px 0 0;font:400 12.5px/1.5 Arial,sans-serif;color:#8089A0">${esc(c.note)}</p>` : ""}
    </td></tr>
    <tr><td style="padding:18px 8px;font:400 12px/1.5 Arial,sans-serif;color:#8089A0;text-align:center">
      Sent by ${brand} · <a href="${esc(siteUrl())}" style="color:#8089A0">${esc(siteUrl().replace(/^https?:\/\//, ""))}</a><br>
      Synerax never asks candidates for money.
    </td></tr>
  </table>
</td></tr></table></body></html>`;

  const text = [
    c.heading,
    "",
    ...c.body,
    ...(c.facts?.length ? ["", ...c.facts.map((f) => `${f.label}: ${f.value}`)] : []),
    ...(c.cta ? ["", `${c.cta.label}: ${absUrl(c.cta.url)}`] : []),
    ...(c.note ? ["", c.note] : []),
    "",
    `— ${senderName} · ${siteUrl()}`,
  ].join("\n");

  return { html, text };
}
