import { el, mount, richText } from "./util.js";
import { touchSession, specialsOf } from "./auth.js";
import { loadCatalog } from "./catalog.js";
import { openModal, alertModal, confirmModal } from "./modal.js";
import { icon } from "./icons.js";
import { renderToolbar, openFilterWindow } from "./filters.js";
import { getFavorites, toggleFavorite } from "./favorites.js";
import { openGenTest } from "./gentest.js";
import { listMyTests, saveMyTest, deleteMyTest } from "./mytests.js";
import { addAttempt, lastAttempt } from "./results.js";
import * as E from "./test-engine.js";

let run = null; // the test currently in progress (or just finished)

// The top menu is hidden while a test runs, to leave more room.
const setTesting = (on) => document.body.classList.toggle("testing", on);

function stop() {
  if (run) clearInterval(run.timer);
  run = null;
  window.onbeforeunload = null;
  setTesting(false);
}

/** Called by the dashboard before switching sections or signing out. */
export async function canLeave() {
  if (run && !run.finished) {
    const ok = await confirmModal("Leave this test?", "Your answers will be lost.", { confirmLabel: "Leave test", danger: true });
    if (!ok) return false;
  }
  stop();
  return true;
}

const heading = (title, lede) => [el("h1", { textContent: title }), lede ? el("p", { className: "lede", textContent: lede }) : null];

/** open: optionally jump straight to a test's dialog ({ path } or, for a generated test, { path, gen }). */
export function renderTests(ctx, open) {
  const root = el("div", { className: "test-root" });
  if (open?.path) openTest(root, ctx, open);
  else showCatalog(root, ctx);
  return [root];
}

async function openTest(root, ctx, { path, gen }) {
  let test = null;
  try {
    const tests = await loadCatalog(ctx.config);
    if (gen) {
      const built = E.buildGenTest(gen, tests);
      test = built.test.questions.length ? built.test : null;
    } else {
      test = tests.find((t) => t.path === path) ?? null;
    }
  } catch (err) {
    console.error(err);
  }
  await showCatalog(root, ctx);
  if (test) openIntro(root, ctx, test);
  else alertModal("Test unavailable", "This test is no longer available.");
}

// ================= Catalog =================
// Filters and the current view are kept while the page stays open.
const filters = { level: new Set(), course: new Set(), topic: new Set() };
let view = "all"; // "all" | "favorites" | "mytest"

async function showCatalog(root, ctx) {
  stop();
  mount(root, heading("Tests", "Pick a test to begin."), el("p", { className: "muted", textContent: "Loading tests…" }));
  let tests;
  try {
    tests = await loadCatalog(ctx.config);
  } catch (err) {
    mount(root, heading("Tests"), el("p", { className: "muted", textContent: "The list of tests could not be loaded." }));
    console.error(err);
    alertModal("Could not load tests", "Please try again later.");
    return;
  }
  if (!tests.length) {
    mount(root, heading("Tests"), el("p", { className: "panel", textContent: "No tests available." }));
    return;
  }

  const user = ctx.session.username;
  const barSlot = el("div");
  const gridSlot = el("div");
  mount(root, heading("Tests", "Pick a test to begin."), barSlot, gridSlot);

  async function generate() {
    const res = await openGenTest(tests, { initialCourse: filters.course.size === 1 ? [...filters.course][0] : undefined });
    if (!res) return;
    if (res.action === "save") {
      saveMyTest(user, { ...res.gen, createdAt: Date.now() });
      view = "mytest";
      draw();
    } else {
      openIntro(root, ctx, E.buildGenTest(res.gen, tests).test);
    }
  }

  function openMine(entry) {
    const { test, missing } = E.buildGenTest(entry, tests);
    if (!test.questions.length) { alertModal("Test unavailable", "The questions in this test are no longer available."); return; }
    if (missing) test.meta.info = `${missing} question${missing > 1 ? "s are" : " is"} no longer available and ${missing > 1 ? "were" : "was"} skipped.`;
    openIntro(root, ctx, test);
  }

  function draw(focusSelector) {
    const favs = getFavorites(user);
    const mine = listMyTests(user);
    const favTests = tests.filter((t) => favs.has(t.path)); // only favorites that still exist
    const pool = tests;
    const shown = view === "favorites" ? favTests : E.applyFilters(pool, filters);
    mount(barSlot, renderToolbar({
      filters, view, favCount: favTests.length, myCount: mine.length, shown: shown.length, total: tests.length,
      onOpenFilter: async () => { await openFilterWindow(pool, filters); draw(".js-filter-btn"); },
      onToggleFav: () => { view = view === "favorites" ? "all" : "favorites"; draw(); },
      onToggleMy: () => { view = view === "mytest" ? "all" : "mytest"; draw(); },
      onGen: generate,
      onChange: () => draw(),
    }));

    if (view === "mytest") {
      mount(gridSlot, mine.length
        ? el("div", { className: "cards" }, ...mine.map((entry) => myCard(entry, lastAttempt(user, `gen:${entry.id}`), () => openMine(entry), async () => {
            const ok = await confirmModal("Delete this test?", `“${entry.title}” will be removed from MyTest.`, { confirmLabel: "Delete", danger: true });
            if (ok) { deleteMyTest(user, entry.id); draw(); }
          })))
        : el("p", { className: "panel", textContent: "No saved tests yet. Use GenTest to create one." }));
    } else {
      mount(gridSlot, shown.length
        ? el("div", { className: "cards" }, ...shown.map((t) => card(t, lastAttempt(user, t.path), favs.has(t.path),
            () => openIntro(root, ctx, t),
            () => { toggleFavorite(user, t.path); draw(`.fav-btn[data-path="${CSS.escape(t.path)}"]`); })))
        : el("p", { className: "panel", textContent: view === "favorites" && !favTests.length ? "No favorites yet. Tap the star on a test to add it." : "No tests match." }));
    }
    if (focusSelector) root.querySelector(focusSelector)?.focus();
  }
  draw();
}

