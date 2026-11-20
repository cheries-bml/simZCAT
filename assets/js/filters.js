import { el } from "./util.js";
import * as E from "./test-engine.js";

/** Chip filters for level / course / topic. onChange({ key, value }) is called after the selection changes. */
export function renderFilterBar({ tests, filters, shown, onChange }) {
  const groups = E.FACETS.map(({ key, label }) => {
    const options = E.facetOptions(tests, filters, key);
    if (!options.length) return null;
    return el("div", { className: "filter-group", role: "group", "aria-label": label },
      el("span", { className: "filter-label", textContent: label }),
      el("div", { className: "filter-chips" }, ...options.map(({ value, count }) =>
        el("button", {
          type: "button", className: "filter-chip", dataset: { facet: key, value },
          "aria-pressed": String(filters[key].has(value)),
          onclick: () => {
            if (filters[key].has(value)) filters[key].delete(value); else filters[key].add(value);
            onChange({ key, value });
          },
        }, E.facetLabel(value), el("span", { className: "filter-count", textContent: String(count) })))));
  });

  return el("section", { className: "filter-bar", "aria-label": "Filter tests" },
    ...groups,
    el("div", { className: "filter-foot" },
      el("span", { className: "muted", textContent: `Showing ${shown} of ${tests.length} tests` }),
      E.hasFilters(filters)
        ? el("button", { className: "link-btn", type: "button", textContent: "Clear filters", onclick: () => {
            E.FACETS.forEach(({ key }) => filters[key].clear());
            onChange(null);
          } })
        : null));
}
