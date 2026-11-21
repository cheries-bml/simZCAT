import { el, mount } from "./util.js";
import { can } from "./auth.js";
import { listAttempts, clearAttempts } from "./results.js";
import { confirmModal } from "./modal.js";
import { openReview } from "./review.js";
import { fmtTime } from "./test-engine.js";

const when = (ts) => new Date(ts).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
const pctClass = (p) => (p >= 70 ? "pct pct-high" : p >= 50 ? "pct pct-mid" : "pct pct-low");
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

function assists(a) {
  const parts = [a.peeks ? plural(a.peeks, "answer") : null, a.explained ? plural(a.explained, "explanation") : null, a.paused ? "paused" : null, a.timerOff ? "timer off" : null].filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
}

export function renderReports({ config, session, roles, onRetake }) {
  const everyone = can(session, roles, "reports.all");
  const root = el("div", { className: "reports" });
  let selUser = "";   // filters: "" = all
  let selTest = "";

  function showList() {
    const all = listAttempts(everyone ? {} : { username: session.username });
    const users = [...new Map(all.map((a) => [a.username, a.name || a.username])).entries()];
    const tests = [...new Map(all.map((a) => [a.testPath, a.testTitle])).entries()];
    if (!users.some(([u]) => u === selUser)) selUser = "";
    if (!tests.some(([t]) => t === selTest)) selTest = "";

    const select = (label, value, options, onChange) => el("label", { className: "field" }, el("span", { textContent: label }),
      el("select", { onchange: (e) => onChange(e.target.value) },
        el("option", { value: "", textContent: "All" }),
        ...options.map(([v, text]) => el("option", { value: v, textContent: text, selected: v === value }))));

    const resultsSlot = el("div");
    const filterRow = all.length
      ? el("div", { className: "report-filters" },
          everyone ? select("User", selUser, users, (v) => { selUser = v; update(); }) : null,
          select("Test", selTest, tests, (v) => { selTest = v; update(); }),
          el("button", { className: "link-btn", type: "button", textContent: "Clear", onclick: () => { selUser = ""; selTest = ""; showList(); } }))
      : null;

    function update() {
      const rows = all.filter((a) => (!selUser || a.username === selUser) && (!selTest || a.testPath === selTest));
      const stat = (label, value) => el("div", { className: "stat" }, el("strong", { textContent: String(value) }), el("span", { textContent: label }));
      const avg = rows.length ? Math.round(rows.reduce((sum, a) => sum + a.percent, 0) / rows.length) : 0;
      const best = rows.length ? Math.max(...rows.map((a) => a.percent)) : 0;

      const head = el("tr", {}, ...["Date", "Score", "%", "Time", "Assists used", "Actions"].map((t) => el("th", { textContent: t })));
      const body = rows.map((a) => el("tr", {},
        el("td", { textContent: when(a.ts) }),
        el("td", { textContent: `${a.correct}/${a.total}` }),
        el("td", {}, el("span", { className: pctClass(a.percent), textContent: `${a.percent}%` })),
        el("td", { textContent: fmtTime(a.seconds) + (a.timedOut ? " (time up)" : "") }),
        el("td", { textContent: assists(a) }),
        el("td", {}, el("div", { className: "row-actions" },
          el("button", { className: "btn btn-ghost btn-sm", type: "button", textContent: "Retake", onclick: () => onRetake(a.testPath) }),
          el("button", {
            className: "btn btn-ghost btn-sm", type: "button", textContent: "Review", disabled: !a.answers || !a.qids,
            onclick: () => openReview({ root, config, attempt: a, onBack: showList, onRetake: () => onRetake(a.testPath) }),
          })))));

      mount(resultsSlot, rows.length
        ? [
            el("section", { className: "panel" }, el("div", { className: "stats" },
              stat("Attempts", rows.length), stat("Average score", `${avg}%`), stat("Best score", `${best}%`),
              stat("Tests taken", new Set(rows.map((a) => a.testPath)).size))),
            el("section", { className: "panel table-wrap" }, el("table", {}, el("thead", {}, head), el("tbody", {}, ...body))),
          ]
        : el("p", { className: "panel", textContent: all.length ? "No results match these filters." : "No results yet." }));
    }

    mount(root,
      el("h1", { textContent: "Reports" }),
      filterRow,
      resultsSlot,
      all.length
        ? el("div", { className: "report-actions" }, el("button", {
            className: "btn btn-ghost", type: "button", textContent: everyone ? "Clear all results" : "Clear my results",
            onclick: async () => {
              const ok = await confirmModal(everyone ? "Clear all results?" : "Clear your results?", "This can’t be undone.", { confirmLabel: "Clear", danger: true });
              if (ok) { clearAttempts(everyone ? null : session.username); showList(); }
            },
          }))
        : null);
    update();
    window.scrollTo({ top: 0 });
  }

  showList();
  return [root];
}