function card(t, last, fav, onOpen, onFav) {
  const where = [t.course, t.topic].filter(Boolean).map(E.facetLabel).join(" › ");
  const title = t.meta.title || t.path;
  return el("div", { className: "card-wrap" },
    el("button", { className: "card", type: "button", onclick: onOpen },
      el("span", { className: "card-tags" },
        t.level ? el("span", { className: `level-pill lv-${t.level}`, textContent: E.facetLabel(t.level) }) : null,
        el("span", { className: "card-folder" }, icon("file", { size: 16 }), where || "General")),
      el("span", { className: "card-title", textContent: title }),
      el("span", { className: "card-desc", textContent: t.meta.description || "" }),
      el("span", { className: "card-meta", textContent: [`${t.questions.length} questions`, t.meta.author].filter(Boolean).join(" · ") }),
      last ? el("span", { className: "card-last", textContent: `Last score ${last.percent}%` }) : null),
    el("button", {
      type: "button", className: `fav-btn${fav ? " on" : ""}`, dataset: { path: t.path }, "aria-pressed": String(fav),
      "aria-label": `${fav ? "Remove from" : "Add to"} favorites: ${title}`, onclick: onFav,
    }, icon(fav ? "star-filled" : "star", { size: 20 })));
}

// A saved generated test (MyTest)
function myCard(entry, last, onOpen, onDelete) {
  return el("div", { className: "card-wrap" },
    el("button", { className: "card", type: "button", onclick: onOpen },
      el("span", { className: "card-tags" },
        el("span", { className: "level-pill", textContent: "MyTest" }),
        el("span", { className: "card-folder" }, icon("wand", { size: 16 }), E.facetLabel(entry.course))),
      el("span", { className: "card-title", textContent: entry.title }),
      el("span", { className: "card-desc", textContent: E.compositionText(entry.items) }),
      el("span", { className: "card-meta", textContent: `${entry.items.length} questions · Saved ${new Date(entry.createdAt).toLocaleDateString()}` }),
      last ? el("span", { className: "card-last", textContent: `Last score ${last.percent}%` }) : null),
    el("button", { type: "button", className: "fav-btn del-btn", title: "Delete", "aria-label": `Delete ${entry.title}`, onclick: onDelete }, icon("trash", { size: 20 })));
}

// ================= Intro (modal) =================
async function openIntro(root, ctx, test) {
  const special = new Set(specialsOf(ctx.session, ctx.roles));
  const canConfigure = special.has("configure_test");
  const canWait = special.has("show_waiting");
  const opts = { pace: "normal", randomize: false, count: test.questions.length, wait: ctx.config.waitingTime?.default ?? 0 };
  const ok = await openModal({
    title: test.meta.title, wide: true, dismissValue: false,
    body: introBody(ctx, test, opts, canConfigure, canWait),
    actions: [{ label: "Cancel", value: false }, { label: "Start test", value: true, primary: true }],
  });
  if (!ok) return;
  const questions = canConfigure ? E.pickQuestions(test.questions, opts) : test.questions;
  startRun(root, ctx, { ...test, questions, source: test }, opts.pace, { wait: canWait ? opts.wait : 0 });
}

