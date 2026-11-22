// About page: information about the app (data/config.json) and how to reach its maintainer (data/contact.json).
import { el, mount, safeHref } from "./util.js";
import { icon } from "./icons.js";
import { loadJSON } from "./auth.js";
import { brandNodes } from "./brand.js";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const contactHeading = () => el("h2", {}, icon("email", { size: 20 }), "Contact");

function contactRow(iconName, label, text, href) {
  const value = href
    ? el("a", { href, ...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {}), textContent: text })
    : el("span", { textContent: text });
  return el("li", {}, el("span", { className: "contact-icon" }, icon(iconName, { size: 20 })), el("div", {}, el("small", { textContent: label }), value));
}

function contactNodes(c) {
  const rows = [];
  if (c.email && EMAIL.test(c.email)) rows.push(contactRow("email", "Email", c.email, `mailto:${c.email}`));
  if (c.phone) rows.push(contactRow("phone", "Phone", c.phone, `tel:${String(c.phone).replace(/[^\d+]/g, "")}`));
  const site = c.website && safeHref(c.website);
  if (site) rows.push(contactRow("web", "Website", site.replace(/^https?:\/\//, "").replace(/\/$/, ""), site));
  if (c.address) rows.push(contactRow("map", "Address", c.address));
  for (const l of c.links || []) {
    const href = safeHref(l.url);
    if (href) rows.push(contactRow("link", l.label || "Link", href.replace(/^https?:\/\//, "").replace(/\/$/, ""), href));
  }
  return [
    contactHeading(),
    c.name ? el("p", {}, el("strong", { textContent: c.name }), c.title ? ` · ${c.title}` : "") : null,
    c.message ? el("p", { className: "muted", textContent: c.message }) : null,
    rows.length ? el("ul", { className: "contact-list" }, ...rows) : null,
    c.email && EMAIL.test(c.email) ? el("a", { className: "btn", href: `mailto:${c.email}` }, icon("email", { size: 18 }), "Send an email") : null,
  ];
}

export function renderAbout({ config }) {
  const contactSlot = el("section", { className: "panel contact" }, contactHeading(), el("p", { className: "muted", textContent: "Loading…" }));
  loadJSON(config.contactFile || "data/contact.json")
    .then((contact) => mount(contactSlot, contactNodes(contact)))
    .catch((err) => {
      console.error(err);
      mount(contactSlot, contactHeading(), el("p", { className: "muted", textContent: "Contact details are not available." }));
    });

  const facts = [["Application", config.appName], ["Designer", config.designer], ["Version", config.version], ["Released", config.released]].filter(([, v]) => v);
  return [el("div", { className: "about" },
    el("h1", { textContent: "About" }),
    el("section", { className: "hero about-hero" },
      el("div", {},
        el("div", { className: "about-brand" }, ...brandNodes(config, { size: 40 })),
        config.tagline ? el("p", { textContent: config.tagline }) : null),
      config.version ? el("span", { className: "badge about-version", textContent: `Version ${config.version}` }) : null),
    el("div", { className: "about-grid" },
      el("section", { className: "panel" },
        el("h2", {}, icon("info", { size: 20 }), `About ${config.appName}`),
        config.description ? el("p", { textContent: config.description }) : null,
        config.features?.length
          ? el("ul", { className: "feature-list" }, ...config.features.map((f) => el("li", {}, icon("check", { size: 20 }), el("span", { textContent: f }))))
          : null,
        facts.length ? el("dl", { className: "facts-grid" }, ...facts.flatMap(([k, v]) => [el("dt", { textContent: k }), el("dd", { textContent: String(v) })])) : null),
      contactSlot),
    el("p", { className: "about-foot", textContent: `© ${config.released ?? new Date().getFullYear()} ${config.designer ?? config.appName}` }))];
}
