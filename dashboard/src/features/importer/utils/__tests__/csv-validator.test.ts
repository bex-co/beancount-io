import { describe, it, expect } from "vitest";
import {
  isValidDateFormat,
  parseDate,
  formatImportDate,
  parseAmount,
  isValidRowFormat,
  isHeaderRow,
  validateDescription,
  validatePayee,
} from "../csv-validator";

describe("csv-validator", () => {
  describe("isValidDateFormat", () => {
    it("should return true for valid YYYY-MM-DD format", () => {
      expect(isValidDateFormat("2024-01-15")).toBe(true);
    });

    it("should return true for another valid date", () => {
      expect(isValidDateFormat("2000-12-31")).toBe(true);
    });

    it("should return false for MM/DD/YYYY format", () => {
      expect(isValidDateFormat("01/15/2024")).toBe(false);
    });

    it("should return false for DD-MM-YYYY format", () => {
      expect(isValidDateFormat("15-01-2024")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isValidDateFormat("")).toBe(false);
    });

    it("should return false for partial date", () => {
      expect(isValidDateFormat("2024-01")).toBe(false);
    });

    it("should return false for text string", () => {
      expect(isValidDateFormat("January 15, 2024")).toBe(false);
    });

    it("should return false for date with extra characters", () => {
      expect(isValidDateFormat(" 2024-01-15")).toBe(false);
    });
  });

  describe("parseDate", () => {
    it("should return valid: true and a Date for a correct date string", () => {
      const result = parseDate("2024-06-15");
      expect(result.valid).toBe(true);
      expect(result.date).toBeInstanceOf(Date);
      expect(result.error).toBeUndefined();
    });

    it("should return valid: false for wrong format", () => {
      const result = parseDate("15/06/2024");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid date format. Expected YYYY-MM-DD");
    });

    it("should return valid: false for empty string", () => {
      const result = parseDate("");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid date format. Expected YYYY-MM-DD");
    });

    it("should return valid: true for a leap day in a leap year", () => {
      const result = parseDate("2024-02-29");
      expect(result.valid).toBe(true);
    });

    it("should reject Feb 29 outside a leap year (no silent roll to Mar 1)", () => {
      const result = parseDate("2023-02-29");
      expect(result.valid).toBe(false);
      expect(result.date).toBeUndefined();
      expect(result.error).toBe("Invalid date value");
    });

    it("should reject impossible calendar days like Apr 31", () => {
      const result = parseDate("2024-04-31");
      expect(result.valid).toBe(false);
      expect(result.date).toBeUndefined();
      expect(result.error).toBe("Invalid date value");
    });

    it("should keep the local calendar day equal to the YYYY-MM-DD string", () => {
      const result = parseDate("2024-06-15");
      expect(result.valid).toBe(true);
      expect(result.date?.getFullYear()).toBe(2024);
      expect(result.date?.getMonth()).toBe(5);
      expect(result.date?.getDate()).toBe(15);
    });
  });

  describe("formatImportDate", () => {
    it("formats by local calendar day, not UTC ISO", () => {
      // Local midnight June 15 — toISOString() is the previous UTC day east
      // of Greenwich; local getters must still yield 2024-06-15.
      expect(formatImportDate(new Date(2024, 5, 15))).toBe("2024-06-15");
    });

    it("round-trips through parseDate", () => {
      const parsed = parseDate("2024-06-15");
      expect(parsed.valid).toBe(true);
      expect(formatImportDate(parsed.date!)).toBe("2024-06-15");
    });
  });

  describe("parseAmount", () => {
    it("should parse a positive number", () => {
      const result = parseAmount("123.45");
      expect(result.valid).toBe(true);
      expect(result.amount).toBe(123.45);
    });

    it("should parse a negative number", () => {
      const result = parseAmount("-50.00");
      expect(result.valid).toBe(true);
      expect(result.amount).toBe(-50);
    });

    it("should parse an integer string", () => {
      const result = parseAmount("42");
      expect(result.valid).toBe(true);
      expect(result.amount).toBe(42);
    });

    it("should return valid: false for empty string", () => {
      const result = parseAmount("");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Amount cannot be empty");
    });

    it("should return valid: false for whitespace-only string", () => {
      const result = parseAmount("   ");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Amount cannot be empty");
    });

    it("should return valid: false for non-numeric string", () => {
      const result = parseAmount("abc");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Amount must be a valid number");
    });

    it("should return valid: false for Infinity", () => {
      const result = parseAmount("Infinity");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Amount must be a valid number");
    });

    it("should trim whitespace before parsing", () => {
      const result = parseAmount("  99.9  ");
      expect(result.valid).toBe(true);
      expect(result.amount).toBe(99.9);
    });

    it("should parse zero", () => {
      const result = parseAmount("0");
      expect(result.valid).toBe(true);
      expect(result.amount).toBe(0);
    });
  });

  describe("isValidRowFormat", () => {
    it("should return true for an array of exactly 4 columns", () => {
      expect(
        isValidRowFormat(["2024-01-01", "Payee", "Description", "10.0"]),
      ).toBe(true);
    });

    it("should return false for fewer than 4 columns", () => {
      expect(isValidRowFormat(["2024-01-01", "Payee", "Description"])).toBe(
        false,
      );
    });

    it("should return false for more than 4 columns", () => {
      expect(isValidRowFormat(["a", "b", "c", "d", "e"])).toBe(false);
    });

    it("should return false for empty array", () => {
      expect(isValidRowFormat([])).toBe(false);
    });
  });

  describe("isHeaderRow", () => {
    it("should detect header row with 'date' and 'payee'", () => {
      expect(isHeaderRow("Date,Payee,Description,Amount")).toBe(true);
    });

    it("should detect header row with 'date' and 'description'", () => {
      expect(isHeaderRow("date,description,amount")).toBe(true);
    });

    it("should detect header row with 'date' and 'amount'", () => {
      expect(isHeaderRow("date,narration,amount")).toBe(true);
    });

    it("should be case-insensitive", () => {
      expect(isHeaderRow("DATE,PAYEE,AMOUNT")).toBe(true);
    });

    it("should return false for a data row", () => {
      expect(isHeaderRow("2024-01-15,Coffee Shop,Morning coffee,5.00")).toBe(
        false,
      );
    });

    it("should return false when only 'date' is present without payee/description/amount", () => {
      expect(isHeaderRow("date,time,location")).toBe(false);
    });
  });

  describe("validateDescription", () => {
    it("should return valid: true for a normal description", () => {
      const result = validateDescription("Morning coffee");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return valid: false for empty string", () => {
      const result = validateDescription("");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Description cannot be empty");
    });

    it("should return valid: false for whitespace-only string", () => {
      const result = validateDescription("   ");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Description cannot be empty");
    });

    it("should return valid: true for single-character description", () => {
      const result = validateDescription("X");
      expect(result.valid).toBe(true);
    });
  });

  describe("validatePayee", () => {
    it("should return valid: true for a normal payee name", () => {
      const result = validatePayee("Starbucks");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return valid: false for empty string", () => {
      const result = validatePayee("");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Payee cannot be empty");
    });

    it("should return valid: false for whitespace-only string", () => {
      const result = validatePayee("   ");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Payee cannot be empty");
    });

    it("should return valid: true for payee with special characters", () => {
      const result = validatePayee("AT&T Inc.");
      expect(result.valid).toBe(true);
    });
  });
});