function introBody(ctx, test, opts, canConfigure, canWait) {
  const total = test.questions.length;
  const defaults = ctx.config.defaultTimeInSeconds;
  const timeEls = {};

  // Total time for each pace. A random subset has no fixed total until it is drawn, so it is shown as an estimate.
  function showTimes() {
    const exact = !opts.randomize || opts.count >= total;
    for (const p of E.PACES) {
      const secs = exact
        ? E.timeLimit({ questions: test.questions.slice(0, opts.count) }, p, defaults)
        : Math.round((E.timeLimit(test, p, defaults) * opts.count) / total);
      timeEls[p].textContent = `${exact ? "" : "≈ "}${E.fmtTime(secs)}`;
    }
  }

  const paces = el("fieldset", { className: "paces" }, el("legend", { textContent: "Choose your pace (total time)" }),
    ...E.PACES.map((p) => {
      timeEls[p] = el("span", { className: "muted" });
      return el("label", { className: "pace" },
        el("input", { type: "radio", name: "pace", value: p, checked: p === opts.pace, onchange: () => { opts.pace = p; } }),
        el("span", { className: "pace-name", textContent: p[0].toUpperCase() + p.slice(1) }),
        timeEls[p]);
    }));

  let options = null;
  if (canConfigure) { // special feature: configure_test
    const countInput = el("input", {
      type: "number", min: 1, max: total, value: total, "aria-label": "Number of questions",
      oninput: (e) => {
        const v = parseInt(e.target.value, 10);
        if (Number.isInteger(v)) { opts.count = Math.min(Math.max(v, 1), total); showTimes(); }
      },
      onchange: (e) => { e.target.value = String(opts.count); },
    });
    options = el("fieldset", { className: "config" }, el("legend", { textContent: "Test options" }),
      el("label", { className: "check-row" },
        el("input", { type: "checkbox", onchange: (e) => { opts.randomize = e.target.checked; showTimes(); } }),
        icon("shuffle", { size: 16 }), "Randomize questions"),
      el("label", { className: "count-row" }, el("span", { textContent: "Number of questions" }), countInput, el("span", { className: "muted", textContent: `of ${total}` })));
  }

  let waitBox = null;
  if (canWait) { // special feature: show_waiting
    const max = ctx.config.waitingTime?.max ?? 30;
    opts.wait = Math.min(Math.max(Math.floor(opts.wait) || 0, 0), max);
    waitBox = el("fieldset", { className: "config" }, el("legend", { textContent: "Waiting time" }),
      el("label", { className: "count-row" },
        el("span", { textContent: "Pause after Next (seconds)" }),
        el("input", {
          type: "number", min: 0, max, value: opts.wait, "aria-label": "Waiting time in seconds",
          oninput: (e) => { const v = parseInt(e.target.value, 10); if (Number.isInteger(v)) opts.wait = Math.min(Math.max(v, 0), max); },
          onchange: (e) => { e.target.value = String(opts.wait); },
        }),
        el("span", { className: "muted", textContent: "0 = off" })));
  }

  showTimes();
  return el("div", {},
    test.meta.description ? el("p", { textContent: test.meta.description }) : null,
    test.meta.info ? richText(test.meta.info, "p", "muted") : null,
    el("ul", { className: "facts" },
      el("li", { textContent: `${total} questions` }),
      test.meta.author ? el("li", { textContent: `By ${test.meta.author}` }) : null),
    options,
    waitBox,
    paces);
}

