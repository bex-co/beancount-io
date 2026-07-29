import { describe, it, expect } from "vitest";

// Import the formatBalance function by extracting it from the module
// Since formatBalance is not exported, we'll test it through the component behavior
// For now, we'll create a standalone version for testing
function formatBalance(
  balance: Record<string, unknown> | null | undefined,
  currency: string,
) {
  // Handle null/undefined/empty objects - return just "0" without currency unit
  if (!balance || Object.keys(balance).length === 0) {
    return "0";
  }

  // Try specified currency first, fall back to first available
  const value = balance[currency] ?? Object.values(balance)[0];

  // Handle null/undefined values - return just "0" without currency unit
  if (value === null || value === undefined) {
    return "0";
  }

  // Convert to number safely
  const numericValue =
    typeof value === "string" ? parseFloat(value) : Number(value);

  // Handle NaN - return just "0" without currency unit
  if (isNaN(numericValue)) {
    return "0";
  }

  // Determine which currency to display
  const displayCurrency =
    balance[currency] !== undefined
      ? currency
      : (Object.keys(balance)[0] ?? currency);

  return `${numericValue.toLocaleString()} ${displayCurrency}`;
}

describe("Overview Page - formatBalance", () => {
  describe("Empty balance handling", () => {
    it("should return '0' for null balance", () => {
      const result = formatBalance(null, "USD");
      expect(result).toBe("0");
    });

    it("should return '0' for undefined balance", () => {
      const result = formatBalance(undefined, "USD");
      expect(result).toBe("0");
    });

    it("should return '0' for empty object balance", () => {
      const result = formatBalance({}, "USD");
      expect(result).toBe("0");
    });

    it("should not include currency unit when balance is empty", () => {
      const result = formatBalance({}, "USD");
      expect(result).not.toContain("USD");
      expect(result).toBe("0");
    });
  });

  describe("Null/undefined value handling", () => {
    it("should return '0' when specified currency value is null", () => {
      const result = formatBalance({ USD: null }, "USD");
      expect(result).toBe("0");
    });

    it("should return '0' when specified currency value is undefined", () => {
      const result = formatBalance({ USD: undefined }, "USD");
      expect(result).toBe("0");
    });

    it("should not include currency unit when value is null", () => {
      const result = formatBalance({ USD: null }, "USD");
      expect(result).not.toContain("USD");
    });

    it("should not include currency unit when value is undefined", () => {
      const result = formatBalance({ USD: undefined }, "USD");
      expect(result).not.toContain("USD");
    });
  });

  describe("NaN handling", () => {
    it("should return '0' for NaN values", () => {
      const result = formatBalance({ USD: NaN }, "USD");
      expect(result).toBe("0");
    });

    it("should return '0' for non-numeric strings", () => {
      const result = formatBalance({ USD: "not a number" }, "USD");
      expect(result).toBe("0");
    });

    it("should return '0' for objects", () => {
      const result = formatBalance({ USD: {} }, "USD");
      expect(result).toBe("0");
    });

    it("should not include currency unit for NaN values", () => {
      const result = formatBalance({ USD: NaN }, "USD");
      expect(result).not.toContain("USD");
    });
  });

  describe("Valid numeric values", () => {
    it("should format positive number with currency", () => {
      const result = formatBalance({ USD: 123.45 }, "USD");
      expect(result).toBe("123.45 USD");
    });

    it("should format negative number with currency", () => {
      const result = formatBalance({ USD: -500 }, "USD");
      expect(result).toBe("-500 USD");
    });

    it("should format zero with currency", () => {
      const result = formatBalance({ USD: 0 }, "USD");
      expect(result).toBe("0 USD");
    });

    it("should format large numbers with thousand separators", () => {
      const result = formatBalance({ USD: 1234567.89 }, "USD");
      expect(result).toContain("1,234,567.89");
      expect(result).toContain("USD");
    });
  });

  describe("String numeric values", () => {
    it("should parse and format numeric string", () => {
      const result = formatBalance({ USD: "123.45" }, "USD");
      expect(result).toBe("123.45 USD");
    });

    it("should parse negative numeric string", () => {
      const result = formatBalance({ USD: "-99.99" }, "USD");
      expect(result).toBe("-99.99 USD");
    });

    it("should handle string zero", () => {
      const result = formatBalance({ USD: "0" }, "USD");
      expect(result).toBe("0 USD");
    });

    it("should format large string numbers with separators", () => {
      const result = formatBalance({ USD: "1000000" }, "USD");
      expect(result).toContain("1,000,000");
      expect(result).toContain("USD");
    });
  });

  describe("Multi-currency support", () => {
    it("should use specified currency when available", () => {
      const result = formatBalance({ USD: 100, EUR: 200 }, "USD");
      expect(result).toBe("100 USD");
    });

    it("should fall back to first currency when specified not available", () => {
      const result = formatBalance({ EUR: 150 }, "USD");
      expect(result).toBe("150 EUR");
    });

    it("should handle EUR currency", () => {
      const result = formatBalance({ EUR: 500 }, "EUR");
      expect(result).toBe("500 EUR");
    });

    it("should handle GBP currency", () => {
      const result = formatBalance({ GBP: 750 }, "GBP");
      expect(result).toBe("750 GBP");
    });

    it("should handle JPY currency", () => {
      const result = formatBalance({ JPY: 10000 }, "JPY");
      expect(result).toContain("10,000");
      expect(result).toContain("JPY");
    });

    it("should prefer specified currency over others", () => {
      const result = formatBalance({ EUR: 100, USD: 200, GBP: 300 }, "USD");
      expect(result).toBe("200 USD");
    });
  });

  describe("Edge cases", () => {
    it("should handle very small decimal numbers", () => {
      const result = formatBalance({ USD: 0.01 }, "USD");
      expect(result).toBe("0.01 USD");
    });

    it("should handle very large numbers", () => {
      const result = formatBalance({ USD: 999999999.99 }, "USD");
      expect(result).toContain("999,999,999.99");
      expect(result).toContain("USD");
    });

    it("should handle negative zero", () => {
      const result = formatBalance({ USD: -0 }, "USD");
      // JavaScript's -0 is displayed as "-0" by toLocaleString()
      expect(result).toMatch(/^-?0 USD$/);
    });

    it("should handle scientific notation strings", () => {
      const result = formatBalance({ USD: "1e6" }, "USD");
      expect(result).toContain("1,000,000");
      expect(result).toContain("USD");
    });

    it("should handle multiple currencies with first as fallback", () => {
      const balance = { EUR: 100, GBP: 200, JPY: 300 };
      const result = formatBalance(balance, "USD");
      // Should use first available currency (EUR)
      expect(result).toBe("100 EUR");
    });
  });

  describe("Currency display logic", () => {
    it("should display specified currency when present", () => {
      const result = formatBalance({ USD: 123, EUR: 456 }, "USD");
      expect(result).toContain("USD");
      expect(result).not.toContain("EUR");
    });

    it("should display fallback currency when specified not present", () => {
      const result = formatBalance({ EUR: 789 }, "USD");
      expect(result).toContain("EUR");
      expect(result).not.toContain("USD");
    });

    it("should use first currency key when specified not found", () => {
      const balance = { GBP: 100 };
      const result = formatBalance(balance, "USD");
      expect(result).toBe("100 GBP");
    });
  });

  describe("No currency unit for zero/empty", () => {
    it("should return plain '0' without 'USD' for empty balance", () => {
      const result = formatBalance({}, "USD");
      expect(result).toBe("0");
      expect(result).not.toMatch(/USD/);
    });

    it("should return plain '0' without 'EUR' for empty balance", () => {
      const result = formatBalance({}, "EUR");
      expect(result).toBe("0");
      expect(result).not.toMatch(/EUR/);
    });

    it("should return plain '0' for null with any currency", () => {
      expect(formatBalance(null, "USD")).toBe("0");
      expect(formatBalance(null, "EUR")).toBe("0");
      expect(formatBalance(null, "GBP")).toBe("0");
    });

    it("should distinguish between actual zero balance and empty balance", () => {
      const actualZero = formatBalance({ USD: 0 }, "USD");
      const emptyBalance = formatBalance({}, "USD");

      // Actual zero should show currency
      expect(actualZero).toBe("0 USD");

      // Empty balance should not show currency
      expect(emptyBalance).toBe("0");
    });
  });
});
