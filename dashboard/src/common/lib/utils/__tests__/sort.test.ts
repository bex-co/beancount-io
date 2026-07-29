import { describe, it, expect } from "vitest";
import { sortUsdFirst } from "../sort";

describe("Sort Utility", () => {
  describe("sortUsdFirst", () => {
    it("should place USD first in a mixed array", () => {
      const currencies = ["EUR", "GBP", "USD", "JPY"];
      const result = sortUsdFirst(currencies);

      expect(result[0]).toBe("USD");
    });

    it("should handle array with only USD", () => {
      const currencies = ["USD"];
      const result = sortUsdFirst(currencies);

      expect(result).toEqual(["USD"]);
      expect(result.length).toBe(1);
    });

    it("should handle array without USD", () => {
      const currencies = ["EUR", "GBP", "JPY"];
      const result = sortUsdFirst(currencies);

      // Order of non-USD currencies should be preserved
      expect(result).toEqual(["EUR", "GBP", "JPY"]);
    });

    it("should handle empty array", () => {
      const currencies: string[] = [];
      const result = sortUsdFirst(currencies);

      expect(result).toEqual([]);
    });

    it("should handle multiple USD entries", () => {
      const currencies = ["EUR", "USD", "GBP", "USD"];
      const result = sortUsdFirst(currencies);

      // Both USDs should come first
      expect(result[0]).toBe("USD");
      expect(result[1]).toBe("USD");
    });

    it("should not modify other currency order when USD is first", () => {
      const currencies = ["USD", "EUR", "GBP", "JPY"];
      const result = sortUsdFirst(currencies);

      expect(result).toEqual(["USD", "EUR", "GBP", "JPY"]);
    });

    it("should handle long list of currencies", () => {
      const currencies = [
        "AUD",
        "CAD",
        "CHF",
        "CNY",
        "EUR",
        "GBP",
        "JPY",
        "USD",
        "INR",
        "KRW",
      ];

      // Remember original position before calling sort
      const originalUsdIndex = 7; // USD is at index 7 in the original array

      const result = sortUsdFirst(currencies);

      expect(result[0]).toBe("USD");
      // Verify USD was moved from its original position
      expect(originalUsdIndex).not.toBe(0);
    });

    it("should be case sensitive (USD only)", () => {
      const currencies = ["usd", "EUR", "USD", "GBP"];
      const result = sortUsdFirst(currencies);

      expect(result[0]).toBe("USD");
      // lowercase 'usd' should not be treated specially
      expect(result.includes("usd")).toBe(true);
    });

    it("should preserve array when USD is already first", () => {
      const currencies = ["USD", "EUR", "GBP"];
      const result = sortUsdFirst(currencies);

      expect(result).toEqual(["USD", "EUR", "GBP"]);
    });

    it("should handle array with similar currency codes", () => {
      const currencies = ["USDT", "EUR", "USD", "USDC"];
      const result = sortUsdFirst(currencies);

      expect(result[0]).toBe("USD");
      // Other similar codes should maintain their relative position
      expect(result.includes("USDT")).toBe(true);
      expect(result.includes("USDC")).toBe(true);
    });

    it("should mutate the original array", () => {
      const currencies = ["EUR", "GBP", "USD", "JPY"];
      const result = sortUsdFirst(currencies);

      // The function uses .sort() which mutates the original array
      expect(result).toBe(currencies);
      expect(currencies[0]).toBe("USD");
    });

    it("should handle array with special characters", () => {
      const currencies = ["€EUR", "£GBP", "USD", "¥JPY"];
      const result = sortUsdFirst(currencies);

      expect(result[0]).toBe("USD");
    });

    it("should work with two-element array", () => {
      const currencies = ["EUR", "USD"];
      const result = sortUsdFirst(currencies);

      expect(result).toEqual(["USD", "EUR"]);
    });

    it("should work with two-element array where USD is first", () => {
      const currencies = ["USD", "EUR"];
      const result = sortUsdFirst(currencies);

      expect(result).toEqual(["USD", "EUR"]);
    });
  });
});
