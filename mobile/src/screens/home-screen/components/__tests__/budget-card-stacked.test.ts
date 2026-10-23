import fs from "fs";
import path from "path";

// w21/685: beside the amounts, two budgets that share a parent both read
// "Housing…" at AX2.
describe("Home's budget panel rows at large text sizes", () => {
  const source = fs
    .readFileSync(path.join(__dirname, "..", "budget-card.tsx"), "utf8")
    .replace(/\s+/g, "");

  it("stacks the amounts under the account", () => {
    expect(
      source.includes("conststacked=prefersStackedLayout(fontScale);"),
    ).toBe(true);
    expect(source.includes("stacked&&styles.rowHeaderStacked")).toBe(true);
    expect(source.includes("stacked&&styles.amountsStacked")).toBe(true);
    expect(source.includes('rowHeaderStacked:{flexDirection:"column"')).toBe(
      true,
    );
  });

  it("still names the account in full for assistive tech", () => {
    expect(source.includes("accessibilityLabel={row.account}")).toBe(true);
  });
});
