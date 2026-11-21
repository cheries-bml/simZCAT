// GenTest: build a random test from the question files, by course and by number of questions per level and topic.
import { el, mount } from "./util.js";
import { openModal, alertModal } from "./modal.js";
import * as E from "./test-engine.js";

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/**
 * Step 1: choose the course and the numbers. Step 2: preview the drawn questions, then
 * Regenerate / Back / Save to MyTest / Start test.
 * Resolves { action: "save" | "start", gen } or null when cancelled.
 */
export async function openGenTest(tests, { initialCourse } = {}) {
  const courses = E.genCourses(tests);
  if (!courses.length) {
    await alertModal("Nothing to generate from", "No questions are filed under level, course and topic folders yet.");
    return null;
  }
  let course = courses.includes(initialCourse) ? initialCourse : courses[0];
  let plan = {};          // "level|topic" -> number of questions
  let shuffle = false;
  let title = "";
  let items = null;

  function paramsBody() {
    const matrixSlot = el("div", { className: "table-wrap" });
    const totalEl = el("strong");
    const pools = () => E.genPools(tests, course);
    const updateTotal = () => { totalEl.textContent = String(E.planTotal(plan, pools())); };

    function drawMatrix() {
      const gp = pools();
      const head = el("tr", {}, el("th", { textContent: "Topic" }), ...gp.levels.map((l) => el("th", { textContent: E.facetLabel(l) })));
      const rows = gp.topics.map((topic) => el("tr", {},
        el("th", { scope: "row", textContent: E.facetLabel(topic) }),
        ...gp.levels.map((level) => {
          const key = E.genKey(level, topic);
          const max = gp.pools.get(key)?.length ?? 0;
          if (!max) return el("td", { className: "gen-na", textContent: "—" });
          const input = el("input", {
            type: "number", min: 0, max, value: plan[key] || "", placeholder: "0",
            "aria-label": `${E.facetLabel(level)}, ${E.facetLabel(topic)}: questions (max ${max})`,
            oninput: (e) => {
              const v = parseInt(e.target.value, 10);
              if (Number.isInteger(v) && v > 0) plan[key] = Math.min(v, max); else delete plan[key];
              updateTotal();
            },
            onchange: (e) => { e.target.value = plan[key] || ""; },
          });
          return el("td", {}, el("div", { className: "gen-cell" }, input, el("span", { className: "muted", textContent: `/ ${max}` })));
        })));
      mount(matrixSlot, el("table", { className: "gen-matrix" }, el("thead", {}, head), el("tbody", {}, ...rows)));
    }

    const courseSelect = el("select", {
      "aria-label": "Course",
      onchange: (e) => { course = e.target.value; plan = {}; drawMatrix(); updateTotal(); },
    }, ...courses.map((c) => el("option", { value: c, textContent: E.facetLabel(c), selected: c === course })));

    drawMatrix();
    updateTotal();
    return el("div", { className: "gen-params" },
      el("label", { className: "field" }, el("span", { textContent: "Course" }), courseSelect),
      el("p", { className: "muted", textContent: "How many questions for each level and topic? They are drawn at random." }),
      matrixSlot,
      el("div", { className: "gen-foot" },
        el("span", {}, "Total: ", totalEl, " questions"),
        el("button", { type: "button", className: "link-btn", textContent: "Clear", onclick: () => { plan = {}; drawMatrix(); updateTotal(); } })),
      el("label", { className: "check-row" },
        el("input", { type: "checkbox", checked: shuffle, onchange: (e) => { shuffle = e.target.checked; } }),
        "Shuffle the order (otherwise easy to advanced)"));
  }

  function previewBody() {
    const { test } = E.buildGenTest({ id: "preview", title: "", course, items }, tests);
    return el("div", { className: "gen-preview" },
      el("label", { className: "field" }, el("span", { textContent: "Name" }),
        el("input", { type: "text", maxlength: 60, value: title || E.defaultGenTitle(course, items.length), oninput: (e) => { title = e.target.value; } })),
      el("p", { className: "muted", textContent: `${items.length} questions · ${E.facetLabel(course)} · ${E.compositionText(items)}` }),
      el("ol", { className: "gen-list" }, ...items.map((it, i) => el("li", {},
        el("span", { className: `level-pill lv-${it.level}`, textContent: E.facetLabel(it.level) }),
        el("span", { className: "gen-topic", textContent: E.facetLabel(it.topic) }),
        el("span", { className: "gen-q", textContent: E.questionTitle(test.questions[i]) })))));
  }

  for (;;) {
    if (!items) {
      const go = await openModal({
        title: "Generate a test", wide: true, dismissValue: false, body: paramsBody(),
        actions: [{ label: "Cancel", value: false }, { label: "Generate", value: true, primary: true }],
      });
      if (!go) return null;
      const gp = E.genPools(tests, course);
      if (!E.planTotal(plan, gp)) {
        await alertModal("Nothing to generate", "Enter at least one question for a level and topic.");
        continue;
      }
      items = E.generateItems(gp, plan, { shuffle });
    }
    const choice = await openModal({
      title: "Your generated test", wide: true, dismissValue: false, body: previewBody(),
      actions: [{ label: "Back", value: "back" }, { label: "Regenerate", value: "regen" }, { label: "Save to MyTest", value: "save" }, { label: "Start test", value: "start", primary: true }],
    });
    if (choice === "back") { items = null; continue; }
    if (choice === "regen") { items = E.generateItems(E.genPools(tests, course), plan, { shuffle }); continue; }
    if (choice === "save" || choice === "start") {
      return { action: choice, gen: { id: newId(), title: title.trim() || E.defaultGenTitle(course, items.length), course, items } };
    }
    return null;
  }
}
