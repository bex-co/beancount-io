import fs from "fs";
import path from "path";
import { BALANCE_CONVERSION } from "../../../../common/balance-util";

// w21/572: Home's Spending counted expenses in raw units while Reports and the
// dashboard count them at cost, so an expense posted at cost (5 VOO {400 USD})
// went "Not in total" on Home and was $2,000 on Reports.
const card = fs
  .readFileSync(
    path.join(__dirname, "..", "..", "components", "spending-card.tsx"),
    "utf8",
  )
  .replace(/\s+/g, "");

describe("Home's Spending conversion", () => {
  it("is the one Reports and the dashboard read, at cost", () => {
    expect(BALANCE_CONVERSION).toBe("at_cost");
  });

  // And of the whole-span read that tells an empty ledger apart (w21/789).
  it("is asked of the month-long, to-today and whole-span reads", () => {
    expect(card.split("conversion:BALANCE_CONVERSION,").length - 1).toBe(3);
    expect(card.includes('conversion:"units"')).toBe(false);
  });
});
