import { describe, expect, it } from "vitest";
import {
  applyAutoBalanceToPostings,
  computeAutoBalance,
  findUnresolvedEligibleAmount,
  formatInferredAmount,
} from "../transaction-auto-balance";

describe("computeAutoBalance", () => {
  it("ignores unused blank-account rows when inferring a residual", () => {
    const result = computeAutoBalance(
      [
        { account: "", amount: "100", currency: "MUSD" },
        { account: "Expenses:Cost", amount: "10", currency: "MUSD" },
        { account: "Assets:Cash", amount: "", currency: "MUSD" },
        { account: "", amount: "", currency: "MUSD" },
      ],
      "MUSD",
    );

    expect(result.incomplete).toBe(false);
    expect(result.balances.get(2)?.amount).toBe(-10);
    expect(result.balances.has(0)).toBe(false);
  });

  it("rejects multiple blank eligible amounts instead of inventing NaN", () => {
    const result = computeAutoBalance(
      [
        { account: "Expenses:A", amount: "10", currency: "MUSD" },
        { account: "Assets:Cash", amount: "", currency: "MUSD" },
        { account: "Expenses:B", amount: "", currency: "MUSD" },
      ],
      "MUSD",
    );

    expect(result.incomplete).toBe(true);
    expect(result.balances.size).toBe(0);
  });

  it("infers a single missing amount per currency including zeros", () => {
    const sameCurrency = computeAutoBalance(
      [
        { account: "A", amount: "10", currency: "MUSD" },
        { account: "B", amount: "-4", currency: "MUSD" },
        { account: "C", amount: "", currency: "MUSD" },
      ],
      "MUSD",
    );
    expect(sameCurrency.incomplete).toBe(false);
    expect(sameCurrency.balances.get(2)?.amount).toBe(-6);

    const zeros = computeAutoBalance(
      [
        { account: "A", amount: "0", currency: "MUSD" },
        { account: "B", amount: "0", currency: "MUSD" },
        { account: "C", amount: "", currency: "MUSD" },
      ],
      "MUSD",
    );
    expect(zeros.balances.get(2)?.amount).toBe(-0);
    expect(formatInferredAmount(zeros.balances.get(2)!.amount)).toBe("0");

    const multi = computeAutoBalance(
      [
        { account: "A", amount: "10", currency: "MUSD" },
        { account: "B", amount: "", currency: "MUSD" },
        { account: "C", amount: "5", currency: "USD" },
        { account: "D", amount: "", currency: "USD" },
      ],
      "MUSD",
    );
    expect(multi.incomplete).toBe(false);
    expect(multi.balances.get(1)?.amount).toBe(-10);
    expect(multi.balances.get(3)?.amount).toBe(-5);
  });
});

describe("applyAutoBalanceToPostings", () => {
  it("fills only eligible empty amounts and keeps precise fractional text", () => {
    const balances = new Map([[1, { amount: -0.0001, currency: "MUSD" }]]);
    const next = applyAutoBalanceToPostings(
      [
        { account: "Expenses:A", amount: "0.0001", currency: "MUSD" },
        { account: "Assets:Cash", amount: "", currency: "MUSD" },
        { account: "", amount: "", currency: "MUSD" },
      ],
      balances,
    );

    expect(next[1].amount).toBe("-0.0001");
    expect(next[2].amount).toBe("");
    expect(findUnresolvedEligibleAmount(next)).toBeNull();
  });

  it("detects unresolved eligible amounts after failed inference", () => {
    expect(
      findUnresolvedEligibleAmount([
        { account: "A", amount: "10", currency: "MUSD" },
        { account: "B", amount: "", currency: "MUSD" },
        { account: "C", amount: "", currency: "MUSD" },
      ]),
    ).toBe(1);
  });
});

describe("formatInferredAmount", () => {
  it("preserves fractional precision instead of rounding to two decimals", () => {
    expect(formatInferredAmount(-0.0001)).toBe("-0.0001");
    expect(formatInferredAmount(-0.12345)).toBe("-0.12345");
    expect(formatInferredAmount(-10.25)).toBe("-10.25");
  });
});