// ================= Runner =================
function startRun(root, ctx, test, pace, settings = {}) {
  stop();
  setTesting(true);
  const n = test.questions.length;
  const special = new Set(specialsOf(ctx.session, ctx.roles)); // show_answer, show_explanation, timer_disabler
  const limitMs = E.timeLimit(test, pace, ctx.config.defaultTimeInSeconds) * 1000;
  // special feature show_waiting: a pause (with an animation) after Next, set in the start dialog
  const waitMax = ctx.config.waitingTime?.max ?? 30;
  const waitSeconds = special.has("show_waiting") ? Math.min(Math.max(Math.floor(settings.wait) || 0, 0), waitMax) : 0;
  const r = (run = {
    answers: {}, flagged: new Set(), index: 0, finished: false,
    reveal: false,          // is the correct answer currently shown for this question?
    peeks: new Set(),       // questions whose answer was shown
    explained: new Set(),   // questions whose explanation was opened
    remainingMs: limitMs, activeMs: 0, last: Date.now(),
    paused: false, timerOn: true, usedPause: false, usedTimerOff: false, waiting: false,
    hideWrong: false,       // correction questions: hide the wrong parts while the answer is shown
  });
  window.onbeforeunload = (e) => { e.preventDefault(); e.returnValue = ""; };

  const timerEl = el("span", { className: "timer", role: "timer" });
  const progress = el("span", { className: "muted" });
  const qArea = el("section", { className: "q-card" });
  const palette = el("div", { className: "palette" });
  const side = el("aside", { className: "side" }, el("h2", { textContent: "Questions" }), palette,
    el("p", { className: "muted legend", textContent: "Filled = answered · dot = flagged" }));
  const runner = el("div", { className: "runner" }, qArea, side);
  const canControlTimer = special.has("timer_disabler");
  const pauseBtn = canControlTimer
    ? el("button", { type: "button", className: "btn btn-ghost btn-sm", textContent: "Pause", onclick: () => setPaused(!r.paused) })
    : null;
  const timerBtn = canControlTimer
    ? el("button", { type: "button", className: "btn btn-ghost btn-sm", textContent: "Disable timer", onclick: () => setTimerOn(!r.timerOn) })
    : null;

  pauseBtn?.prepend(icon("pause", { size: 15 }));
  const cancelBtn = el("button", {
    className: "btn btn-ghost btn-sm", type: "button",
    onclick: async () => {
      const ok = await confirmModal("Cancel this test?", "Your answers will be lost.", { confirmLabel: "Cancel test", cancelLabel: "Keep going", danger: true });
      if (ok && !r.finished) { stop(); showCatalog(root, ctx); }
    },
  }, icon("close", { size: 15 }), "Cancel");
  mount(root,
    el("div", { className: "runner-bar" },
      el("strong", { textContent: test.meta.title }), progress, el("span", { className: "timer-wrap" }, icon("clock", { size: 20 }), timerEl), pauseBtn, timerBtn, cancelBtn,
      el("button", { className: "btn", type: "button", textContent: "Submit", onclick: () => submit() })),
    runner);

  // Work time counts while not paused; the countdown only runs while the timer is on.
  function account() {
    const now = Date.now(), delta = now - r.last;
    r.last = now;
    if (r.paused || r.waiting) return; // pauses and waits are not work time
    r.activeMs += delta;
    if (r.timerOn) r.remainingMs -= delta;
  }

  function drawTimer() {
    const left = Math.max(0, Math.ceil(r.remainingMs / 1000));
    timerEl.textContent = r.paused ? `Paused${r.timerOn ? ` · ${E.fmtTime(left)}` : ""}` : r.timerOn ? E.fmtTime(left) : "Timer off";
    timerEl.classList.toggle("low", r.timerOn && !r.paused && left <= 60);
  }

  function tick() {
    touchSession(ctx.config); // an active test keeps the login alive
    account();
    drawTimer();
    if (r.timerOn && !r.paused && !r.waiting && r.remainingMs <= 0) finish(true);
  }

  function setPaused(v) {
    account();
    r.paused = v;
    if (v) r.usedPause = true;
    mount(pauseBtn, icon(v ? "play" : "pause", { size: 15 }), v ? "Resume" : "Pause");
    runner.classList.toggle("paused", v);
    qArea.inert = v;
    side.inert = v;
    drawTimer();
  }

  function setTimerOn(v) {
    account();
    r.timerOn = v;
    if (!v) r.usedTimerOff = true;
    timerBtn.textContent = v ? "Disable timer" : "Enable timer";
    drawTimer();
  }

  // Next: with a waiting time, show the waiting dialog first. The test timer stands still meanwhile.
  async function goNext(target) {
    if (!waitSeconds) { go(target); return; }
    account();
    r.waiting = true;
    await openWaitModal(waitSeconds);
    r.last = Date.now();
    r.waiting = false;
    if (!r.finished) go(target);
  }

  function go(i) {
    r.index = i;
    r.reveal = false; // a peek only lasts while you stay on the question
    r.hideWrong = false;
    drawQuestion();
    drawPalette();
    window.scrollTo({ top: 0 });
  }

  function drawPalette() {
    let answered = 0;
    palette.replaceChildren(...test.questions.map((q, i) => {
      const done = E.isAnswered(q, r.answers[i]);
      if (done) answered++;
      const flagged = r.flagged.has(i);
      const b = el("button", {
        type: "button", textContent: String(i + 1), onclick: () => go(i),
        className: `pal${done ? " done" : ""}${flagged ? " flag" : ""}`,
        "aria-label": `Question ${i + 1}${done ? ", answered" : ""}${flagged ? ", flagged" : ""}`,
      });
      if (i === r.index) b.setAttribute("aria-current", "step");
      return b;
    }));
    progress.textContent = `${answered}/${n} answered`;
  }

  function drawQuestion() {
    const i = r.index, q = test.questions[i], d = q.data || {};
    const flagBtn = el("button", {
      type: "button", className: "chip-btn", textContent: "Flag for review", "aria-pressed": String(r.flagged.has(i)),
      onclick: () => {
        if (r.flagged.has(i)) r.flagged.delete(i); else r.flagged.add(i);
        flagBtn.setAttribute("aria-pressed", String(r.flagged.has(i)));
        drawPalette();
      },
    });
    flagBtn.prepend(icon("flag", { size: 15 }));
    const answerBtn = special.has("show_answer")
      ? el("button", {
          type: "button", className: "chip-btn js-reveal", textContent: r.reveal ? "Hide answer" : "Show answer",
          onclick: () => {
            r.reveal = !r.reveal;
            if (r.reveal) r.peeks.add(i); else r.hideWrong = false;
            drawQuestion();
            qArea.querySelector(".js-reveal")?.focus();
          },
        })
      : null;
    answerBtn?.prepend(icon("eye", { size: 15 }));
    const explainBtn = special.has("show_explanation") && E.hasExplanation(q)
      ? el("button", {
          type: "button", className: "chip-btn", textContent: "Explanation",
          onclick: () => {
            r.explained.add(i);
            openModal({ title: `Question ${i + 1}: explanation`, body: explanationNode(q.explanation), wide: true, actions: [{ label: "Close", primary: true }] });
          },
        })
      : null;

    explainBtn?.prepend(icon("book", { size: 15 }));
    mount(qArea,
      el("div", { className: "q-head" },
        el("span", { className: "q-num", textContent: `Question ${i + 1} of ${n}` }),
        q.config?.level ? el("span", { className: "badge", textContent: `Level ${q.config.level}` }) : null,
        el("span", { className: "badge badge-soft", textContent: q.type === "correction" ? "Error correction" : "Multiple choice" }),
        flagBtn, answerBtn, explainBtn),
      d.hint ? el("p", { className: "hint-box", textContent: d.hint }) : null,
      image(d.image),
      d.passage ? richText(d.passage, "div", "passage") : null,
      d.question ? richText(d.question, "h2", "q-text") : null,
      q.type === "correction" ? correctionInput(q, i) : mcInput(q, i),
      r.reveal
        ? el("div", { className: "answer-box", role: "status" }, el("strong", { textContent: "Correct answer: " }), E.correctAnswerText(q))
        : null,
      el("div", { className: "q-nav" },
        el("button", { className: "btn btn-ghost", type: "button", textContent: "← Previous", disabled: i === 0, onclick: () => go(i - 1) }),
        i < n - 1
          ? el("button", { className: "btn", type: "button", textContent: "Next →", onclick: () => goNext(i + 1) })
          : el("button", { className: "btn", type: "button", textContent: "Finish test", onclick: () => submit() })));
  }

  function mcInput(q, i) {
    const opts = E.optionList(q), need = E.correctKeys(q).length, multi = need > 1;
    const a = (r.answers[i] ??= { selected: [] });
    const rows = opts.map((o) => {
      const tag = el("span", { className: "opt-tag" });
      const input = el("input", {
        type: multi ? "checkbox" : "radio", name: `q${i}`, value: o.key, checked: a.selected.includes(o.key),
        onchange: (e) => {
          a.selected = multi ? (e.target.checked ? [...a.selected, o.key] : a.selected.filter((k) => k !== o.key)) : [o.key];
          drawPalette();
          paint();
        },
      });
      const label = el("label", { className: "opt" }, input, el("span", { className: "opt-key", textContent: o.key }), richText(o.text, "span", "opt-text"), tag);
      return { o, label, tag };
    });

    // While the answer is shown: correct options are green and a wrong choice is red (updates as you change your choice).
    function paint() {
      const chosen = new Set(a.selected);
      for (const { o, label, tag } of rows) {
        const state = !r.reveal ? "" : o.correct ? "reveal-correct" : chosen.has(o.key) ? "reveal-wrong" : "";
        label.className = `opt${state ? ` ${state}` : ""}`;
        tag.className = `opt-tag${state === "reveal-wrong" ? " bad" : ""}`;
        tag.textContent = state === "reveal-correct" ? "✓ Correct" : state === "reveal-wrong" ? "✗ Incorrect" : "";
      }
    }
    paint();

    return el("div", {},
      multi ? el("p", { className: "multi-note", textContent: `Select ${need} answers.` }) : null,
      el("div", { className: "opts", role: multi ? "group" : "radiogroup" }, ...rows.map((x) => x.label)));
  }

  function correctionInput(q, i) {
    const a = (r.answers[i] ??= { noError: false, fixes: {} });
    const segs = q.multiErrorSegments || [];
    const sentence = el("p", { className: "sentence" });
    const fixes = el("div", { className: "fixes" });
    // With the answer shown, this hides the wrong parts so the corrected sentence can be read straight through.
    const hasErrors = E.errorSegments(q).length > 0;
    const hideBtn = el("button", { type: "button", className: "chip-btn", onclick: () => { r.hideWrong = !r.hideWrong; refresh(); } });
    const tools = el("div", { className: "sentence-tools" }, hideBtn);
    const noErr = el("button", {
      type: "button", className: `chip-btn${r.reveal && !E.errorSegments(q).length ? " chip-correct" : ""}`, textContent: "No error",
      onclick: () => { a.noError = !a.noError; if (a.noError) a.fixes = {}; refresh(); },
    });
    let focusId = null;

    function toggle(s) {
      if (s.id in a.fixes) delete a.fixes[s.id];
      else { a.fixes[s.id] = ""; a.noError = false; focusId = s.id; }
      refresh();
    }

    // One text box per marked part. While the answer is shown it is green when the fix is right and red when it is not.
    function fixField(s) {
      const input = el("input", {
        type: "text", value: a.fixes[s.id], placeholder: "Type the correct form", autocomplete: "off",
        oninput: (e) => { a.fixes[s.id] = e.target.value; paint(); },
      });
      const status = el("span", { className: "fix-status" });
      const wrap = el("span", { className: "fix-input" }, input, status);
      const hint = el("span", { className: "fix-hint" });
      function paint() {
        wrap.classList.remove("ok", "bad");
        status.replaceChildren();
        hint.textContent = "";
        input.removeAttribute("aria-invalid");
        if (!r.reveal) return;
        const right = !!s.isError && (s.correctAnswers || []).some((c) => E.norm(c) === E.norm(a.fixes[s.id]));
        wrap.classList.add(right ? "ok" : "bad");
        status.append(icon(right ? "tick" : "close", { size: 18 }));
        if (!right) {
          input.setAttribute("aria-invalid", "true");
          hint.textContent = s.isError ? `Expected: ${(s.correctAnswers || []).join(" / ")}` : "This part has no error.";
        }
      }
      paint();
      if (s.id === focusId) queueMicrotask(() => input.focus());
      return el("label", { className: "fix" }, el("span", { textContent: `Replace “${s.text}” with:` }), wrap, hint);
    }

    function refresh() {
      // While the answer is shown: segments that need a fix are marked and followed by the correct text; the rest get a check.
      tools.hidden = !(r.reveal && hasErrors);
      hideBtn.setAttribute("aria-pressed", String(r.hideWrong));
      mount(hideBtn, icon(r.hideWrong ? "eye" : "eye-off", { size: 15 }), r.hideWrong ? "Show wrong parts" : "Hide wrong parts");
      mount(sentence, segs.flatMap((s) => {
        if (!s.clickable) return [el("span", { textContent: s.text }), " "];
        const state = r.reveal ? (s.isError ? " need-fix" : " is-ok") : "";
        const answers = s.correctAnswers || [];
        const hideThis = r.reveal && r.hideWrong && !!s.isError;
        return [
          el("button", { type: "button", className: `seg${state}`, textContent: s.text, hidden: hideThis, "aria-pressed": String(s.id in a.fixes), onclick: () => toggle(s) }),
          r.reveal && s.isError
            ? el("span", { className: "seg-fix", textContent: r.hideWrong ? answers[0] ?? "" : `→ ${answers.join(" / ")}`, title: r.hideWrong && answers.length > 1 ? answers.join(" / ") : "" })
            : null,
          " ",
        ];
      }));
      noErr.setAttribute("aria-pressed", String(a.noError));
      const marked = segs.filter((s) => s.id in a.fixes);
      mount(fixes, marked.length
        ? marked.map(fixField)
        : el("p", { className: "muted", textContent: a.noError ? "You chose “No error”." : "Click the parts that contain an error, or choose “No error”." }));
      focusId = null;
      drawPalette();
    }

    refresh();
    return el("div", {}, sentence, tools, fixes, noErr);
  }

  async function submit() {
    const left = test.questions.filter((q, i) => !E.isAnswered(q, r.answers[i])).length;
    const warning = "You can’t change your answers after submitting.";
    const ok = await confirmModal(
      left ? "Submit with unanswered questions?" : "Submit your answers?",
      left ? `${left} question${left > 1 ? "s are" : " is"} unanswered. ${warning}` : warning,
      { confirmLabel: "Submit" });
    if (ok) finish(false);
  }

  function finish(timedOut) {
    if (r.finished) return;
    r.finished = true;
    clearInterval(r.timer);
    setTesting(false);
    window.onbeforeunload = null;
    document.querySelectorAll("dialog.modal[open]").forEach((d) => d.close()); // e.g. an open confirm or explanation
    account();
    r.spent = r.activeMs; // time actually worked (pauses excluded)
    const sum = E.summarize(test, r.answers);
    addAttempt({
      ts: Date.now(), username: ctx.session.username, name: ctx.session.name,
      testPath: test.path, testTitle: test.meta.title, pace,
      percent: sum.percent, correct: sum.correct, incorrect: sum.incorrect, unanswered: sum.unanswered, total: sum.total,
      seconds: Math.round(r.spent / 1000), timedOut, peeks: r.peeks.size, explained: r.explained.size,
      paused: r.usedPause, timerOff: r.usedTimerOff,
      gen: test.gen, // lets Reports reopen a generated test even if it was never saved
      qids: test.questions.map((q) => q.id), // lets Reports check the test is unchanged before a review
      answers: Object.fromEntries(Object.entries(r.answers).filter(([i, a]) => E.isAnswered(test.questions[i], a))),
    });
    window.scrollTo({ top: 0 });
    showResults(root, ctx, test, { title: "Results", answers: r.answers, sum, spentMs: r.spent, peeks: r.peeks.size, explained: r.explained.size }, timedOut);
  }

  r.timer = setInterval(tick, 1000);
  tick();
  drawQuestion();
  drawPalette();
}

