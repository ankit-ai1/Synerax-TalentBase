/**
 * Small, safe Markdown renderer for blog posts (pure — unit-tested in tests/blog.test.ts).
 * Supports: ## headings (ids for the table of contents), paragraphs, **bold**, *italic*, `code`, ``` blocks,
 * [links](url), ![images](url "caption"), - / 1. lists, > quotes, --- rules and | tables |.
 * All raw HTML is escaped; links only allow http(s), mailto, tel and site-relative URLs.
 */

export type TocItem = { id: string; text: string; level: 2 | 3 };
export type MdStats = { words: number; minutes: number; images: { src: string; alt: string }[]; links: { href: string; internal: boolean }[]; headings: { level: number; text: string }[]; firstParagraph: string };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");

export function safeUrl(u: string) {
  const s = u.trim();
  if (/^(https?:|mailto:|tel:)/i.test(s) || /^\/(?!\/)/.test(s) || s.startsWith("#")) return s;
  return null;
}
const isInternal = (href: string, siteHost?: string) => href.startsWith("/") || href.startsWith("#") || (!!siteHost && (() => { try { return new URL(href).host === siteHost; } catch { return false; } })());

/** inline markdown → HTML (input is raw text; escaped here) */
export function inline(src: string, siteHost?: string): string {
  const codes: string[] = [];
  let s = src.replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(`<code>${esc(c)}</code>`) - 1}\u0000`);
  const out: string[] = [];
  // images + links first (on raw text), everything else escaped
  const re = /(!?)\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+"([^"]*)")?\s*\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    out.push(fmt(esc(s.slice(last, m.index))));
    const url = safeUrl(m[3]);
    if (!url) out.push(fmt(esc(m[2])));
    else if (m[1]) out.push(`<img src="${esc(url)}" alt="${esc(m[2])}" loading="lazy" decoding="async"${m[4] ? ` title="${esc(m[4])}"` : ""} />`);
    else {
      const ext = !isInternal(url, siteHost) && /^https?:/i.test(url);
      out.push(`<a href="${esc(url)}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ""}>${fmt(esc(m[2]))}</a>`);
    }
    last = m.index + m[0].length;
  }
  out.push(fmt(esc(s.slice(last))));
  s = out.join("");
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[Number(i)]);
}
const fmt = (s: string) =>
  s
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, "$1<em>$2</em>")
    .replace(/(^|[^_\w])_([^_\s][^_]*?)_(?!\w)/g, "$1<em>$2</em>");

const stripInline = (s: string) => s.replace(/!\[([^\]]*)\]\([^)]*\)/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[*_`]/g, "").trim();

/** Markdown → { html, toc } */
export function renderMarkdown(md: string, opts: { siteHost?: string } = {}): { html: string; toc: TocItem[] } {
  const lines = (md ?? "").replace(/\r\n?/g, "\n").split("\n");
  const html: string[] = [];
  const toc: TocItem[] = [];
  const used = new Map<string, number>();
  const id = (text: string) => {
    const base = slugify(text) || "section";
    const n = used.get(base) ?? 0;
    used.set(base, n + 1);
    return n ? `${base}-${n + 1}` : base;
  };
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    // fenced code
    if (/^```/.test(line)) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) body.push(lines[i++]);
      i++;
      html.push(`<pre><code>${esc(body.join("\n"))}</code></pre>`);
      continue;
    }
    const h = /^(#{1,4})\s+(.+?)\s*#*$/.exec(line);
    if (h) {
      const level = Math.max(2, h[1].length); // a single # inside the body is still an H2 (the title is the H1)
      const text = stripInline(h[2]);
      const hid = id(text);
      if (level <= 3) toc.push({ id: hid, text, level: level as 2 | 3 });
      html.push(`<h${level} id="${hid}">${inline(h[2], opts.siteHost)}</h${level}>`);
      i++;
      continue;
    }
    if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
      html.push("<hr />");
      i++;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const body: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) body.push(lines[i++].replace(/^>\s?/, ""));
      html.push(`<blockquote>${renderMarkdown(body.join("\n"), opts).html}</blockquote>`);
      continue;
    }
    if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) {
        let item = lines[i++].replace(/^\s*([-*+]|\d+[.)])\s+/, "");
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) item += " " + lines[i++].trim();
        items.push(`<li>${inline(item, opts.siteHost)}</li>`);
      }
      html.push(ordered ? `<ol>${items.join("")}</ol>` : `<ul>${items.join("")}</ul>`);
      continue;
    }
    if (/^\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\|?\s*:?-{3,}/.test(lines[i + 1])) {
      const cells = (l: string) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const head = cells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) rows.push(cells(lines[i++]));
      html.push(
        `<div class="table-wrap"><table><thead><tr>${head.map((c) => `<th>${inline(c, opts.siteHost)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c, opts.siteHost)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`
      );
      continue;
    }
    // paragraph (until a blank line or another block)
    const body: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|>|\s*([-*+]|\d+[.)])\s+|\|.*\|\s*$|-{3,}\s*$)/.test(lines[i])) body.push(lines[i++]);
    const p = body.join(" ").trim();
    const onlyImg = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(p);
    if (onlyImg) {
      const caption = /"([^"]*)"\s*$/.exec(onlyImg[2])?.[1] ?? "";
      html.push(`<figure>${inline(p, opts.siteHost)}${caption ? `<figcaption>${esc(caption)}</figcaption>` : ""}</figure>`);
    } else html.push(`<p>${inline(p, opts.siteHost)}</p>`);
  }
  return { html: html.join("\n"), toc };
}

/** plain text (for word count, excerpts, RSS) */
export function plainText(md: string) {
  return (md ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^[#>\-*+|\d.)\s]+/gm, "")
    .replace(/[*_`|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function mdStats(md: string, siteHost?: string): MdStats {
  const text = plainText(md);
  const words = text ? text.split(" ").length : 0;
  const images = [...(md ?? "").matchAll(/!\[([^\]]*)\]\(\s*([^)\s]+)/g)].map((m) => ({ alt: m[1].trim(), src: m[2] }));
  const links = [...(md ?? "").matchAll(/(?<!!)\[[^\]]*\]\(\s*([^)\s]+)/g)].map((m) => ({ href: m[1], internal: isInternal(m[1], siteHost) }));
  const headings = [...(md ?? "").matchAll(/^(#{1,4})\s+(.+)$/gm)].map((m) => ({ level: Math.max(2, m[1].length), text: stripInline(m[2]) }));
  const firstBlock = (md ?? "").split(/\n\s*\n/).map((b) => b.trim()).find((b) => b && !/^(#|!\[|```|>|\||-{3,})/.test(b)) ?? "";
  return { words, minutes: Math.max(1, Math.round(words / 220)), images, links, headings, firstParagraph: plainText(firstBlock) };
}
