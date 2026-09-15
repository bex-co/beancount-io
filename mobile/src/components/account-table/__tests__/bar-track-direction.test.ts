import fs from "fs";
import path from "path";

/**
 * Static guardrail: the Accounts magnitude bar is anchored to the leading
 * edge. The row's label indents with logical padding and mirrors in RTL, but
 * the bar used a physical `left`, so in Persian it sat under the balances and
 * indented backwards.
 */
describe("AccountTable magnitude bar", () => {
  it("offsets from the start edge, like the label it sits under", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "account-table.tsx"),
      "utf8",
    );
    expect(
      source.includes("{ start: GUTTER + (row.depth + 1) * INDENT_STEP }"),
    ).toBe(true);
    expect(source.includes("left: GUTTER + (row.depth + 1)")).toBe(false);
  });
});
