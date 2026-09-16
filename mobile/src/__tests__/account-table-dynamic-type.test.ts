import fs from "fs";
import path from "path";

const SOURCE = fs.readFileSync(
  path.join(
    __dirname,
    "..",
    "components",
    "account-table",
    "account-table.tsx",
  ),
  "utf8",
);

describe("AccountTable at enlarged text sizes", () => {
  it("stacks name and balance above the shared Dynamic Type threshold", () => {
    expect(SOURCE.includes("prefersStackedLayout(fontScale)")).toBe(true);
    expect(SOURCE.includes("stacked && styles.rowStacked")).toBe(true);
    expect(SOURCE.includes("stacked && styles.stackedAmounts")).toBe(true);
  });

  it("does not truncate stacked account names to one line", () => {
    const stackedBlock = SOURCE.slice(
      SOURCE.indexOf("const content = stacked"),
      SOURCE.indexOf(") : ("),
    );
    expect(stackedBlock.includes("numberOfLines={1}")).toBe(false);
  });
});
