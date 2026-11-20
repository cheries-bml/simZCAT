import { el } from "./util.js";
import { icon } from "./icons.js";

/** The logo: cat icon + appName + "by designer" (both from data/config.json). */
export function brandNodes(config, { size = 22 } = {}) {
  return [
    el("span", { className: "brand-mark" }, icon("cat", { size })),
    el("span", { className: "brand-text" },
      el("span", { className: "brand-name", textContent: config.appName }),
      config.designer ? el("span", { className: "brand-by", textContent: `by ${config.designer}` }) : null),
  ];
}
