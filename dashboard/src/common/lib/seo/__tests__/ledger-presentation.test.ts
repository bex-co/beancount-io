import { describe, expect, it } from "vitest";
import { resolveLedgerPresentation } from "../ledger-presentation";

const defaults = {
  name: "stock-example",
  fallbackDescription: "Financial overview",
};

describe("public ledger presentation", () => {
  it("uses authored ledger fields without changing the slug or adding a second brand", () => {
    expect(
      resolveLedgerPresentation({
        ...defaults,
        title: " Stock & ETF Example — beancount.io ",
        description: " Portfolio accounting. ",
      }),
    ).toEqual({
      title: "Stock & ETF Example — beancount.io",
      description: "Portfolio accounting.",
    });
  });

  it("uses the first prose paragraph, excluding frontmatter, badges, headings and code", () => {
    const readme =
      '---\ntitle: Metadata\n---\n\n# Stock ledger\n\n![build](https://example.org/badge)\n\n```bean\noption "title" "Code"\n```\n\nExplore **stock accounting** with [examples](https://example.org), `cost basis`,\nand dividends.\n\n## More';
    expect(resolveLedgerPresentation({ ...defaults, readme }).description).toBe(
      "Explore stock accounting with examples, cost basis, and dividends.",
    );
  });

  it("falls back for absent or non-prose README and ignores whitespace-only authored fields", () => {
    expect(
      resolveLedgerPresentation({
        ...defaults,
        title: " ",
        description: "\n",
        readme: "# Heading\n\n| Column |\n| --- |\n\n- List",
      }),
    ).toEqual({ title: "stock-example", description: "Financial overview" });
  });

  it("bounds a README-derived introduction without truncating an authored description", () => {
    const text = "Public ledger examples. ".repeat(30);
    expect(
      resolveLedgerPresentation({ ...defaults, readme: text }).description
        .length,
    ).toBeLessThanOrEqual(240);
    expect(
      resolveLedgerPresentation({ ...defaults, description: text }).description,
    ).toBe(text.trim());
  });
});
