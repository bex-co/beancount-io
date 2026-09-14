import { describe, expect, it } from "vitest";
import { receiptPostingAmounts } from "../use-receipt-workflow";

describe("receiptPostingAmounts", () => {
  it.each([
    ["25.50", "25.50", "-25.50"],
    ["0.00000001", "0.00000001", "-0.00000001"],
    ["1.005", "1.005", "-1.005"],
    ["123.456", "123.456", "-123.456"],
    ["12345678901234567890", "12345678901234567890", "-12345678901234567890"],
    ["1e-8", "0.00000001", "-0.00000001"],
  ])(
    "posts a typed %s as %s and %s, never rounded to two places",
    (typed, expense, payment) => {
      expect(receiptPostingAmounts(typed)).toEqual([expense, payment]);
    },
  );
});
