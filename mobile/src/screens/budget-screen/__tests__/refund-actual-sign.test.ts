import fs from "fs";
import path from "path";

// w21/539: both cards drew a refund month's Actual without its minus.
const read = (...parts: string[]) =>
  fs
    .readFileSync(path.join(__dirname, "..", "..", ...parts), "utf8")
    .replace(/\s+/g, "");

describe("a refund month's Actual on the budget cards", () => {
  it("is formatted with its sign on the Budget page's card", () => {
    expect(
      read("budget-screen", "components", "budget-group-card.tsx").includes(
        "{formatSignedMoneyWithCurrency(stats.actualExact,currency,false,scale,)}",
      ),
    ).toBe(true);
  });

  it("is formatted with its sign on Home's row", () => {
    expect(
      read("home-screen", "components", "budget-card.tsx").includes(
        "formatSignedMoneyWithCurrency(row.actualExact??row.actual,row.currency,false,row.scale)",
      ),
    ).toBe(true);
  });
});