function openWaitModal(seconds) {
  const left = el("strong", { textContent: String(seconds) });
  const bar = el("span", { className: "wait-bar" });
  bar.style.setProperty("--dur", `${seconds}s`);
  let remaining = seconds;
  const timer = setInterval(() => { remaining -= 1; left.textContent = String(Math.max(remaining, 0)); }, 1000);
  const body = el("div", { className: "wait" },
    el("div", { className: "wait-spinner", "aria-hidden": "true" }),
    el("p", { className: "wait-text", role: "status" }, "Next question in ", left, " s"),
    el("div", { className: "wait-track" }, bar));
  return openModal({ title: "Please wait", body, persistent: true, autoCloseMs: seconds * 1000 }).finally(() => clearInterval(timer));
}

function image(img) {
  if (!img?.url) return null;
  const o = ["landscape", "portrait", "square"].includes(img.orientation) ? img.orientation : "landscape";
  const node = el("img", { className: `q-img ${o}`, src: img.url, alt: "Illustration for the question", loading: "lazy" });
  node.addEventListener("error", () => node.remove()); // broken or placeholder URLs just disappear
  return node;
}

// Shared by the explanation modal (during a test) and the results review.
function explanationNode(ex) {
  return el("div", { className: "explain" },
    ex.topic || ex.concept ? el("p", { className: "muted", textContent: [ex.topic, ex.concept].filter(Boolean).join(" · ") }) : null,
    ex.text ? richText(ex.text, "p") : null,
    ex.formula ? el("p", { className: "formula", textContent: ex.formula }) : null,
    ex.examples?.length ? el("ul", {}, ...ex.examples.map((x) => richText(x, "li"))) : null);
}

