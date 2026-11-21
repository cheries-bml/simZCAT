// Applies the saved theme before the page is painted (no flash). Classic script, loaded in <head>.
(function () {
  try {
    var t = JSON.parse(localStorage.getItem("app.theme")) || {};
    var dark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    var root = document.documentElement;
    root.dataset.mode = t.mode === "dark" || t.mode === "light" ? t.mode : dark ? "dark" : "light";
    root.dataset.accent = t.accent || "teal";
  } catch (e) { /* defaults apply */ }
})();
