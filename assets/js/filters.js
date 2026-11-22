import { el, mount } from "./util.js";
import { icon } from "./icons.js";
import { openModal } from "./modal.js";
import * as E from "./test-engine.js";

const countActive = (filters, facets = E.FACETS) => facets.reduce((n, { key }) => n + (filters[key]?.size ?? 0), 0);

/**
 * One compact row: Filter, Favorites, MyTest, GenTest, removable filter chips and the result count.
 * view: "all" | "favorites" | "mytest" (Filter and its chips only apply to the first two).
 */
export function renderToolbar({ filters, view, favCount, myCount, shown, total, onOpenFilter, onToggleFav, onToggleMy, onGen, onChange }) {
  const active = countActive(filters);
  const chips = E.FACETS.flatMap(({ key, label }) => [...filters[key]].map((value) =>
    el("button", {
      type: "button", className: "chip-btn active-chip", "aria-label": `Remove ${label} filter: ${E.facetLabel(value)}`,
      onclick: () => { filters[key].delete(value); onChange(); },
    }, E.facetLabel(value), icon("close", { size: 14 }))));
  const filterable = view === "all"; // Favorites and MyTest list their own items, so the filters do not apply there
  const countText = view === "mytest" ? `${myCount} saved ${myCount === 1 ? "test" : "tests"}`
    : view === "favorites" ? `${favCount} favorite ${favCount === 1 ? "test" : "tests"}`
    : `${shown} of ${total} tests`;

  return el("div", { className: "toolbar" },
    filterable
      ? el("button", { type: "button", className: "btn btn-ghost js-filter-btn", onclick: onOpenFilter },
          icon("filter", { size: 18 }), "Filter", active ? el("span", { className: "filter-badge", textContent: String(active) }) : null)
      : null,
    el("button", { type: "button", className: "chip-btn", "aria-pressed": String(view === "favorites"), onclick: onToggleFav },
      icon(view === "favorites" ? "star-filled" : "star", { size: 16 }), `Favorites ${favCount}`),
    el("button", { type: "button", className: "chip-btn js-mytest-btn", "aria-pressed": String(view === "mytest"), onclick: onToggleMy },
      icon("folder", { size: 16 }), `MyTest ${myCount}`),
    el("button", { type: "button", className: "btn js-gentest-btn", onclick: onGen }, icon("wand", { size: 18 }), "GenTest"),
    filterable && chips.length ? el("div", { className: "active-chips" }, ...chips) : null,
    el("span", { className: "muted toolbar-count", textContent: countText }),
    filterable && active ? el("button", { type: "button", className: "link-btn", textContent: "Clear", onclick: () => { E.FACETS.forEach(({ key }) => filters[key].clear()); onChange(); } }) : null);
}

/**
 * The Filter window. Edits a working copy; Apply writes it back into `filters`. Resolves true when applied.
 * facets: the groups to show (default level / course / topic); a facet may carry format(value) for its labels.
 */
export async function openFilterWindow(items, filters, facets = E.FACETS, noun = "tests") {
  const work = Object.fromEntries(facets.map(({ key }) => [key, new Set(filters[key])]));
  const body = el("div", { className: "filter-window" });

  function draw(changed) {
    const matching = E.applyFilters(items, work, facets).length;
    mount(body,
      facets.map(({ key, label, format }) => {
        const options = E.facetOptions(items, work, key, facets);
        if (!options.length) return null;
        const fmt = format ?? E.facetLabel;
        return el("div", { className: "filter-group", role: "group", "aria-label": label },
          el("span", { className: "filter-label", textContent: label }),
          el("div", { className: "filter-chips" }, ...options.map(({ value, count }) =>
            el("button", {
              type: "button", className: "filter-chip", dataset: { facet: key, value }, "aria-pressed": String(work[key].has(value)),
              onclick: () => { if (work[key].has(value)) work[key].delete(value); else work[key].add(value); draw({ key, value }); },
            }, fmt(value), el("span", { className: "filter-count", textContent: String(count) })))));
      }),
      el("div", { className: "filter-foot" },
        el("span", { className: "muted", textContent: `${matching} of ${items.length} ${noun} match` }),
        countActive(work, facets) ? el("button", { type: "button", className: "link-btn", textContent: "Clear all", onclick: () => { facets.forEach(({ key }) => work[key].clear()); draw(); } }) : null));
    if (changed) body.querySelector(`[data-facet="${changed.key}"][data-value="${changed.value}"]`)?.focus();
  }
  draw();

  const ok = await openModal({
    title: `Filter ${noun}`, body, wide: true, dismissValue: false,
    actions: [{ label: "Cancel", value: false }, { label: "Apply", value: true, primary: true }],
  });
  if (ok) facets.forEach(({ key }) => { filters[key].clear(); work[key].forEach((v) => filters[key].add(v)); });
  return ok;
}
