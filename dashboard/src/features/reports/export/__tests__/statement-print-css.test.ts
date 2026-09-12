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

  it("hides app chrome only when a body-level statement portal exists", () => {
    expect(printStyles).toContain(
      "body:has(> .statement-print-root) > *:not(.statement-print-root)",
    );
    expect(printStyles).not.toContain("body > *:not(.statement-print-root)");
  });

  it("resets the print canvas so dark mode cannot print black page margins", () => {
    // jsdom does not evaluate `@media print` or `:has()` for computed style, so
    // this asserts the stylesheet contract; a real dark-mode print/PDF render is
    // the only end-to-end check.
    const printBlock = printStyles.slice(printStyles.indexOf("@media print"));
    const canvasRule = printBlock.match(
      /html:has\(body > \.statement-print-root\),\s*body:has\(> \.statement-print-root\)\s*\{(?<declarations>[^}]*)\}/,
    )?.groups?.declarations;

    expect(canvasRule).toBeDefined();
    // `.dark` sets `color-scheme: dark` plus a dark `--background` on html/body,
    // and `body { @apply bg-background }` applies it unconditionally.
    expect(canvasRule).toMatch(/background:\s*#fff\s*!important/);
    expect(canvasRule).toMatch(/color-scheme:\s*light/);

    // Scoped to the statement portal: other routes keep the app's own canvas.
    expect(printStyles).not.toMatch(/@media print[\s\S]*\n\s*html\s*\{/);
    expect(printStyles).not.toMatch(/@media print[\s\S]*\n\s*body\s*\{/);
  });

  it("keeps ordinary pages printable when no statement portal is present", () => {
    document.body.innerHTML = "";
    const style = document.createElement("style");
    style.textContent = printStyles;
    document.head.appendChild(style);

    const main = document.createElement("main");
    main.textContent = "Journal transactions remain printable";
    document.body.appendChild(main);

    // Without a portal, the isolation rule's :has() does not match, so the
    // page content must stay in the box tree (not display:none).
    expect(getComputedStyle(main).display).not.toBe("none");
    expect(main.textContent).toContain("Journal transactions remain printable");

    const portal = document.createElement("article");
    portal.className = "statement-print-root";
    portal.textContent = "Balance Sheet";
    document.body.appendChild(portal);

    // With a portal present, chrome is isolated and the portal stays shown.
    // jsdom does not evaluate @media print / :has for computed style reliably,
    // so assert the live DOM structure the print stylesheet is written against.
    expect(document.body.querySelector(":scope > .statement-print-root")).toBe(
      portal,
    );
    expect(
      document.body.querySelectorAll(":scope > *:not(.statement-print-root)")
        .length,
    ).toBe(1);

    style.remove();
    document.body.innerHTML = "";
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
