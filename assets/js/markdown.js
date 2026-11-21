// A small, safe Markdown renderer. It builds DOM nodes (no innerHTML), so file content can never inject markup.
// Supports headings, paragraphs, **bold**, *italic*, ~~strike~~, `code`, fenced code, lists, quotes, tables, rules, links, images.
import { el } from "./util.js";

const ALLOWED = ["http:", "https:", "mailto:"];
function safeUrl(url, base) {
  try {
    const abs = new URL(url.trim(), base); // relative links resolve against the file's own folder
    return ALLOWED.includes(abs.protocol) ? abs.href : null; // javascript:, data: etc. are dropped
  } catch { return null; }
}

const RULES = [
  { re: /`([^`]+)`/, make: (m) => el("code", { textContent: m[1] }) },
  { re: /!\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/, make: (m, c) => { const src = safeUrl(m[2], c.base); return src ? el("img", { src, alt: m[1], loading: "lazy", className: "md-img" }) : m[1]; } },
  { re: /\[([^\]]+)\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/, make: (m, c) => { const href = safeUrl(m[2], c.base); const kids = inline(m[1], c); return href ? el("a", { href, target: "_blank", rel: "noopener noreferrer" }, ...kids) : el("span", {}, ...kids); } },
  { re: /\*\*([^*]+)\*\*|__([^_]+)__/, make: (m, c) => el("strong", {}, ...inline(m[1] ?? m[2], c)) },
  { re: /(?<![*\w])\*([^*\s][^*]*)\*(?!\*)|(?<!\w)_([^_\s][^_]*)_(?!\w)/, make: (m, c) => el("em", {}, ...inline(m[1] ?? m[2], c)) },
  { re: /~~([^~]+)~~/, make: (m, c) => el("del", {}, ...inline(m[1], c)) },
];

function inline(text, ctx) {
  const out = [];
  let rest = text;
  while (rest) {
    let best = null;
    for (const rule of RULES) {
      const m = rule.re.exec(rest);
      if (m && (!best || m.index < best.m.index)) best = { rule, m };
    }
    if (!best) { out.push(rest); break; }
    if (best.m.index) out.push(rest.slice(0, best.m.index));
    out.push(best.rule.make(best.m, ctx));
    rest = rest.slice(best.m.index + best.m[0].length);
  }
  return out;
}

const isBlank = (l) => !l.trim();
const FENCE = /^```/;
const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const HR = /^\s*([-*_])(\s*\1){2,}\s*$/;
const QUOTE = /^>\s?/;
const UL = /^\s*[-*+]\s+(.*)$/;
const OL = /^\s*\d+[.)]\s+(.*)$/;
const TABLE_SEP = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;
const cells = (row) => row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
const startsTable = (lines, i) => lines[i].includes("|") && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1]);
const startsBlock = (lines, i) => FENCE.test(lines[i]) || HEADING.test(lines[i]) || HR.test(lines[i]) || QUOTE.test(lines[i]) || UL.test(lines[i]) || OL.test(lines[i]) || startsTable(lines, i);

function parse(lines, ctx) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) { i++; continue; }
    let m;
    if (FENCE.test(line)) {
      const code = [];
      i++;
      while (i < lines.length && !FENCE.test(lines[i])) code.push(lines[i++]);
      i++;
      out.push(el("pre", {}, el("code", { textContent: code.join("\n") })));
    } else if ((m = HEADING.exec(line))) {
      out.push(el(`h${m[1].length}`, {}, ...inline(m[2], ctx)));
      i++;
    } else if (HR.test(line)) {
      out.push(el("hr"));
      i++;
    } else if (QUOTE.test(line)) {
      const quoted = [];
      while (i < lines.length && QUOTE.test(lines[i])) quoted.push(lines[i++].replace(QUOTE, ""));
      out.push(el("blockquote", {}, ...parse(quoted, ctx)));
    } else if (UL.test(line) || OL.test(line)) {
      const ordered = OL.test(line), re = ordered ? OL : UL, items = [];
      while (i < lines.length && re.test(lines[i])) {
        items.push(re.exec(lines[i++])[1]);
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !UL.test(lines[i]) && !OL.test(lines[i])) items[items.length - 1] += ` ${lines[i++].trim()}`;
      }
      out.push(el(ordered ? "ol" : "ul", {}, ...items.map((t) => el("li", {}, ...inline(t, ctx)))));
    } else if (startsTable(lines, i)) {
      const head = cells(line), rows = [];
      i += 2;
      while (i < lines.length && !isBlank(lines[i]) && lines[i].includes("|")) rows.push(cells(lines[i++]));
      out.push(el("div", { className: "table-wrap" }, el("table", {},
        el("thead", {}, el("tr", {}, ...head.map((h) => el("th", {}, ...inline(h, ctx))))),
        el("tbody", {}, ...rows.map((r) => el("tr", {}, ...r.map((c) => el("td", {}, ...inline(c, ctx)))))))));
    } else {
      const para = [];
      while (i < lines.length && !isBlank(lines[i]) && (para.length === 0 || !startsBlock(lines, i))) para.push(lines[i++].trim());
      out.push(el("p", {}, ...inline(para.join(" "), ctx)));
    }
  }
  return out;
}

/** fileUrl: where the Markdown file lives, so relative links and images resolve next to it. */
export function renderMarkdown(source, fileUrl) {
  const ctx = { base: new URL(fileUrl, location.href) };
  return el("div", { className: "md" }, ...parse(source.replace(/\r\n?/g, "\n").split("\n"), ctx));
}
