import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

/**
 * Static regression check: raw JS error messages (`error.message`,
 * `err.message`, …) must never be rendered to users. Map them through
 * `getErrorMessageKey` / `useErrorMessage` from
 * `src/common/lib/errors/error-message.ts` instead.
 *
 * Files where reading `.message` is legitimate (domain data, classification
 * logic, logging) are listed in ALLOWLIST with the reason.
 */

const SRC_ROOT = join(__dirname, "..");

/** file path (relative to src/) → why raw .message use is acceptable there */
const ALLOWLIST: Record<string, string> = {
  "features/importer/utils/is-premium-required.ts":
    "inspects the message to classify premium-gating errors; never renders it",
  "features/ledger-data/errors/index.tsx":
    "beancount ledger validation errors are domain data from the user's own file",
  "features/ledger-editor/file-editor/components/ledger-file-view/text-editor-utils.ts":
    "beancount validation errors fed to Monaco markers (domain data)",
  "features/plaid/pages/plaid-settings/hooks/use-plaid-connection.ts":
    "inspects the message to classify duplicate-institution errors",
  "common/components/ledger-layout/ledger-layout-error.tsx":
    "inspects the message to classify the error; renders localized copy only",
  "common/root-route/error-page.tsx":
    "inspects the message to classify the error; renders localized copy only",
  "common/components/error-boundary.tsx":
    "console.error logging only; the fallback renders localized copy",
  "common/lib/errors/error-message.ts":
    "the mapping helper itself inspects fetch-failure messages",
  "features/importer/components/steps/finish/index.tsx":
    "importResult errors carry only localized strings or intentional mutation-payload feedback (populated exclusively by use-import-submit)",
  "features/importer/components/steps/preview/editable-preview-row.tsx":
    "zod field-validation messages are intentional user feedback, not JS error internals",
  "features/importer/hooks/use-temp-asset-upload.ts":
    "diagnostic-only error state (no consumer renders it); the original error is rethrown for callers to map",
};

interface ForbiddenPattern {
  name: string;
  regex: RegExp;
}

const ERROR_VAR = String.raw`(?:err|error|e|ex|exception)`;

const FORBIDDEN_PATTERNS: ForbiddenPattern[] = [
  {
    name: "JSX render of a raw error message ({error.message})",
    regex: new RegExp(String.raw`\{\s*${ERROR_VAR}\??\.message\s*\}`),
  },
  {
    name: "toast with a raw error message (toast.error(error.message ...))",
    regex: new RegExp(
      String.raw`toast\.(?:error|warning)\(\s*\x60?[^)]{0,40}?\b${ERROR_VAR}\??\.message`,
    ),
  },
  {
    name: "raw-message ternary (error instanceof Error ? error.message : ...)",
    regex: new RegExp(
      String.raw`${ERROR_VAR} instanceof Error\s*\?\s*${ERROR_VAR}\??\.message`,
    ),
  },
  {
    name: "raw-message fallback (error.message || t(...))",
    regex: new RegExp(String.raw`\b${ERROR_VAR}\??\.message\s*\|\|\s*t\(`),
  },
];

function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (
        entry === "__tests__" ||
        entry === "locales" ||
        entry === "node_modules"
      ) {
        continue;
      }
      files.push(...collectSourceFiles(full));
    } else if (
      /\.(ts|tsx)$/.test(entry) &&
      !/\.(test|spec)\.(ts|tsx)$/.test(entry) &&
      !entry.endsWith(".d.ts")
    ) {
      files.push(full);
    }
  }
  return files;
}

function stripCommentsAndConsole(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "") // block comments
    .replace(/^\s*\/\/.*$/gm, "") // line comments
    .replace(/console\.(error|warn|log|info|debug)\([^;]*\);?/g, ""); // logging
}

describe("no raw error.message shown to users", () => {
  const files = collectSourceFiles(SRC_ROOT);

  it("scans a sane number of source files", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it.each(FORBIDDEN_PATTERNS.map((p) => [p.name, p] as const))(
    "forbids: %s",
    (_name, pattern) => {
      const violations: string[] = [];

      for (const file of files) {
        const rel = relative(SRC_ROOT, file);
        if (rel in ALLOWLIST) continue;

        const source = stripCommentsAndConsole(readFileSync(file, "utf-8"));
        const match = pattern.regex.exec(source);
        if (match) {
          const line = source.slice(0, match.index).split("\n").length;
          violations.push(`src/${rel}:~${line} → ${match[0].trim()}`);
        }
      }

      expect(
        violations,
        `Raw error messages must not reach users. Map them with ` +
          `getErrorMessageKey/useErrorMessage from ` +
          `"@/common/lib/errors/error-message" (or add a justified ` +
          `ALLOWLIST entry in this test).\n${violations.join("\n")}`,
      ).toEqual([]);
    },
  );

  it("keeps the allowlist free of stale entries", () => {
    const stale = Object.keys(ALLOWLIST).filter(
      (rel) => !files.some((file) => relative(SRC_ROOT, file) === rel),
    );
    expect(stale).toEqual([]);
  });
});
