// Builds the list of tests: reads manifests/questions-manifest.json, then loads every listed question file (GET only).
import { loadJSON } from "./auth.js";
import { isValidTest, facetsFromPath, compareTests, fileInfo, compareFiles } from "./test-engine.js";

let cache = null;

export async function loadCatalog(config) {
  if (cache) return cache;
  const manifest = await loadJSON(config.questionsManifest);
  const files = Array.isArray(manifest) ? manifest : manifest.files || [];
  const settled = await Promise.allSettled(
    files.map(async (path, order) => {
      const json = await loadJSON(path);
      return { ...json, path, order, ...facetsFromPath(path, config.questionsDir) };
    })
  );
  cache = settled
    .filter((r) => r.status === "fulfilled" && isValidTest(r.value) && r.value.meta.config?.active !== false)
    .map((r) => r.value)
    .sort(compareTests);
  return cache;
}

let filesCache = null;

/** The teaching files listed in manifests/files-manifest.json (entries are paths or { path, size }). */
export async function loadFiles(config) {
  if (filesCache) return filesCache;
  const manifest = await loadJSON(config.filesManifest);
  const list = Array.isArray(manifest) ? manifest : manifest.files || [];
  filesCache = list
    .filter((e) => typeof (typeof e === "string" ? e : e?.path) === "string")
    .map((e) => fileInfo(e, config.filesDir))
    .sort(compareFiles);
  return filesCache;
}
