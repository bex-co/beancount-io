/**
 * Pins the m34 fetch-policy decisions so a silent revert to `network-only` on
 * a cold-start surface fails the suite rather than a subway ride.
 *
 * Source-text asserts: these modules use `@/` imports that jest-lite cannot
 * resolve, so we pin the declared constants and their use sites instead of
 * requiring the hooks.
 */
const fs = require("fs");
const path = require("path");

const read = (...parts: string[]) =>
  fs.readFileSync(path.join(__dirname, ...parts), "utf8");

describe("m34 fetch-policy pins", () => {
  it("pins Home balance sheet to cache-and-network", () => {
    const src = read("../../../screens/home-screen/hooks/use-balance-sheet.ts");
    expect(
      src.includes('BALANCE_SHEET_FETCH_POLICY = "cache-and-network"'),
    ).toBe(true);
    expect(src.includes("fetchPolicy: BALANCE_SHEET_FETCH_POLICY")).toBe(true);
  });

  it("pins Accounts trial balance to cache-and-network", () => {
    const src = read(
      "../../../screens/accounts-screen/hooks/use-trial-balance.ts",
    );
    expect(
      src.includes('TRIAL_BALANCE_FETCH_POLICY = "cache-and-network"'),
    ).toBe(true);
    expect(src.includes("fetchPolicy: TRIAL_BALANCE_FETCH_POLICY")).toBe(true);
  });

  it("pins Reports income statement to cache-and-network", () => {
    const src = read(
      "../../../screens/reports-screen/hooks/use-income-statement.ts",
    );
    expect(
      src.includes('INCOME_STATEMENT_FETCH_POLICY = "cache-and-network"'),
    ).toBe(true);
    expect(src.includes("fetchPolicy: INCOME_STATEMENT_FETCH_POLICY")).toBe(
      true,
    );
  });

  it("pins ledger meta default to cache-and-network", () => {
    const src = read("../../hooks/use-ledger-meta.ts");
    expect(src.includes('LEDGER_META_FETCH_POLICY = "cache-and-network"')).toBe(
      true,
    );
    expect(
      src.includes("options?.fetchPolicy ?? LEDGER_META_FETCH_POLICY"),
    ).toBe(true);
  });

  it("pins account report to cache-and-network", () => {
    const src = read(
      "../../../screens/accounts-screen/hooks/use-account-report.ts",
    );
    expect(
      src.includes('ACCOUNT_REPORT_FETCH_POLICY = "cache-and-network"'),
    ).toBe(true);
    expect(src.includes("fetchPolicy: ACCOUNT_REPORT_FETCH_POLICY")).toBe(true);
  });
});
