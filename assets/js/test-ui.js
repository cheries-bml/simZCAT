import { el, mount, richText } from "./util.js";
import { touchSession, specialsOf } from "./auth.js";
import { loadCatalog } from "./catalog.js";
import { openModal, alertModal, confirmModal } from "./modal.js";
import { addAttempt, lastAttempt } from "./results.js";
import * as E from "./test-engine.js";

let run = null; // the test currently in progress (or just finished)

function stop() {
  if (run) clearInterval(run.timer);
  run = null;
  window.onbeforeunload = null;
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

/** openPath: optionally jump straight to a test's intro page (used by Reports > Retake). */
export function renderTests(ctx, openPath) {
  const root = el("div", { className: "test-root" });
  if (openPath) openTest(root, ctx, openPath);
  else showCatalog(root, ctx);
  return [root];
}

async function openTest(root, ctx, path) {
  let test = null;
  try {
    test = (await loadCatalog(ctx.config)).find((t) => t.path === path) ?? null;
  } catch (err) {
    console.error(err);
  }
  await showCatalog(root, ctx);
  if (test) openIntro(root, ctx, test);
  else alertModal("Test unavailable", "This test is no longer available.");
}

// ================= Catalog =================
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
  mount(root, heading("Tests", "Pick a test to begin."),
    tests.length
      ? el("div", { className: "cards" }, ...tests.map((t) => card(t, lastAttempt(ctx.session.username, t.path), () => openIntro(root, ctx, t))))
      : el("p", { className: "panel", textContent: "No tests available." }));
}

function card(t, last, onOpen) {
  return el("button", { className: "card", type: "button", onclick: onOpen },
    el("span", { className: "card-folder", textContent: t.folder || "General" }),
    el("span", { className: "card-title", textContent: t.meta.title || t.path }),
    el("span", { className: "card-desc", textContent: t.meta.description || "" }),
    el("span", { className: "card-meta", textContent: [`${t.questions.length} questions`, t.meta.author].filter(Boolean).join(" · ") }),
    last ? el("span", { className: "card-last", textContent: `Last score ${last.percent}%` }) : null);
}

// ================= Intro (modal) =================
async function openIntro(root, ctx, test) {
  let pace = "normal";
  const ok = await openModal({
    title: test.meta.title, wide: true, dismissValue: false,
    body: introBody(ctx, test, (p) => { pace = p; }),
    actions: [{ label: "Cancel", value: false }, { label: "Start test", value: true, primary: true }],
  });
  if (ok) startRun(root, ctx, test, pace);
}

function introBody(ctx, test, onPace) {
  return el("div", {},
    test.meta.description ? el("p", { textContent: test.meta.description }) : null,
    test.meta.info ? richText(test.meta.info, "p", "muted") : null,
    el("ul", { className: "facts" },
      el("li", { textContent: `${test.questions.length} questions` }),
      test.meta.author ? el("li", { textContent: `By ${test.meta.author}` }) : null),
    el("fieldset", { className: "paces" }, el("legend", { textContent: "Choose your pace (total time)" }),
      ...E.PACES.map((p) => el("label", { className: "pace" },
        el("input", { type: "radio", name: "pace", value: p, checked: p === "normal", onchange: () => onPace(p) }),
        el("span", { className: "pace-name", textContent: p[0].toUpperCase() + p.slice(1) }),
        el("span", { className: "muted", textContent: E.fmtTime(E.timeLimit(test, p, ctx.config.defaultTimeInSeconds)) })))));
}

