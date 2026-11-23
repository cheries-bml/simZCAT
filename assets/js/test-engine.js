// Pure test logic (no DOM): scoring, timing and answer formatting.

export const PACES = ["fast", "normal", "easy"];
const DEFAULT_SECONDS = 30;

export const isValidTest = (t) => !!t && typeof t === "object" && !!t.meta && Array.isArray(t.questions) && t.questions.length > 0;

export const norm = (s) =>
  String(s ?? "").toLowerCase().replace(/\s+/g, " ").replace(/^[\s.,;:!?"'()]+|[\s.,;:!?"'()]+$/g, "");

const stripTags = (s) => String(s ?? "").replace(/<[^>]*>/g, "");

export function fmtTime(sec) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return `${h ? `${h}:${String(m).padStart(2, "0")}` : m}:${String(s).padStart(2, "0")}`;
}

// ----- question helpers -----
export const optionList = (q) =>
  Object.entries(q.options || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, o]) => ({ key, text: o.text, correct: o.correct === true }));

export const correctKeys = (q) => optionList(q).filter((o) => o.correct).map((o) => o.key);
export const errorSegments = (q) => (q.multiErrorSegments || []).filter((s) => s.isError);
const segText = (q, id) => (q.multiErrorSegments || []).find((s) => s.id === id)?.text ?? id;

export const questionTitle = (q) =>
  q.type === "correction"
    ? (q.multiErrorSegments || []).map((s) => s.text).join(" ")
    : stripTags(q.data?.question || q.data?.passage || "Question");

// Question-level config overrides test-level config.
export function flags(test, q) {
  const m = test.meta?.config || {}, c = q.config || {};
  return {
    showAnswer: c.show_answer ?? m.show_answer ?? false,
    showExplanation: c.show_explanation ?? m.show_explanation ?? false,
  };
}

/**
 * Seconds allowed for one question at a pace: the question's own time_in_seconds[pace],
 * otherwise the default from config.json (a number, or { fast, normal, easy }).
 */
export function secondsFor(q, pace, defaults) {
  const own = q.config?.time_in_seconds?.[pace];
  if (Number.isFinite(own) && own > 0) return own;
  const fallback = typeof defaults === "number" ? defaults : defaults?.[pace];
  return Number.isFinite(fallback) && fallback > 0 ? fallback : DEFAULT_SECONDS;
}

/** Total test time = the sum over all questions. Every test is timed. */
export const timeLimit = (test, pace, defaults) => test.questions.reduce((sum, q) => sum + secondsFor(q, pace, defaults), 0);

// ----- answers -----
// multiple_choice: { selected: ["C", "E"] }   correction: { noError: bool, fixes: { segmentId: "typed text" } }
export function isAnswered(q, a) {
  if (!a) return false;
  if (q.type === "correction") return !!a.noError || Object.keys(a.fixes || {}).length > 0;
  return (a.selected || []).length > 0;
}

/** Returns "correct" | "incorrect" | "unanswered". All-or-nothing per question. */
export function grade(q, a) {
  if (!isAnswered(q, a)) return "unanswered";
  if (q.type === "correction") {
    const errs = errorSegments(q), marked = Object.keys(a.fixes || {});
    if (errs.length === 0) return a.noError && marked.length === 0 ? "correct" : "incorrect";
    if (a.noError || marked.length !== errs.length) return "incorrect";
    const ok = errs.every((s) => a.fixes[s.id] !== undefined && (s.correctAnswers || []).some((c) => norm(c) === norm(a.fixes[s.id])));
    return ok ? "correct" : "incorrect";
  }
  return [...correctKeys(q)].sort().join() === [...a.selected].sort().join() ? "correct" : "incorrect";
}

export function summarize(test, answers) {
  const out = { correct: 0, incorrect: 0, unanswered: 0, total: test.questions.length, statuses: [] };
  const topics = new Set();
  test.questions.forEach((q, i) => {
    const s = grade(q, answers[i]);
    out.statuses.push(s);
    out[s]++;
    if (s !== "correct" && q.explanation?.topic) topics.add(q.explanation.topic);
  });
  out.topics = [...topics];
  out.percent = Math.round((out.correct / out.total) * 100);
  return out;
}

