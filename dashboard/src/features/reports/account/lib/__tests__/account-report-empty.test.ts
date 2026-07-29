import { describe, expect, it } from "vitest";
import { isAccountReportEmpty } from "../account-report-empty";

describe("isAccountReportEmpty", () => {
  it("treats missing, empty, and zero-filled reports as empty", () => {
    expect(isAccountReportEmpty(undefined)).toBe(true);
    expect(
      isAccountReportEmpty({
        accountBalanceData: [],
        intervalTotalsData: [],
      }),
    ).toBe(true);
    expect(
      isAccountReportEmpty({
        accountBalanceData: [{ balance: { USD: "0" } }],
        intervalTotalsData: [{ balance: {} }],
      }),
    ).toBe(true);
  });

  it("detects non-zero account report data", () => {
    expect(
      isAccountReportEmpty({
        accountBalanceData: [{ balance: { USD: "125.50" } }],
      }),
    ).toBe(false);
  });
});
