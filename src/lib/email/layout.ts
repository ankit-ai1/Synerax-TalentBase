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

export function renderEmail(c: EmailContent, senderName = "Synerax TalentBase") {
  const brand = esc(senderName);
  const facts = c.facts?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid #EBE4BC;border-radius:12px;border-collapse:separate">
        ${c.facts
          .map(
            (f, i) => `<tr><td style="padding:10px 14px;${i ? "border-top:1px solid #EBE4BC;" : ""}font:500 13px/1.4 Arial,sans-serif;color:#6B5640;width:38%">${esc(f.label)}</td>
            <td style="padding:10px 14px;${i ? "border-top:1px solid #EBE4BC;" : ""}font:600 14px/1.4 Arial,sans-serif;color:#38240D">${esc(f.value)}</td></tr>`
          )
          .join("")}
      </table>`
    : "";
  const cta = c.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 8px"><tr><td style="border-radius:12px;background:#BA5500">
        <a href="${esc(absUrl(c.cta.url))}" style="display:inline-block;padding:13px 24px;font:600 15px Arial,sans-serif;color:#ffffff;text-decoration:none;border-radius:12px">${esc(c.cta.label)}</a>
      </td></tr></table>`
    : "";

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(c.heading)}</title></head>
<body style="margin:0;padding:0;background:#FDFBD4">
<span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${esc(c.preheader ?? c.body[0] ?? "")}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FDFBD4;padding:28px 12px"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px">
    <tr><td style="padding:0 6px 16px;font:700 18px Arial,sans-serif;color:#38240D">Synerax <span style="color:#6B5640;font-weight:600">Talent</span><span style="color:#BA5500">Base</span></td></tr>
    <tr><td style="background:#FFFEF3;border:1px solid #EBE4BC;border-radius:18px;padding:30px 28px">
      <h1 style="margin:0 0 14px;font:700 22px/1.3 Arial,sans-serif;color:#38240D">${esc(c.heading)}</h1>
      ${c.body.map((p) => `<p style="margin:0 0 12px;font:400 15px/1.6 Arial,sans-serif;color:#4A3218">${esc(p)}</p>`).join("")}
      ${facts}${cta}
      ${c.note ? `<p style="margin:14px 0 0;font:400 12.5px/1.5 Arial,sans-serif;color:#8F7B62">${esc(c.note)}</p>` : ""}
    </td></tr>
    <tr><td style="padding:18px 8px;font:400 12px/1.5 Arial,sans-serif;color:#8F7B62;text-align:center">
      Sent by ${brand} · <a href="${esc(siteUrl())}" style="color:#8F7B62">${esc(siteUrl().replace(/^https?:\/\//, ""))}</a><br>
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