// ================= Runner =================
function startRun(root, ctx, test, pace) {
  stop();
  const n = test.questions.length;
  const special = new Set(specialsOf(ctx.session, ctx.roles)); // show_answer, show_explanation, timer_disabler
  const limitMs = E.timeLimit(test, pace, ctx.config.defaultTimeInSeconds) * 1000;
  const r = (run = {
    answers: {}, flagged: new Set(), index: 0, finished: false,
    reveal: false,          // is the correct answer currently shown for this question?
    peeks: new Set(),       // questions whose answer was shown
    explained: new Set(),   // questions whose explanation was opened
    remainingMs: limitMs, activeMs: 0, last: Date.now(),
    paused: false, timerOn: true, usedPause: false, usedTimerOff: false,
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

  mount(root,
    el("div", { className: "runner-bar" },
      el("strong", { textContent: test.meta.title }), progress, timerEl, pauseBtn, timerBtn,
      el("button", { className: "btn", type: "button", textContent: "Submit", onclick: () => submit() })),
    runner);

  // Work time counts while not paused; the countdown only runs while the timer is on.
  function account() {
    const now = Date.now(), delta = now - r.last;
    r.last = now;
    if (r.paused) return;
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
    if (r.timerOn && !r.paused && r.remainingMs <= 0) finish(true);
  }

  function setPaused(v) {
    account();
    r.paused = v;
    if (v) r.usedPause = true;
    pauseBtn.textContent = v ? "Resume" : "Pause";
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

  function go(i) {
    r.index = i;
    r.reveal = false; // a peek only lasts while you stay on the question
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
      type: "button", className: "chip-btn", textContent: "⚑ Flag for review", "aria-pressed": String(r.flagged.has(i)),
      onclick: () => {
        if (r.flagged.has(i)) r.flagged.delete(i); else r.flagged.add(i);
        flagBtn.setAttribute("aria-pressed", String(r.flagged.has(i)));
        drawPalette();
      },
    });
    const answerBtn = special.has("show_answer")
      ? el("button", {
          type: "button", className: "chip-btn js-reveal", textContent: r.reveal ? "Hide answer" : "Show answer",
          onclick: () => {
            r.reveal = !r.reveal;
            if (r.reveal) r.peeks.add(i);
            drawQuestion();
            qArea.querySelector(".js-reveal")?.focus();
          },
        })
      : null;
    const explainBtn = special.has("show_explanation") && E.hasExplanation(q)
      ? el("button", {
          type: "button", className: "chip-btn", textContent: "Explanation",
          onclick: () => {
            r.explained.add(i);
            openModal({ title: `Question ${i + 1}: explanation`, body: explanationNode(q.explanation), wide: true, actions: [{ label: "Close", primary: true }] });
          },
        })
      : null;

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
          ? el("button", { className: "btn", type: "button", textContent: "Next →", onclick: () => go(i + 1) })
          : el("button", { className: "btn", type: "button", textContent: "Finish test", onclick: () => submit() })));
  }

  function mcInput(q, i) {
    const opts = E.optionList(q), need = E.correctKeys(q).length, multi = need > 1;
    const a = (r.answers[i] ??= { selected: [] });
    return el("div", {},
      multi ? el("p", { className: "multi-note", textContent: `Select ${need} answers.` }) : null,
      el("div", { className: "opts", role: multi ? "group" : "radiogroup" },
        ...opts.map((o) => el("label", { className: `opt${r.reveal && o.correct ? " reveal-correct" : ""}` },
          el("input", {
            type: multi ? "checkbox" : "radio", name: `q${i}`, value: o.key, checked: a.selected.includes(o.key),
            onchange: (e) => {
              a.selected = multi ? (e.target.checked ? [...a.selected, o.key] : a.selected.filter((k) => k !== o.key)) : [o.key];
              drawPalette();
            },
          }),
          el("span", { className: "opt-key", textContent: o.key }),
          richText(o.text, "span", "opt-text"),
          r.reveal && o.correct ? el("span", { className: "opt-tag", textContent: "Correct" }) : null))));
  }

  function correctionInput(q, i) {
    const a = (r.answers[i] ??= { noError: false, fixes: {} });
    const segs = q.multiErrorSegments || [];
    const sentence = el("p", { className: "sentence" });
    const fixes = el("div", { className: "fixes" });
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

    function refresh() {
      // While the answer is shown: segments that need a fix are marked and followed by the correct text; the rest get a check.
      mount(sentence, segs.flatMap((s) => {
        if (!s.clickable) return [el("span", { textContent: s.text }), " "];
        const state = r.reveal ? (s.isError ? " need-fix" : " is-ok") : "";
        return [
          el("button", { type: "button", className: `seg${state}`, textContent: s.text, "aria-pressed": String(s.id in a.fixes), onclick: () => toggle(s) }),
          r.reveal && s.isError ? el("span", { className: "seg-fix", textContent: `→ ${(s.correctAnswers || []).join(" / ")}` }) : null,
          " ",
        ];
      }));
      noErr.setAttribute("aria-pressed", String(a.noError));
      const marked = segs.filter((s) => s.id in a.fixes);
      fixes.replaceChildren(...(marked.length
        ? marked.map((s) => {
            const input = el("input", { type: "text", value: a.fixes[s.id], placeholder: "Type the correct form", autocomplete: "off", oninput: (e) => { a.fixes[s.id] = e.target.value; } });
            if (s.id === focusId) queueMicrotask(() => input.focus());
            return el("label", { className: "fix" }, el("span", { textContent: `Replace “${s.text}” with:` }), input);
          })
        : [el("p", { className: "muted", textContent: a.noError ? "You chose “No error”." : "Click the parts that contain an error, or choose “No error”." })]));
      focusId = null;
      drawPalette();
    }

    refresh();
    return el("div", {}, sentence, fixes, noErr);
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
  const ring = el("div", { className: "ring", role: "img", "aria-label": `${sum.percent} percent` }, el("span", { textContent: `${sum.percent}%` }));
  ring.style.setProperty("--p", sum.percent);
  const stat = (label, value, cls = "") => el("div", { className: `stat ${cls}` }, el("strong", { textContent: String(value) }), el("span", { textContent: label }));

  return [
    ...heading(d.title, test.meta.title),
    el("section", { className: "panel summary" }, ring,
      el("div", { className: "stats" },
        stat("Correct", sum.correct, "ok"), stat("Incorrect", sum.incorrect, "bad"),
        stat("Unanswered", sum.unanswered), stat("Time used", E.fmtTime(d.spentMs / 1000)))),
    d.peeks || d.explained
      ? el("p", { className: "muted", textContent: `Assists used: answer shown on ${d.peeks} question(s), explanation opened on ${d.explained}.` })
      : null,
    sum.topics.length
      ? el("section", { className: "panel" }, el("h2", { textContent: "Topics to review" }),
          el("ul", { className: "chips" }, ...sum.topics.map((t) => el("li", { textContent: t }))))
      : null,
    el("h2", { textContent: "Review" }),
    ...test.questions.map((q, i) => reviewItem(test, q, i, d.answers[i], sum.statuses[i])),
    el("div", { className: "q-nav" }, ...actions),
  ];
}

function showResults(root, ctx, test, d, timedOut) {
  mount(root, resultsNodes(test, d, [
    el("button", { className: "btn btn-ghost", type: "button", textContent: "All tests", onclick: () => showCatalog(root, ctx) }),
    el("button", { className: "btn", type: "button", textContent: "Retake", onclick: () => openIntro(root, ctx, test) }),
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
    el("button", { className: "btn btn-ghost", type: "button", textContent: "Back to reports", onclick: onBack }),
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