// ================= Results & review =================
// d: { title, answers, sum, spentMs, peeks, explained }
function resultsNodes(test, d, actions) {
  const { sum } = d;
  let active = null; // Correct / Incorrect / Unanswered tiles filter the review list below
  const ring = el("div", { className: "ring", role: "img", "aria-label": `${sum.percent} percent` }, el("span", { textContent: `${sum.percent}%` }));
  ring.style.setProperty("--p", sum.percent);

  const tiles = {};
  const tile = (status, label, cls) => (tiles[status] = el("button", {
    type: "button", className: `stat stat-btn ${cls}`, "aria-pressed": "false", title: `Show ${label.toLowerCase()} questions`,
    onclick: () => { active = active === status ? null : status; draw(); },
  }, el("strong", { textContent: String(sum[status]) }), el("span", { textContent: label })));
  const timeTile = el("div", { className: "stat" }, el("strong", { textContent: E.fmtTime(d.spentMs / 1000) }), el("span", { textContent: "Time used" }));

  const countEl = el("span", { className: "muted" });
  const showAll = el("button", { type: "button", className: "link-btn", textContent: "Show all", onclick: () => { active = null; draw(); } });
  const listSlot = el("div");

  function draw() {
    Object.entries(tiles).forEach(([status, btn]) => btn.setAttribute("aria-pressed", String(active === status)));
    const idx = test.questions.map((q, i) => i).filter((i) => !active || sum.statuses[i] === active);
    countEl.textContent = active ? `${idx.length} of ${sum.total} questions` : `${sum.total} questions`;
    showAll.hidden = !active;
    mount(listSlot, idx.length
      ? idx.map((i) => reviewItem(test, test.questions[i], i, d.answers[i], sum.statuses[i]))
      : el("p", { className: "panel muted", textContent: "No questions in this group." }));
  }

  const nodes = [
    ...heading(d.title, test.meta.title),
    el("section", { className: "panel summary" }, ring,
      el("div", { className: "stats" }, tile("correct", "Correct", "ok"), tile("incorrect", "Incorrect", "bad"), tile("unanswered", "Unanswered", ""), timeTile)),
    d.peeks || d.explained
      ? el("p", { className: "muted", textContent: `Assists used: answer shown on ${d.peeks} question(s), explanation opened on ${d.explained}.` })
      : null,
    sum.topics.length
      ? el("section", { className: "panel" }, el("h2", { textContent: "Topics to review" }),
          el("ul", { className: "chips" }, ...sum.topics.map((t) => el("li", { textContent: t }))))
      : null,
    el("div", { className: "review-head" }, el("h2", { textContent: "Review" }), countEl, showAll),
    listSlot,
    el("div", { className: "q-nav" }, ...actions),
  ];
  draw();
  return nodes;
}

