// Files page: browse teaching materials (files/<level>/<course>/...), filter them, preview them, open them in a new tab.
import { el, mount } from "./util.js";
import { icon } from "./icons.js";
import { loadFiles } from "./catalog.js";
import { openModal, alertModal } from "./modal.js";
import { openFilterWindow } from "./filters.js";
import { renderMarkdown } from "./markdown.js";
import * as E from "./test-engine.js";

// Kept while the page stays open.
const filters = Object.fromEntries(E.FILE_FACETS.map(({ key }) => [key, new Set()]));
let query = "";

const MAX_TEXT = 300000; // characters previewed for text and Markdown files
const KIND_ICON = { text: "file" };
const heading = () => [el("h1", { textContent: "Files" }), el("p", { className: "lede", textContent: "Teaching materials to read and download." })];

export function renderFiles({ config }) {
  const root = el("div", { className: "files-root" });
  showFiles(root, config);
  return [root];
}

async function showFiles(root, config) {
  mount(root, heading(), el("p", { className: "muted", textContent: "Loading files…" }));
  let files;
  try {
    files = await loadFiles(config);
  } catch (err) {
    mount(root, heading(), el("p", { className: "muted", textContent: "The list of files could not be loaded." }));
    console.error(err);
    alertModal("Could not load files", "Please try again later.");
    return;
  }
  if (!files.length) {
    mount(root, heading(), el("p", { className: "panel", textContent: "No files available." }));
    return;
  }

  const pool = () => files.filter((f) => E.matchesQuery(f, query));
  const gridSlot = el("div");
  const chipsSlot = el("div", { className: "active-chips" });
  const badge = el("span", { className: "filter-badge" });
  const countEl = el("span", { className: "muted toolbar-count" });
  const searchInput = el("input", {
    type: "search", className: "search-input", placeholder: "Search files", "aria-label": "Search files", value: query,
    oninput: (e) => { query = e.target.value; update(); },
  });
  const filterBtn = el("button", {
    type: "button", className: "btn btn-ghost",
    onclick: async () => { await openFilterWindow(pool(), filters, E.FILE_FACETS, "files"); update(); filterBtn.focus(); },
  }, icon("filter", { size: 18 }), "Filter", badge);
  const clearBtn = el("button", {
    type: "button", className: "link-btn", textContent: "Clear",
    onclick: () => { E.FILE_FACETS.forEach(({ key }) => filters[key].clear()); query = ""; searchInput.value = ""; update(); },
  });

  function update() {
    const active = E.FILE_FACETS.reduce((n, { key }) => n + filters[key].size, 0);
    const shown = E.applyFilters(pool(), filters, E.FILE_FACETS);
    badge.textContent = String(active);
    badge.hidden = !active;
    clearBtn.hidden = !(active || query.trim());
    countEl.textContent = `${shown.length} of ${files.length} files`;
    mount(chipsSlot, E.FILE_FACETS.flatMap(({ key, label, format }) => [...filters[key]].map((value) => {
      const text = (format ?? E.facetLabel)(value);
      return el("button", {
        type: "button", className: "chip-btn active-chip", "aria-label": `Remove ${label} filter: ${text}`,
        onclick: () => { filters[key].delete(value); update(); },
      }, text, icon("close", { size: 14 }));
    })));
    mount(gridSlot, shown.length
      ? el("div", { className: "cards" }, ...shown.map(fileCard))
      : el("p", { className: "panel", textContent: "No files match." }));
  }

  mount(root, heading(),
    el("div", { className: "toolbar" },
      filterBtn,
      el("span", { className: "search-wrap" }, icon("search", { size: 18 }), searchInput),
      chipsSlot, countEl, clearBtn),
    gridSlot);
  update();
}

function fileCard(f) {
  const where = [f.course, f.topic].filter(Boolean).map(E.facetLabel).join(" › ");
  return el("div", { className: "card-wrap" },
    el("button", { className: "card file-card", type: "button", onclick: () => openViewer(f) },
      el("span", { className: "card-tags" },
        f.level ? el("span", { className: `level-pill lv-${f.level}`, textContent: E.facetLabel(f.level) }) : null,
        el("span", { className: "card-folder", textContent: where || "General" })),
      el("span", { className: "file-title" },
        el("span", { className: `file-icon kind-${f.kind}` }, icon(KIND_ICON[f.kind] ?? f.kind, { size: 22 })),
        el("span", { className: "card-title", textContent: f.title })),
      el("span", { className: "card-desc", textContent: f.description }),
      el("span", { className: "card-meta", textContent: [E.KIND_LABELS[f.kind], E.humanSize(f.size)].filter(Boolean).join(" · ") })),
    el("a", {
      className: "fav-btn", href: E.fileUrl(f.path), target: "_blank", rel: "noopener noreferrer",
      title: "Open in new tab", "aria-label": `Open ${f.title} in a new tab`,
    }, icon("open", { size: 20 })));
}

// ----- viewer -----
function openViewer(f) {
  const url = E.fileUrl(f.path);
  const meta = [E.crumb(f), E.KIND_LABELS[f.kind], E.humanSize(f.size)].filter(Boolean).join(" · ");
  return openModal({
    title: f.title, wide: "xl",
    body: el("div", { className: "viewer" }, el("p", { className: "muted viewer-meta", textContent: meta }), preview(f, url)),
    actions: [
      { label: "Open in new tab", href: url, icon: icon("open", { size: 16 }) },
      { label: "Download", href: url, download: true, icon: icon("download", { size: 16 }) },
      { label: "Close", value: true, primary: true },
    ],
  });
}

function preview(f, url) {
  switch (f.kind) {
    case "pdf": return el("iframe", { className: "viewer-frame", src: url, title: f.title });
    case "image": return el("img", { className: "viewer-img", src: url, alt: f.title });
    case "video": return el("video", { className: "viewer-media", src: url, controls: true });
    case "audio": return el("audio", { className: "viewer-audio", src: url, controls: true });
    case "markdown":
    case "text": return textPreview(f, url);
    default: return el("p", { className: "viewer-none", textContent: "A preview is not available for this type of file. Use Open in new tab or Download." });
  }
}

function textPreview(f, url) {
  const box = el("div", { className: "viewer-text-box" }, el("p", { className: "muted", textContent: "Loading…" }));
  fetch(url)
    .then((res) => (res.ok ? res.text() : Promise.reject(new Error(String(res.status)))))
    .then((text) => {
      const cut = text.length > MAX_TEXT;
      const shown = cut ? text.slice(0, MAX_TEXT) : text;
      mount(box,
        f.kind === "markdown" ? renderMarkdown(shown, url) : el("pre", { className: "viewer-text", textContent: shown }),
        cut ? el("p", { className: "muted", textContent: "Only the beginning is shown. Open the file in a new tab to read all of it." }) : null);
    })
    .catch((err) => {
      console.error(err);
      mount(box, el("p", { className: "viewer-none", textContent: "This file could not be loaded." }));
    });
  return box;
}
