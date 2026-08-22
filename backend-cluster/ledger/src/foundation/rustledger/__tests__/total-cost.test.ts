import {
  perUnitFromTotalCost,
  perUnitFromTotalCostString,
} from "../total-cost";

describe("total-cost Python Decimal context", () => {
  it("rounds inexact division to 28 significant digits, not decimal places", () => {
    expect(perUnitFromTotalCostString("1000.00", "3")).toBe(
      "333.3333333333333333333333333",
    );
  });

  it("preserves exact-result scale and divides by absolute units", () => {
    expect(perUnitFromTotalCostString("1000.00", "-10")).toBe("100.00");
    expect(perUnitFromTotalCost("1000.00", "0")).toBeNull();
  });
});
