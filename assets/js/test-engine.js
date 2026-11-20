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
    return Object.entries(a.fixes).map(([id, t]) => `${segText(q, id)} → ${t.trim() || "(blank)"}`).join("; ");
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
/** Newest first: by meta.created when present, otherwise later entries in the manifest rank higher. */
export function newestTests(tests, n = 3) {
  const stamp = (t) => Date.parse(t.meta?.created) || 0;
  return [...tests].sort((a, b) => stamp(b) - stamp(a) || (b.order ?? 0) - (a.order ?? 0)).slice(0, n);
}

/** n quotes from the list; the selection rotates once a day. */
export function pickQuotes(list, n = 3, date = new Date()) {
  if (!Array.isArray(list) || !list.length) return [];
  const count = Math.min(n, list.length);
  const start = (Math.floor(date.getTime() / 86400000) * count) % list.length;
  return Array.from({ length: count }, (_, i) => list[(start + i) % list.length]);
}

export const greeting = (hour) => (hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");
