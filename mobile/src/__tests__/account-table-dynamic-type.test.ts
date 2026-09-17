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

describe("AccountTable balance at the default text size", () => {
  // The unit runner cannot lay text out, so this checks the props on the one
  // balance element: without them a 21+ character figure wraps mid-number
  // with its sign stranded above it (w1/034).
  const openTag = (() => {
    const start = SOURCE.indexOf("<AmountText");
    const end = SOURCE.indexOf(">", start);
    if (start === -1 || end === -1) {
      throw new Error("balance AmountText not found");
    }
    return SOURCE.slice(start, end);
  })();

  it("renders the balance with the shared shrink-to-fit props", () => {
    expect(openTag.includes("{...HERO_AMOUNT_FIT}")).toBe(true);
  });

  it("never ellipsizes balance digits", () => {
    expect(openTag.includes("ellipsizeMode")).toBe(false);
  });
});