export function userAnswerText(q, a) {
  if (!isAnswered(q, a)) return "No answer";
  if (q.type === "correction") {
    if (a.noError) return "No error";
    return Object.entries(a.fixes).map(([id, t]) => {
      const original = segText(q, id), typed = t.trim();
      return `${original} → ${!typed ? "(blank)" : typed === original.trim() ? "(unchanged)" : typed}`;
    }).join("; ");
  }
  return optionList(q).filter((o) => a.selected.includes(o.key)).map((o) => `${o.key}. ${o.text}`).join("; ");
}

export function correctAnswerText(q) {
  if (q.type === "correction") {
    const errs = errorSegments(q);
    return errs.length ? errs.map((s) => `${s.text} → ${(s.correctAnswers || []).join(" / ")}`).join("; ") : "No error";
  }
  return optionList(q).filter((o) => o.correct).map((o) => `${o.key}. ${o.text}`).join("; ");
}

export function hasExplanation(q) {
  const e = q.explanation;
  return !!e && !!(e.text || e.topic || e.concept || e.formula || e.examples?.length);
}

/** True when a saved attempt was taken on the same questions (same ids, same order). */
export const sameQuestions = (test, a) =>
  Array.isArray(a.qids) && a.qids.length === test.questions.length && a.qids.every((id, i) => id === test.questions[i].id);

// ----- home page -----
/** The newest tests are the first entries of questions-manifest.json (top of the list = newest). */
export function newestTests(tests, n = 4) {
  return [...tests].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).slice(0, n);
}

/** n quotes from the list; the selection rotates once a day. */
export function pickQuotes(list, n = 3, date = new Date()) {
  if (!Array.isArray(list) || !list.length) return [];
  const count = Math.min(n, list.length);
  const start = (Math.floor(date.getTime() / 86400000) * count) % list.length;
  return Array.from({ length: count }, (_, i) => list[(start + i) % list.length]);
}

