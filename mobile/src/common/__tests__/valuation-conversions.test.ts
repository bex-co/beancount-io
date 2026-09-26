/**
 * Pins which reads value holdings at market and which at cost (w4/m26):
 * balances — Home, Accounts, account detail's header and chart — read
 * `VALUATION_CONVERSION`; flows and history — Reports and the journal — keep
 * `BALANCE_CONVERSION`. A revert of either half silently changes a figure the
 * other screens still disagree with, so it should fail here instead.
 *
 * Source-text asserts, like `apollo/__tests__/fetch-policies.test.ts`: these
 * modules use `@/` imports that jest-lite cannot resolve.
 */
import { BALANCE_CONVERSION, VALUATION_CONVERSION } from "../balance-util";

const fs = require("fs");
const path = require("path");

const read = (...parts: string[]) =>
  fs.readFileSync(path.join(__dirname, "../../screens", ...parts), "utf8");

describe("valuation conversions", () => {
  it("values balances at market and flows at cost", () => {
    expect(VALUATION_CONVERSION).toBe("at_value");
    expect(BALANCE_CONVERSION).toBe("at_cost");
  });

  it("reads Home's balance sheet at market", () => {
    const src = read("home-screen/hooks/use-balance-sheet.ts");
    expect(src.includes("conversion: VALUATION_CONVERSION")).toBe(true);
  });

  it("measures Home against the same series at cost and in units", () => {
    const src = read("home-screen/hooks/use-balance-sheet-basis.ts");
    expect(src.includes("costConversion: BALANCE_CONVERSION")).toBe(true);
    expect(src.includes('unitsConversion: "units"')).toBe(true);
  });

  it("defaults the Accounts trial balance and the account report to market", () => {
    for (const file of [
      "accounts-screen/hooks/use-trial-balance.ts",
      "accounts-screen/hooks/use-account-report.ts",
    ]) {
      expect(
        read(file).includes("conversion: string = VALUATION_CONVERSION"),
      ).toBe(true);
    }
  });

  it("keeps Reports and the account journal at cost", () => {
    expect(
      read("reports-screen/hooks/use-income-statement.ts").includes(
        "conversion: BALANCE_CONVERSION",
      ),
    ).toBe(true);
    expect(
      read("account-detail-screen/account-detail-screen.tsx").includes(
        'const journalConversion = unitsCurrency ? "units" : BALANCE_CONVERSION;',
      ),
    ).toBe(true);
  });
});
