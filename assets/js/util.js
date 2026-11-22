// Small DOM helpers shared by all pages.

export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "dataset") Object.assign(node.dataset, value);
    else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
    else if (key in node) node[key] = value;
    else node.setAttribute(key, value);
  }
  node.append(...children.flat(Infinity).filter((c) => c != null && c !== false));
  return node;
}

// Replace the children of `root`, ignoring null/false entries.
export const mount = (root, ...nodes) => root.replaceChildren(...nodes.flat(Infinity).filter(Boolean));

// Question files may contain light HTML (<b>, <br> ...). Keep an allowlist, drop everything else.
const ALLOWED = new Set(["B", "I", "U", "EM", "STRONG", "BR", "P", "SPAN", "SUB", "SUP", "CODE", "UL", "OL", "LI", "MARK"]);

export function safeHTML(html = "") {
  const tpl = document.createElement("template");
  tpl.innerHTML = String(html);
  (function clean(parent) {
    for (const child of [...parent.childNodes]) {
      if (child.nodeType === 1) {
        clean(child);
        if (ALLOWED.has(child.tagName)) [...child.attributes].forEach((a) => child.removeAttribute(a.name));
        else child.replaceWith(...child.childNodes);
      } else if (child.nodeType !== 3) {
        child.remove();
      }
    }
  })(tpl.content);
  return tpl.content;
}

export const richText = (html, tag = "div", className = "") => el(tag, { className }, safeHTML(html));

/** An absolute URL only when its protocol is allowed (default http/https); otherwise null. */
export function safeHref(url, allowed = ["http:", "https:"]) {
  try {
    const u = new URL(String(url).trim());
    return allowed.includes(u.protocol) ? u.href : null;
  } catch { return null; }
}
