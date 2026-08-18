import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const printStyles = readFileSync(
  resolve(process.cwd(), "src/features/reports/export/statement-print.css"),
  "utf8",
);

describe("statement print pagination", () => {
  it("keeps the disclaimer in normal flow so it cannot overlap later pages", () => {
    expect(printStyles).toContain(".statement-print-footer");
    const footerRule = printStyles.match(
      /\.statement-print-footer\s*\{(?<declarations>[^}]*)\}/,
    )?.groups?.declarations;

    expect(footerRule).toBeDefined();
    expect(footerRule).not.toMatch(/position\s*:\s*fixed/);
    expect(footerRule).toMatch(/break-inside\s*:\s*avoid/);

    const supportingDetailRule = printStyles.match(
      /\.statement-print-supporting-detail\s*\{(?<declarations>[^}]*)\}/,
    )?.groups?.declarations;
    expect(supportingDetailRule).toMatch(/break-before\s*:\s*page/);
    expect(printStyles).toContain(
      ".statement-print-summary-row-total_liabilities_and_equity",
    );
    expect(printStyles).toContain(
      ".statement-print-summary-row-reconciliation_difference",
    );
  });
});

describe("statement print stylesheet delivery", () => {
  it("rides the inline root stylesheet so the print tree stays hidden in production", () => {
    // The app ships CSS exclusively via the `src/style.css?inline` <style> tag
    // in routes/__root.tsx with `cssCodeSplit: false`. A bare `.css` import is
    // extracted into an orphaned asset that no chunk loads, which left
    // `.statement-print-root` visible on screen in production.
    const rootStyles = readFileSync(
      resolve(process.cwd(), "src/style.css"),
      "utf8",
    );
    expect(rootStyles).toContain(
      '@import "./features/reports/export/statement-print.css";',
    );
  });

  it("has no bare .css imports outside the inline root stylesheet", () => {
    const bareCssImports: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) {
          walk(path);
        } else if (/\.(ts|tsx|js|jsx|mts|mjs)$/.test(entry)) {
          const source = readFileSync(path, "utf8");
          for (const match of source.matchAll(
            /(?<!@)import\s+(?:[^"']*\sfrom\s+)?["']([^"']*\.css)["']/g,
          )) {
            bareCssImports.push(`${path}: ${match[1]}`);
          }
        }
      }
    };
    walk(resolve(process.cwd(), "src"));

    expect(bareCssImports).toEqual([]);
  });
});
