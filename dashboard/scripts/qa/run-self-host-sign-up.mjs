#!/usr/bin/env node
/**
 * Run the self-host sign-up smoke test against a deployed dashboard.
 *
 *   node scripts/qa/run-self-host-sign-up.mjs --url https://your-dashboard.example.com
 *
 * Options: --keep (leave the throwaway account), --require-self-host (fail
 * instead of skipping when the stack verifies email), --headed.
 * Env: QA_BASE_URL (instead of --url), PLAYWRIGHT_CHROMIUM_EXECUTABLE (a browser
 * to use with playwright-core).
 *
 * Needs Playwright, which this package does not depend on: install it where you
 * run this (`npm i playwright-core` plus a browser, or `npm i playwright && npx
 * playwright install chromium`). Exit codes: 0 passed or skipped, 1 a check
 * failed, 2 could not run.
 */
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import selfHostSignUp from "./self-host-sign-up.mjs";

async function loadPlaywright() {
  const here = createRequire(import.meta.url);
  const there = createRequire(path.join(process.cwd(), "noop.js"));
  for (const resolver of [here, there]) {
    for (const name of ["playwright", "playwright-core"]) {
      try {
        const loaded = await import(pathToFileURL(resolver.resolve(name)).href);
        // Playwright is CommonJS: its exports sit on `default` under ESM.
        return loaded.chromium ? loaded : loaded.default;
      } catch {
        // try the next place
      }
    }
  }
  return null;
}

const { values } = parseArgs({
  options: {
    url: { type: "string" },
    keep: { type: "boolean", default: false },
    "require-self-host": { type: "boolean", default: false },
    headed: { type: "boolean", default: false },
  },
});
const baseURL = values.url ?? process.env.QA_BASE_URL;
if (!baseURL) {
  console.error("Pass --url <dashboard address> or set QA_BASE_URL.");
  process.exit(2);
}
const playwright = await loadPlaywright();
if (!playwright?.chromium) {
  console.error(
    "Playwright is not installed here. Run `npm i playwright-core` (and set PLAYWRIGHT_CHROMIUM_EXECUTABLE) or `npm i playwright && npx playwright install chromium`, then retry.",
  );
  process.exit(2);
}

const browser = await playwright.chromium.launch({
  headless: !values.headed,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
});
let outcome;
try {
  const page = await (
    await browser.newContext({ viewport: { width: 1280, height: 900 } })
  ).newPage();
  outcome = await selfHostSignUp(page, {
    baseURL,
    keep: values.keep,
    requireSelfHost: values["require-self-host"],
  });
} finally {
  await browser.close();
}

for (const c of outcome.checks) {
  console.log(
    `${c.ok ? "ok  " : "FAIL"} - ${c.name}${c.detail ? ` (${c.detail})` : ""}`,
  );
}
if (outcome.skipped) {
  console.log(`SKIPPED - ${outcome.skipped}`);
  process.exit(0);
}
const failed = outcome.checks.filter((c) => !c.ok).length;
console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
process.exit(failed ? 1 : 0);
