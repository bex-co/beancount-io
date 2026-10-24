import {
  commentSkippedLines,
  parseableFiles,
  withLeadingZeros,
} from "../parseable-files";

/**
 * w21/654. Beancount skips a whole line starting with `*`, `#`, `:`, `!`, `&`,
 * `?` or `%`; rustledger read a `"` on an org heading as an open string and
 * silently lost every entry after it. The live engine run is in
 * `scripts/verify-rustledger.ts`.
 */
describe("commentSkippedLines", () => {
  it("turns each line Beancount skips into a comment of the same length", () => {
    const source = [
      '* Notes: 12" pizza budget',
      "# It's 5\" wide",
      ': a "drawer',
      "! a",
      "& a",
      "? a",
      "% a",
      '2024-01-02 * "after"',
      "  Assets:Cash 1 USD",
      "  * Equity:Open",
      "",
    ].join("\n");
    const commented = commentSkippedLines(source);
    expect(commented.split("\n")).toEqual([
      '; Notes: 12" pizza budget',
      "; It's 5\" wide",
      '; a "drawer',
      "; a",
      "; a",
      "; a",
      "; a",
      '2024-01-02 * "after"',
      "  Assets:Cash 1 USD",
      // A flagged posting is indented, not a skipped line.
      "  * Equity:Open",
      "",
    ]);
    expect(commented).toHaveLength(source.length);
  });

  it("leaves a line inside a multi-line string, and a quote in a comment, alone", () => {
    const source = [
      '2024-01-01 note Assets:Cash "agenda:',
      "* first item",
      '# second item"',
      '; she said "hold',
      "* a real heading",
      "",
    ].join("\n");
    expect(commentSkippedLines(source).split("\n")).toEqual([
      '2024-01-01 note Assets:Cash "agenda:',
      "* first item",
      '# second item"',
      '; she said "hold',
      "; a real heading",
      "",
    ]);
  });

  it("returns a map with no such line unchanged", () => {
    const files = { "main.bean": '2024-01-01 open Assets:Cash\n; "quoted"\n' };
    expect(parseableFiles(files, "main.bean")).toBe(files);
    expect(
      parseableFiles({ "main.bean": "* Heading\n" }, "main.bean")["main.bean"],
    ).toBe("; Heading\n");
  });
});

// w21/969: rustledger kept `.5` as 5 with a parse error, ten times the amount.
describe("withLeadingZeros", () => {
  it("gives a number its leading zero, signed or not", () => {
    expect(withLeadingZeros("  Expenses:T  .5 USD")).toBe(
      "  Expenses:T  0.5 USD",
    );
    expect(withLeadingZeros("  Assets:A  -.5 USD")).toBe(
      "  Assets:A  -0.5 USD",
    );
    expect(withLeadingZeros("  Assets:A  +.25 USD")).toBe(
      "  Assets:A  +0.25 USD",
    );
    expect(withLeadingZeros("  A  (1 + .5) USD @ .25 EUR")).toBe(
      "  A  (1 + 0.5) USD @ 0.25 EUR",
    );
  });

  it("leaves strings, comments, tags and ordinary numbers alone", () => {
    const source = [
      '2026-10-01 * "Order .5 kg" "ratio .75" #a.5 ^b.5',
      "  Expenses:Food  1.50 USD ; was .5",
      "  Assets:Cash  -1.50 USD",
    ].join("\n");
    expect(withLeadingZeros(source)).toBe(source);
  });

  it("is applied to the files the engine parses, and nothing else changes", () => {
    const files = { "main.bean": "  A  .5 USD" };
    expect(parseableFiles(files, "main.bean")["main.bean"]).toBe(
      "  A  0.5 USD",
    );
    const plain = { "main.bean": "  A  0.5 USD" };
    expect(parseableFiles(plain, "main.bean")).toBe(plain);
  });
});
