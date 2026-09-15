import fs from "fs";
import path from "path";

describe("CategoryBreakdown signed amounts", () => {
  const source = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "screens",
      "reports-screen",
      "components",
      "category-breakdown.tsx",
    ),
    "utf8",
  );

  it("formats amounts with the signed currency helper", () => {
    expect(source.includes("formatSignedMoneyWithCurrency")).toBe(true);
    expect(source.includes("formatMoneyWithCurrency")).toBe(false);
  });
});
