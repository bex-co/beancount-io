import {
  commentSkippedLines,
  parseableFiles,
  withLeadingZeros,
  withStockToleranceFromCost,
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

// w31/139: Beancount reads `on` as true and any other value it does not know
// as false; rustledger refused both and left the flag off.
describe("withStockToleranceFromCost", () => {
  const option = (value: string) =>
    `option "infer_tolerance_from_cost" "${value}"`;

  it("writes a value the engine refuses as the TRUE or FALSE Beancount reads", () => {
    for (const value of ["on", "ON", "On"]) {
      expect(withStockToleranceFromCost(option(value))).toBe(option("TRUE"));
    }
    for (const value of ["yes", "YES", "maybe", "off", "", " 1", "01"]) {
      expect(withStockToleranceFromCost(option(value))).toBe(option("FALSE"));
    }
    expect(
      withStockToleranceFromCost(
        '  option   "infer_tolerance_from_cost" "on" ; x',
      ),
    ).toBe('  option   "infer_tolerance_from_cost" "TRUE" ; x');
  });

  it("leaves a value both engines read alike, and every other option, alone", () => {
    const source = [
      option("TRUE"),
      option("true"),
      option("False"),
      option("1"),
      option("0"),
      'option "render_commas" "on"',
      'option "title" "infer_tolerance_from_cost"',
      "",
    ].join("\n");
    expect(withStockToleranceFromCost(source)).toBe(source);
  });

  it("leaves a comment, a multi-line string and an escaped value alone", () => {
    const source = [
      `; ${option("on")}`,
      '2024-01-01 note Assets:Cash "first line',
      option("on"),
      'last line"',
      'option "infer_tolerance_from_cost" "o\\n"',
      'option "infer_tolerance_from_cost" "two',
      'lines"',
      "",
    ].join("\n");
    expect(withStockToleranceFromCost(source)).toBe(source);
  });

  it("is applied to the files the engine parses, includes too", () => {
    const files = {
      "main.bean": `${option("on")}\ninclude "b.bean"\n`,
      "b.bean": `${option("maybe")}\n`,
    };
    expect(parseableFiles(files, "main.bean")).toEqual({
      "main.bean": `${option("TRUE")}\ninclude "b.bean"\n`,
      "b.bean": `${option("FALSE")}\n`,
    });
    const plain = { "main.bean": `${option("TRUE")}\n` };
    expect(parseableFiles(plain, "main.bean")).toBe(plain);
  });
});
