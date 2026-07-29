import { describe, it, expect } from "vitest";
import { formatDateISO, formatDateTime, formatAmount } from "../";

describe("Format Utility", () => {
  describe("formatDateISO", () => {
    it("should format date as YYYY-MM-DD", () => {
      expect(formatDateISO("2024-01-15")).toBe("2024-01-15");
      expect(formatDateISO("2024-12-31")).toBe("2024-12-31");
    });

    it("should zero-pad single digit months and days", () => {
      expect(formatDateISO("2024-03-05")).toBe("2024-03-05");
      expect(formatDateISO("2024-09-08")).toBe("2024-09-08");
    });

    it("should handle ISO 8601 format with timezone", () => {
      expect(formatDateISO("2024-06-15T00:00:00Z")).toBe("2024-06-15");
      expect(formatDateISO("2024-06-15T12:30:45Z")).toBe("2024-06-15");
    });

    it("should handle leap year dates", () => {
      expect(formatDateISO("2024-02-29")).toBe("2024-02-29");
    });

    it("should handle different years", () => {
      expect(formatDateISO("2020-05-15")).toBe("2020-05-15");
      expect(formatDateISO("2021-05-15")).toBe("2021-05-15");
      expect(formatDateISO("2024-05-15")).toBe("2024-05-15");
    });

    it("should return null for null input", () => {
      expect(formatDateISO(null)).toBeNull();
    });

    it("should return null for undefined input", () => {
      expect(formatDateISO(undefined)).toBeNull();
    });

    it("should return null for empty string", () => {
      expect(formatDateISO("")).toBeNull();
    });

    it("should return null for invalid date string", () => {
      expect(formatDateISO("invalid-date")).toBeNull();
    });

    it("should handle edge of year dates", () => {
      expect(formatDateISO("2024-01-01")).toBe("2024-01-01");
      expect(formatDateISO("2024-12-31")).toBe("2024-12-31");
    });

    it("should produce consistent output for the same date", () => {
      const result1 = formatDateISO("2024-06-15");
      const result2 = formatDateISO("2024-06-15");
      expect(result1).toBe(result2);
    });
  });

  describe("formatDateTime", () => {
    it("should format a valid date string with time", () => {
      const result = formatDateTime("2024-03-15T14:30:00.000Z");
      expect(result).toMatch(/Mar/);
      expect(result).toMatch(/15/);
      expect(result).toMatch(/2024/);
    });

    it("should return null for null input", () => {
      expect(formatDateTime(null)).toBeNull();
    });

    it("should return null for undefined input", () => {
      expect(formatDateTime(undefined)).toBeNull();
    });

    it("should return null for invalid date string", () => {
      expect(formatDateTime("invalid-date")).toBeNull();
    });
  });

  describe("formatAmount", () => {
    it("should remove commas from amount", () => {
      expect(formatAmount("1,234.56")).toBe("1234.56");
      expect(formatAmount("12,345,678.90")).toBe("12345678.90");
    });

    it("should handle amounts without commas", () => {
      expect(formatAmount("1234.56")).toBe("1234.56");
      expect(formatAmount("999.99")).toBe("999.99");
    });

    it("should handle amounts without decimal point", () => {
      expect(formatAmount("1234")).toBe("1234");
      expect(formatAmount("1,234")).toBe("1234");
      expect(formatAmount("1,234,567")).toBe("1234567");
    });

    it("should keep amounts with 1 decimal place", () => {
      expect(formatAmount("123.4")).toBe("123.4");
      expect(formatAmount("1,234.5")).toBe("1234.5");
    });

    it("should keep amounts with 2 decimal places", () => {
      expect(formatAmount("123.45")).toBe("123.45");
      expect(formatAmount("1,234.56")).toBe("1234.56");
    });

    it("should truncate amounts with more than 2 decimal places", () => {
      expect(formatAmount("123.456")).toBe("123.45");
      expect(formatAmount("123.4567")).toBe("123.45");
      expect(formatAmount("123.999")).toBe("123.99");
      expect(formatAmount("1,234.56789")).toBe("1234.56");
    });

    it("should handle zero values", () => {
      expect(formatAmount("0")).toBe("0");
      expect(formatAmount("0.00")).toBe("0.00");
      expect(formatAmount("0.000")).toBe("0.00");
    });

    it("should handle negative amounts", () => {
      expect(formatAmount("-123.45")).toBe("-123.45");
      expect(formatAmount("-1,234.56")).toBe("-1234.56");
      expect(formatAmount("-123.456")).toBe("-123.45");
    });

    it("should handle amounts with only decimal part", () => {
      expect(formatAmount(".45")).toBe(".45");
      expect(formatAmount(".456")).toBe(".45");
    });

    it("should handle edge case with empty decimal part", () => {
      expect(formatAmount("123.")).toBe("123.");
    });

    it("should handle very small amounts", () => {
      expect(formatAmount("0.01")).toBe("0.01");
      expect(formatAmount("0.001")).toBe("0.00");
      expect(formatAmount("0.999")).toBe("0.99");
    });

    it("should handle very large amounts", () => {
      expect(formatAmount("999,999,999.99")).toBe("999999999.99");
      expect(formatAmount("1,000,000.001")).toBe("1000000.00");
    });
  });
});
