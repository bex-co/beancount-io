import { readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { resolve } from "node:path";

// Inspect production assets, never source size or unstable hashed filenames.
const root = resolve(process.argv[2] ?? ".output/public");
const manifest = JSON.parse(
  await readFile(resolve(root, ".vite/manifest.json"), "utf8"),
);
const config = await readFile(
  new URL("../src/i18n/config.ts", import.meta.url),
  "utf8",
);
const languages = [
  ...config.split("as const")[0].matchAll(/"([a-z]{2})"/g),
].map((match) => match[1]);
const localeKeys = languages
  .filter((language) => language !== "en")
  .map((language) => `src/i18n/locales/${language}.ts`);
const failures = [];
function closure(keys, seen = new Set()) {
  for (const key of keys) {
    if (seen.has(key)) continue;
    if (!manifest[key]) throw new Error(`Missing manifest import: ${key}`);
    seen.add(key);
    closure(manifest[key].imports ?? [], seen);
  }
  return seen;
}
const entries = Object.keys(manifest).filter((key) => manifest[key].isEntry);
if (!entries.length)
  throw new Error("No client entry found; run yarn build first");
const initial = closure(entries);
const files = new Set();
for (const key of localeKeys) {
  const chunk = manifest[key];
  if (!chunk?.isDynamicEntry) {
    failures.push(`${key} must remain a dynamic locale entry`);
    continue;
  }
  if (files.has(chunk.file))
    failures.push(`${key} shares its chunk with another language`);
  files.add(chunk.file);
  if (initial.has(key))
    failures.push(`${key} is eagerly reachable from the client entry`);
  const imports = closure([key]);
  for (const other of localeKeys) {
    if (other !== key && imports.has(other))
      failures.push(`${key} eagerly imports ${other}`);
  }
}
// Also guard against a route statically importing a non-English locale.
for (const key of Object.keys(manifest).filter(
  (key) => !localeKeys.includes(key),
)) {
  for (const imported of manifest[key].imports ?? []) {
    if (localeKeys.includes(imported))
      failures.push(`${key} eagerly imports ${imported}`);
  }
}
const initialFiles = [
  ...new Set([...initial].map((key) => manifest[key].file)),
];
let gzipBytes = 0;
for (const file of initialFiles)
  gzipBytes += gzipSync(await readFile(resolve(root, file)), {
    level: 9,
  }).length;
// Baseline: 951,559 bytes. The first locale split measured ~334 KB gzip.
const maxGzipBytes = 370_000;
if (gzipBytes > maxGzipBytes)
  failures.push(`Initial JS gzip ${gzipBytes} exceeds ${maxGzipBytes} bytes`);
console.log(
  JSON.stringify(
    {
      initialGzipBytes: gzipBytes,
      maxGzipBytes,
      lazyLocales: files.size,
      failures,
    },
    null,
    2,
  ),
);
if (failures.length) process.exitCode = 1;