function showResults(root, ctx, test, d, timedOut) {
  mount(root, resultsNodes(test, d, [
    el("button", { className: "btn btn-ghost", type: "button", textContent: "All tests", onclick: () => showCatalog(root, ctx) }),
    el("button", { className: "btn", type: "button", textContent: "Retake", onclick: () => openIntro(root, ctx, test.source ?? test) }),
  ]));
  if (timedOut) alertModal("Time’s up", "Your answers were submitted automatically.");
}

/** Review a saved attempt (used by Reports). */
export function showReview(root, test, attempt, { onBack, onRetake }) {
  const answers = attempt.answers || {};
  mount(root, resultsNodes(test, {
    title: "Review", answers, sum: E.summarize(test, answers),
    spentMs: (attempt.seconds || 0) * 1000, peeks: attempt.peeks || 0, explained: attempt.explained || 0,
  }, [
    el("button", { className: "btn btn-ghost", type: "button", textContent: "Back", onclick: onBack }),
    el("button", { className: "btn", type: "button", textContent: "Retake", onclick: onRetake }),
  ]));
  window.scrollTo({ top: 0 });
}

function reviewItem(test, q, i, a, status) {
  const f = E.flags(test, q);
  const row = (label, text) => el("p", { className: "review-row" }, el("strong", { textContent: `${label} ` }), text);
  return el("details", { className: `review ${status}`, open: status !== "correct" },
    el("summary", {},
      el("span", { className: "mark", textContent: { correct: "✓", incorrect: "✗", unanswered: "–" }[status], "aria-label": status }),
      el("span", { textContent: `${i + 1}. ${E.questionTitle(q)}` })),
    el("div", { className: "review-body" },
      row("Your answer:", E.userAnswerText(q, a)),
      f.showAnswer ? row("Correct answer:", E.correctAnswerText(q)) : null,
      f.showExplanation && E.hasExplanation(q) ? explanationNode(q.explanation) : null));
}
