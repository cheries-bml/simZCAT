// Builds the list of tests: reads manifests/questions-manifest.json, then loads every listed question file (GET only).
import { loadJSON } from "./auth.js";
import { isValidTest } from "./test-engine.js";

let cache = null;

function folderOf(path, base) {
  const rel = path.startsWith(`${base}/`) ? path.slice(base.length + 1) : path;
  const i = rel.lastIndexOf("/");
  return i === -1 ? "" : rel.slice(0, i);
}

export async function loadCatalog(config) {
  if (cache) return cache;
  const manifest = await loadJSON(config.questionsManifest);
  const files = Array.isArray(manifest) ? manifest : manifest.files || [];
  const settled = await Promise.allSettled(
    files.map(async (path, order) => {
      const json = await loadJSON(path);
      return { ...json, path, order, folder: folderOf(path, config.questionsDir) };
    })
  );
  cache = settled
    .filter((r) => r.status === "fulfilled" && isValidTest(r.value) && r.value.meta.config?.active !== false)
    .map((r) => r.value)
    .sort((a, b) => a.path.localeCompare(b.path));
  return cache;
}
