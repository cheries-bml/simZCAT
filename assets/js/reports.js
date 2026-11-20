import { el, mount } from "./util.js";
import { can } from "./auth.js";
import { listAttempts, clearAttempts } from "./results.js";
import { loadCatalog } from "./catalog.js";
import { confirmModal, alertModal } from "./modal.js";
import { fmtTime, sameQuestions } from "./test-engine.js";
import { showReview } from "./test-ui.js";

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

  async function reviewAttempt(a) {
    let test = null;
    try {
      test = (await loadCatalog(config)).find((t) => t.path === a.testPath) ?? null;
    } catch (err) {
      console.error(err);
    }
    if (!test || !sameQuestions(test, a)) {
      alertModal("Review unavailable", "This test has changed or is no longer available.");
      return;
    }
    showReview(root, test, a, { onBack: draw, onRetake: () => onRetake(a.testPath) });
  }

  function draw() {
    const rows = listAttempts(everyone ? {} : { username: session.username });
    const stat = (label, value) => el("div", { className: "stat" }, el("strong", { textContent: String(value) }), el("span", { textContent: label }));
    const avg = rows.length ? Math.round(rows.reduce((sum, a) => sum + a.percent, 0) / rows.length) : 0;
    const best = rows.length ? Math.max(...rows.map((a) => a.percent)) : 0;

    const head = el("tr", {}, ...["Date", everyone ? "User" : null, "Test", "Score", "%", "Time", "Assists used", "Actions"]
      .filter(Boolean).map((t) => el("th", { textContent: t })));
    const body = rows.map((a) => el("tr", {},
      el("td", { textContent: when(a.ts) }),
      everyone ? el("td", { textContent: a.name || a.username }) : null,
      el("td", { textContent: a.testTitle }),
      el("td", { textContent: `${a.correct}/${a.total}` }),
      el("td", {}, el("span", { className: pctClass(a.percent), textContent: `${a.percent}%` })),
      el("td", { textContent: fmtTime(a.seconds) + (a.timedOut ? " (time up)" : "") }),
      el("td", { textContent: assists(a) }),
      el("td", {}, el("div", { className: "row-actions" },
        el("button", { className: "btn btn-ghost btn-sm", type: "button", textContent: "Retake", onclick: () => onRetake(a.testPath) }),
        el("button", { className: "btn btn-ghost btn-sm", type: "button", textContent: "Review", disabled: !a.answers || !a.qids, onclick: () => reviewAttempt(a) })))));

    const clearBtn = el("button", {
      className: "btn btn-ghost", type: "button", textContent: everyone ? "Clear all results" : "Clear my results",
      onclick: async () => {
        const ok = await confirmModal(everyone ? "Clear all results?" : "Clear your results?", "This can’t be undone.", { confirmLabel: "Clear", danger: true });
        if (ok) { clearAttempts(everyone ? null : session.username); draw(); }
      },
    });

    mount(root,
      el("h1", { textContent: "Reports" }),
      el("p", { className: "lede", textContent: everyone ? "All results" : "Your results" }),
      rows.length
        ? [
            el("section", { className: "panel" }, el("div", { className: "stats" },
              stat("Attempts", rows.length), stat("Average score", `${avg}%`), stat("Best score", `${best}%`),
              stat("Tests taken", new Set(rows.map((a) => a.testPath)).size))),
            el("section", { className: "panel table-wrap" }, el("table", {}, el("thead", {}, head), el("tbody", {}, ...body))),
            el("div", { className: "report-actions" }, clearBtn),
          ]
        : el("p", { className: "panel", textContent: "No results yet." }));
    window.scrollTo({ top: 0 });
  }

  draw();
  return [root];
}
