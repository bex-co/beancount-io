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

  it("preserves the recorded decimal scale", () => {
    expect(
      formatAmountWithCurrency({ number: "3.14159", currency: "USD" }),
    ).toBe("3.14159 USD");
  });

  it("keeps small nonzero quantities visible", () => {
    expect(formatAmountWithCurrency({ number: "0.004", currency: "ETH" })).toBe(
      "0.004 ETH",
    );
    expect(
      formatAmountWithCurrency({ number: "0.0230", currency: "USD" }),
    ).toBe("0.0230 USD");
  });

  it("leaves an integer amount untouched", () => {
    expect(formatAmountWithCurrency({ number: "42", currency: "JPY" })).toBe(
      "42 JPY",
    );
  });
});
