import { describe, expect, it } from "vitest";
import { formatAmountWithCurrency } from "../utils";

describe("formatAmountWithCurrency", () => {
  it("joins the formatted number and the currency with a single space", () => {
    expect(
      formatAmountWithCurrency({ number: "100.00", currency: "USD" }),
    ).toBe("100.00 USD");
  });

  it("strips grouping commas from the number (via formatAmount)", () => {
    expect(
      formatAmountWithCurrency({ number: "1,234.50", currency: "EUR" }),
    ).toBe("1234.50 EUR");
  });

  it("truncates to two decimal places", () => {
    expect(
      formatAmountWithCurrency({ number: "3.14159", currency: "USD" }),
    ).toBe("3.14 USD");
  });

  it("leaves an integer amount untouched", () => {
    expect(formatAmountWithCurrency({ number: "42", currency: "JPY" })).toBe(
      "42 JPY",
    );
  });
});