export const greeting = (hour) => (hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");

// ----- filters: questions/<level>/<course>/<topic>/file.json -----
export const FACETS = [
  { key: "level", label: "Level" },
  { key: "course", label: "Course" },
  { key: "topic", label: "Topic" },
];
const LEVEL_ORDER = ["easy", "intermediate", "advanced"];

/** Level, course and topic come from the folders above the file (all lowercase). */
export function facetsFromPath(path, base = "questions") {
  const rel = path.startsWith(`${base}/`) ? path.slice(base.length + 1) : path;
  const dirs = rel.split("/").slice(0, -1).map((d) => d.toLowerCase());
  return { level: dirs[0] || "", course: dirs[1] || "", topic: dirs.slice(2).join("/") };
}

export const facetLabel = (v) => String(v).replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
export const crumb = (t) => [t.level, t.course, t.topic].filter(Boolean).map(facetLabel).join(" · ");

function sortValues(key, values) {
  const rank = (v) => (key === "level" && LEVEL_ORDER.includes(v) ? LEVEL_ORDER.indexOf(v) : LEVEL_ORDER.length);
  return [...values].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

// filters: { level: Set, course: Set, topic: Set }. OR inside a group, AND between groups.
const matches = (t, filters, skip, facets = FACETS) => facets.every(({ key }) => key === skip || !filters[key]?.size || filters[key].has(t[key]));
export const applyFilters = (tests, filters, facets = FACETS) => tests.filter((t) => matches(t, filters, undefined, facets));
export const hasFilters = (filters, facets = FACETS) => facets.some(({ key }) => filters[key]?.size);

/** Options for one group with counts, taking the other groups' selections into account. */
export function facetOptions(tests, filters, key, facets = FACETS) {
  const counts = new Map();
  for (const t of tests) if (t[key] && matches(t, filters, key, facets)) counts.set(t[key], (counts.get(t[key]) || 0) + 1);
  for (const v of filters[key] || []) if (!counts.has(v)) counts.set(v, 0); // keep a selected value visible so it can be cleared
  return sortValues(key, counts.keys()).map((value) => ({ value, count: counts.get(value) }));
}

/** Catalog order: easy, intermediate, advanced; then course, topic and title. */
export function compareTests(a, b) {
  const rank = (t) => (LEVEL_ORDER.includes(t.level) ? LEVEL_ORDER.indexOf(t.level) : LEVEL_ORDER.length);
  return rank(a) - rank(b) || a.course.localeCompare(b.course) || a.topic.localeCompare(b.topic) || String(a.meta?.title).localeCompare(String(b.meta?.title));
}

// ----- configurable runs & saved attempts -----
/** Questions for a run: optionally shuffled, optionally limited to `count` (1..all). */
export function pickQuestions(questions, { randomize = false, count } = {}, rng = Math.random) {
  const list = [...questions];
  if (randomize) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
  }
  const n = Number.isInteger(count) ? Math.min(Math.max(count, 1), list.length) : list.length;
  return list.slice(0, n);
}

/** The questions an attempt was taken on (saved ids, saved order), or null if the test no longer has them. */
export function resolveQuestions(test, attempt) {
  if (!Array.isArray(attempt.qids) || !attempt.qids.length) return null;
  const byId = new Map(test.questions.map((q) => [q.id, q]));
  if (byId.size !== test.questions.length) return null; // duplicate ids make the mapping ambiguous
  const out = attempt.qids.map((id) => byId.get(id));
  return out.every(Boolean) ? out : null;
}

// ----- generated tests (GenTest / MyTest) -----
export const genKey = (level, topic) => `${level}|${topic}`;

/** Courses that have questions filed under level/course/topic folders. */
export const genCourses = (tests) => [...new Set(tests.filter((t) => t.level && t.course && t.topic).map((t) => t.course))].sort();

/** Every question of one course, grouped by level and topic. */
export function genPools(tests, course) {
  const pools = new Map();
  for (const t of tests) {
    if (t.course !== course || !t.level || !t.topic) continue;
    const key = genKey(t.level, t.topic);
    if (!pools.has(key)) pools.set(key, []);
    for (const q of t.questions) pools.get(key).push({ path: t.path, id: q.id, level: t.level, topic: t.topic });
  }
  const parts = [...pools.keys()].map((k) => k.split("|"));
  return {
    pools,
    levels: sortValues("level", new Set(parts.map((p) => p[0]))),
    topics: sortValues("topic", new Set(parts.map((p) => p[1]))),
  };
}

/** plan = { "easy|grammar": 2, ... } (counts above the pool size are capped). */
export const planTotal = (plan, gp) => Object.entries(plan).reduce((sum, [k, n]) => sum + Math.min(n, gp.pools.get(k)?.length ?? 0), 0);

/** Picks distinct random questions per level/topic; ordered easy to advanced unless `shuffle`. */
export function generateItems(gp, plan, { shuffle = false, rng = Math.random } = {}) {
  let items = [];
  for (const level of gp.levels) {
    for (const topic of gp.topics) {
      const pool = gp.pools.get(genKey(level, topic));
      const n = Math.min(Math.max(Math.floor(plan[genKey(level, topic)]) || 0, 0), pool?.length ?? 0);
      if (n) items.push(...pickQuestions(pool, { randomize: true, count: n }, rng));
    }
  }
  if (shuffle) items = pickQuestions(items, { randomize: true }, rng);
  return items;
}

export const defaultGenTitle = (course, n) => `${facetLabel(course)} mix · ${n} questions`;

/** "Easy 3 · Intermediate 2" for a list of items. */
export function compositionText(items) {
  const counts = new Map();
  for (const it of items) counts.set(it.level, (counts.get(it.level) || 0) + 1);
  return sortValues("level", counts.keys()).map((l) => `${facetLabel(l)} ${counts.get(l)}`).join(" · ");
}

/**
 * Turns saved items ({ path, id }) into a test the runner understands. Question ids become "<path>#<id>"
 * (unique across files) and each question keeps the answer/explanation flags it would have had in its own test.
 * `missing` counts items whose question no longer exists.
 */
export function buildGenTest(gen, tests) {
  const byPath = new Map(tests.map((t) => [t.path, t]));
  const questions = [];
  let missing = 0;
  for (const it of gen.items) {
    const src = byPath.get(it.path);
    const q = src?.questions.find((x) => x.id === it.id);
    if (!q) { missing++; continue; }
    const m = src.meta?.config || {};
    questions.push({
      ...q, id: `${it.path}#${it.id}`,
      config: { ...q.config, show_answer: q.config?.show_answer ?? m.show_answer ?? false, show_explanation: q.config?.show_explanation ?? m.show_explanation ?? false },
    });
  }
  const test = {
    meta: { title: gen.title, description: `Generated test · ${facetLabel(gen.course)} · ${gen.items.length} questions`, author: "GenTest", config: { show_answer: false, show_explanation: false, active: true } },
    questions, path: `gen:${gen.id}`, course: gen.course, level: "", topic: "", order: 0,
    gen: { id: gen.id, title: gen.title, course: gen.course, items: gen.items.map(({ path, id, level, topic }) => ({ path, id, level, topic })) },
  };
  return { test, missing };
}

// ----- teaching files (Files page): files/<level>/<course>/[<topic>/]<file> -----
const FILE_KINDS = {
  pdf: ["pdf"],
  image: ["jpg", "jpeg", "png", "gif", "webp", "svg", "avif", "bmp"],
  markdown: ["md", "markdown"],
  text: ["txt", "csv", "json", "log", "yml", "yaml", "xml"],
  video: ["mp4", "webm", "ogv", "mov"],
  audio: ["mp3", "wav", "ogg", "m4a", "aac"],
};
export const KIND_LABELS = { pdf: "PDF", image: "Image", markdown: "Markdown", text: "Text", video: "Video", audio: "Audio", other: "Other" };

export function kindOf(path) {
  const ext = (path.split(".").pop() || "").toLowerCase();
  for (const [kind, exts] of Object.entries(FILE_KINDS)) if (exts.includes(ext)) return kind;
  return "other";
}

// Same level / course / topic groups as tests, plus the file type.
export const FILE_FACETS = [...FACETS, { key: "kind", label: "Type", format: (v) => KIND_LABELS[v] ?? facetLabel(v) }];

export const fileTitle = (path) => facetLabel(path.split("/").pop().replace(/\.[^.]+$/, ""));
export const fileUrl = (path) => path.split("/").map(encodeURIComponent).join("/");

export function humanSize(bytes) {
  if (!Number.isFinite(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

/** A manifest entry (a path string, or { path, size, title?, description? }) as a file record. */
export function fileInfo(entry, base = "files") {
  const e = typeof entry === "string" ? { path: entry } : entry;
  return {
    path: e.path, name: e.path.split("/").pop(), title: e.title || fileTitle(e.path), description: e.description || "",
    size: Number.isFinite(e.size) ? e.size : null, kind: kindOf(e.path), ...facetsFromPath(e.path, base),
  };
}

export function compareFiles(a, b) {
  const rank = (f) => (LEVEL_ORDER.includes(f.level) ? LEVEL_ORDER.indexOf(f.level) : LEVEL_ORDER.length);
  return rank(a) - rank(b) || a.course.localeCompare(b.course) || a.topic.localeCompare(b.topic) || a.title.localeCompare(b.title);
}

/** Every word of the query must appear somewhere in the file's title, name, level, course, topic or description. */
export function matchesQuery(f, query) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = [f.title, f.name, f.level, f.course, f.topic, f.description].join(" ").toLowerCase();
  return words.every((w) => hay.includes(w));
}
