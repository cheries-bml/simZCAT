// Home page (the logo): welcome, START TEST, newest tests, latest attempts, motivation cards.
import { el, mount } from "./util.js";
import { can, permissionsOf, specialsOf, roleLabel } from "./auth.js";
import { loadCatalog } from "./catalog.js";
import { listAttempts } from "./results.js";
import { icon } from "./icons.js";
import { openReview } from "./review.js";
import { newestTests, pickQuotes, greeting, crumb } from "./test-engine.js";

const when = (ts) => new Date(ts).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
const pctClass = (p) => (p >= 70 ? "pct pct-high" : p >= 50 ? "pct pct-mid" : "pct pct-low");
const QUOTE_ICONS = ["bulb", "target", "trend"];

const panel = (iconName, title, list) =>
  el("section", { className: "panel list-card" }, el("h2", {}, icon(iconName, { size: 20 }), title), list);

export function renderHome({ config, session, roles, go }) {
  const canTest = can(session, roles, "test.view");
  const first = session.name.split(" ")[0];

  // Newest tests (filled in once the catalog has loaded)
  const newestList = el("ul", { className: "mini-list" }, el("li", { className: "muted", textContent: "Loading…" }));
  if (canTest) {
    loadCatalog(config)
      .then((tests) => {
        const top = newestTests(tests, 3);
        mount(newestList, top.length
          ? top.map((t) => el("li", {},
              el("button", { className: "mini-item", type: "button", onclick: () => go("test", { path: t.path }) },
                el("span", { className: "mini-icon" }, icon("file", { size: 20 })),
                el("span", { className: "mini-main" },
                  el("span", { className: "mini-title", textContent: t.meta.title || t.path }),
                  el("span", { className: "mini-sub", textContent: [crumb(t), `${t.questions.length} questions`].filter(Boolean).join(" · ") })),
                icon("chevron", { size: 20 }))))
          : el("li", { className: "muted", textContent: "No questions yet." }));
      })
      .catch((err) => {
        console.error(err);
        mount(newestList, el("li", { className: "muted", textContent: "Unavailable." }));
      });
  }

  // Latest attempts by this user, each with Retake and Review
  const latest = canTest ? listAttempts({ username: session.username }).slice(0, 3) : [];
  const latestList = el("ul", { className: "mini-list" }, ...(latest.length
    ? latest.map((a) => el("li", { className: "mini-item has-actions" },
        el("span", { className: "mini-icon" }, icon("check", { size: 20 })),
        el("span", { className: "mini-main" },
          el("span", { className: "mini-title", textContent: a.testTitle }),
          el("span", { className: "mini-sub", textContent: when(a.ts) })),
        el("span", { className: pctClass(a.percent), textContent: `${a.percent}%` }),
        el("span", { className: "mini-actions" },
          el("button", { className: "btn btn-ghost btn-sm", type: "button", onclick: () => go("test", { path: a.testPath, gen: a.gen }) }, icon("replay", { size: 15 }), "Retake"),
          el("button", {
            className: "btn btn-ghost btn-sm", type: "button", disabled: !a.answers || !a.qids,
            onclick: () => openReview({ root, config, attempt: a, onBack: draw, onRetake: () => go("test", { path: a.testPath, gen: a.gen }) }),
          }, icon("eye", { size: 15 }), "Review"))))
    : [el("li", { className: "muted", textContent: "No tests taken yet." })]));

  const quotes = pickQuotes(config.motivation, 3);
  const special = specialsOf(session, roles);

  const root = el("div", { className: "home" });
  const draw = () => mount(root,
    el("section", { className: "hero" },
      el("div", {},
        el("h1", { textContent: `${greeting(new Date().getHours())}, ${first}` }),
        el("p", { textContent: "Ready for some practice? Pick up where you left off or try something new." })),
      canTest
        ? el("button", { className: "btn btn-lg btn-hero", type: "button", onclick: () => go("test") }, icon("play", { size: 22 }), "Start test")
        : null),

    canTest
      ? el("div", { className: "home-grid" }, panel("star", "Newest questions", newestList), panel("history", "Latest tests taken", latestList))
      : null,

    quotes.length
      ? el("div", { className: "quotes" }, ...quotes.map((q, i) =>
          el("figure", { className: "quote-card" },
            el("span", { className: "quote-icon" }, icon(QUOTE_ICONS[i % QUOTE_ICONS.length], { size: 22 })),
            el("p", { textContent: q }))))
      : null,

    el("details", { className: "panel" },
      el("summary", { textContent: "Your access" }),
      el("p", { className: "muted", textContent: `Signed in as ${session.roles.map((k) => roleLabel(roles, k)).join(", ")}.` }),
      el("ul", { className: "chips" }, ...permissionsOf(session, roles).map((p) => el("li", { textContent: p }))),
      special.length ? el("ul", { className: "chips" }, ...special.map((f) => el("li", { textContent: f }))) : null));
  draw();
  return [root];
}
