import fs from "fs";
import path from "path";
import {
  BALANCE_CONVERSION,
  resolveCurrencyBalance,
} from "../../../../common/balance-util";
import { notInTotalOf } from "../../../../common/balance-display";

// w21/726: Budget read its actuals in raw units, so shares given to charity
// (5 VOO {400.00 USD}) read "Actual $0.00 · Not in total: 5 VOO" while Spending
// and Reports counted $2,000.
describe("Budget actuals", () => {
  it("are read at cost, as Spending and Reports are", () => {
    const hook = fs
      .readFileSync(
        path.join(__dirname, "..", "..", "hooks", "use-budget-actuals.ts"),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(BALANCE_CONVERSION).toBe("at_cost");
    expect(hook.includes("conversion:BALANCE_CONVERSION,")).toBe(true);
    expect(hook.includes('"units"')).toBe(false);
  });

  it("count shares given at cost, and leave a euro bill not in total", () => {
    // The ledger's at-cost interval totals for the note's fixture, plus a
    // euro expense with no cost basis.
    const period = { USD: "2000", EUR: "50.00" };
    expect(resolveCurrencyBalance(period, "USD")).toBe(2000);
    expect(notInTotalOf(period, "USD").map((h) => h.currency)).toEqual(["EUR"]);
  });
});
