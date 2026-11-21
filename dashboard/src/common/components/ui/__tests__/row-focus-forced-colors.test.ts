import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { compile } from "tailwindcss";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * Custom row actions (the entries of every journal list — the Journal, an
 * account's journal and the Overview's recent activity — and Files rows) take
 * the shared Button's forced-colors focus outline; their shadow rings and
 * background tints vanish under forced colors (w4/262). This checks that the
 * exact utilities they now carry emit real forced-colors outline rules,
 * including the inset variant the full-width rows use. Pixels under real
 * forced-colors rendering were not measured in this environment.
 */
const SOURCES = [
  "src/features/journal/components/journal-lines.tsx",
  "src/features/journal/components/journal-days.tsx",
  "src/features/reports/overview/components/account-balances-card.tsx",
  "src/features/reports/overview/components/money-movement-section.tsx",
  "src/features/ledger-editor/directory-browse/components/ledger-directory-view.tsx",
];
const CLASSES = [
  "forced-colors:focus-visible:[outline-style:solid]",
  "forced-colors:focus-visible:outline-2",
  "forced-colors:focus-visible:outline-offset-2",
  "forced-colors:focus-visible:-outline-offset-2",
  "forced-colors:focus-visible:outline-[CanvasText]",
];
let css = "";

beforeAll(async () => {
  const require = createRequire(`${process.cwd()}/`);
  const compiler = await compile(`@import "tailwindcss";`, {
    base: process.cwd(),
    loadStylesheet: async (id: string, base: string) => {
      const path = require.resolve(
        id === "tailwindcss" ? "tailwindcss/index.css" : id,
      );
      return { path, base, content: readFileSync(path, "utf8") };
    },
  });
  css = compiler.build(CLASSES);
});

describe("custom row focus under forced colors", () => {
  it("emits a solid CanvasText outline, outer and inset", () => {
    expect(css).toContain("forced-colors: active");
    expect(css).toMatch(/outline-style:\s*solid/);
    expect(css).toMatch(/outline-color:\s*CanvasText/);
    expect(css).toMatch(/outline-offset:\s*2px/);
    expect(css).toMatch(/outline-offset:\s*calc\(2px \* -1\)/);
  });

  it.each(SOURCES)("%s carries the forced-colors focus outline", (path) => {
    const source = readFileSync(path, "utf8");
    expect(source).toContain(
      "forced-colors:focus-visible:[outline-style:solid]",
    );
    expect(source).toContain(
      "forced-colors:focus-visible:outline-[CanvasText]",
    );
  });
});
