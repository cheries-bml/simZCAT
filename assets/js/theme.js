// Light / dark mode and accent themes. Saved in localStorage; applied through data-mode / data-accent on <html>.
import { el, mount } from "./util.js";
import { icon } from "./icons.js";
import { openModal } from "./modal.js";

const KEY = "app.theme";
export const ACCENTS = [
  { id: "teal", label: "Teal", color: "#0e7c86" },
  { id: "ocean", label: "Ocean", color: "#2563eb" },
  { id: "violet", label: "Violet", color: "#7c3aed" },
  { id: "rose", label: "Rose", color: "#e11d48" },
  { id: "forest", label: "Forest", color: "#15803d" },
  { id: "sunset", label: "Sunset", color: "#c2410c" },
];

export function getTheme() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { /* ignore */ }
  const systemDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  return {
    mode: saved.mode === "dark" || saved.mode === "light" ? saved.mode : systemDark ? "dark" : "light",
    accent: ACCENTS.some((a) => a.id === saved.accent) ? saved.accent : "teal",
  };
}

export function applyTheme({ mode, accent }) {
  document.documentElement.dataset.mode = mode;
  document.documentElement.dataset.accent = accent;
}

export function setTheme(patch) {
  const next = { ...getTheme(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  applyTheme(next);
  window.dispatchEvent(new Event("themechange"));
  return next;
}

function openThemeWindow() {
  const body = el("div", { className: "theme-window" });
  function draw() {
    const { mode, accent } = getTheme();
    mount(body,
      el("h3", { textContent: "Mode" }),
      el("div", { className: "segmented", role: "group", "aria-label": "Mode" },
        ...[["light", "sun", "Light"], ["dark", "moon", "Dark"]].map(([value, ic, label]) =>
          el("button", { type: "button", className: "seg-opt", "aria-pressed": String(mode === value), onclick: () => { setTheme({ mode: value }); draw(); } }, icon(ic, { size: 16 }), label))),
      el("h3", { textContent: "Theme" }),
      el("div", { className: "swatches", role: "group", "aria-label": "Theme" },
        ...ACCENTS.map((a) => el("button", {
          type: "button", className: "swatch", "aria-pressed": String(accent === a.id), style: `--swatch: ${a.color}`,
          onclick: () => { setTheme({ accent: a.id }); draw(); },
        }, el("span", { className: "swatch-dot" }, accent === a.id ? icon("tick", { size: 16 }) : null), a.label))));
  }
  draw();
  return openModal({ title: "Appearance", body, actions: [{ label: "Done", primary: true }] });
}

/** Two icon buttons: quick light/dark toggle and the theme picker. */
export function themeControls() {
  const modeBtn = el("button", { type: "button", className: "icon-btn", onclick: () => setTheme({ mode: getTheme().mode === "dark" ? "light" : "dark" }) });
  const pickBtn = el("button", { type: "button", className: "icon-btn", title: "Theme", "aria-label": "Theme", onclick: openThemeWindow }, icon("palette", { size: 20 }));
  const sync = () => {
    const dark = getTheme().mode === "dark";
    mount(modeBtn, icon(dark ? "sun" : "moon", { size: 20 }));
    const label = dark ? "Switch to light mode" : "Switch to dark mode";
    modeBtn.title = label;
    modeBtn.setAttribute("aria-label", label);
  };
  sync();
  window.addEventListener("themechange", sync);
  return [modeBtn, pickBtn];
}
