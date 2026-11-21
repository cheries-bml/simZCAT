import { loadCatalog } from "./catalog.js";
import { alertModal } from "./modal.js";
import { resolveQuestions, buildGenTest } from "./test-engine.js";
import { showReview } from "./test-ui.js";

/** Shows a saved attempt's answers inside `root`. Works for catalog tests and generated (GenTest) tests. */
export async function openReview({ root, config, attempt, onBack, onRetake }) {
  let test = null;
  try {
    const tests = await loadCatalog(config);
    test = attempt.gen ? buildGenTest(attempt.gen, tests).test : tests.find((t) => t.path === attempt.testPath) ?? null;
  } catch (err) {
    console.error(err);
  }
  const questions = test && resolveQuestions(test, attempt);
  if (!questions) {
    alertModal("Review unavailable", "This test has changed or is no longer available.");
    return;
  }
  showReview(root, { ...test, questions }, attempt, { onBack, onRetake });
}
