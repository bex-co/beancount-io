import { describe, it, expect, afterAll, beforeAll } from "vitest";
import {
  isValidDateFormat,
  parseDate,
  parseAmount,
  isValidRowFormat,
  detectHeaderRow,
  validateDescription,
  validatePayee,
  buildParsedRow,
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
    it("should return valid: true and the canonical day for a correct date string", () => {
      const result = parseDate("2024-06-15");
      expect(result.valid).toBe(true);
      expect(result.isoDate).toBe("2024-06-15");
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
      expect(result.isoDate).toBeUndefined();
      expect(result.error).toBe("Invalid date value");
    });

    it("should accept Feb 29 in a century leap year and reject it in a non-leap century", () => {
      expect(parseDate("2000-02-29").valid).toBe(true);
      expect(parseDate("1900-02-29").valid).toBe(false);
    });

    it("should reject impossible calendar days like Apr 31", () => {
      const result = parseDate("2024-04-31");
      expect(result.valid).toBe(false);
      expect(result.isoDate).toBeUndefined();
      expect(result.error).toBe("Invalid date value");
    });

    it("should reject a zero month, a month past December, and day zero", () => {
      expect(parseDate("2024-00-10").error).toBe("Invalid date value");
      expect(parseDate("2024-13-10").error).toBe("Invalid date value");
      expect(parseDate("2024-01-00").error).toBe("Invalid date value");
    });

    it("should accept the last day of every month", () => {
      const lastDays = [
        "2024-01-31",
        "2024-02-29",
        "2024-03-31",
        "2024-04-30",
        "2024-05-31",
        "2024-06-30",
        "2024-07-31",
        "2024-08-31",
        "2024-09-30",
        "2024-10-31",
        "2024-11-30",
        "2024-12-31",
      ];
      for (const day of lastDays) {
        expect(parseDate(day).valid, day).toBe(true);
      }
    });
  });

  // Pacific/Apia jumped the dateline at the end of 2011: the civil day
  // 2011-12-30 never existed locally, and local midnight 1900-01-01 does not
  // exist either. A Date round-trip rejected those valid ledger dates.
  describe("parseDate in a zone with skipped civil days", () => {
    const originalTZ = process.env.TZ;

    beforeAll(() => {
      process.env.TZ = "Pacific/Apia";
    });

    afterAll(() => {
      process.env.TZ = originalTZ;
    });

    it("accepts a calendar day the browser zone skipped", () => {
      // Guard: the environment really does skip this local day.
      expect(new Date(2011, 11, 30).getDate()).not.toBe(30);

      const result = parseDate("2011-12-30");
      expect(result.valid).toBe(true);
      expect(result.isoDate).toBe("2011-12-30");
      expect(result.error).toBeUndefined();
    });

    it("still rejects impossible calendar days", () => {
      expect(parseDate("2011-02-30").valid).toBe(false);
      expect(parseDate("2011-12-32").valid).toBe(false);
    });

    it("builds an error-free row for a skipped civil day", () => {
      const row = buildParsedRow({
        date: "2011-12-30",
        payee: "QA Apia",
        description: "Dateline jump",
        amountInput: "-1.00",
      });
      expect(row.errors).toBeUndefined();
      expect(row.date).toBe("2011-12-30");
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

    it("rejects grouped tokens instead of truncating to a prefix", () => {
      expect(parseAmount("-1,234.56").valid).toBe(false);
      expect(parseAmount("1,000").valid).toBe(false);
    });

    it("rejects trailing junk instead of accepting a numeric prefix", () => {
      expect(parseAmount("12oops").valid).toBe(false);
      expect(parseAmount("12.5usd").valid).toBe(false);
    });

    it("accepts fractional and signed scientific forms", () => {
      expect(parseAmount(".5")).toEqual({ valid: true, amount: 0.5 });
      expect(parseAmount("+2.5e1")).toEqual({ valid: true, amount: 25 });
    });
  });

  describe("buildParsedRow", () => {
    it("keeps invalid amount tokens editable without clearing other errors", () => {
      const row = buildParsedRow({
        date: "2025-02-29",
        payee: "QA",
        description: "Broken",
        amountInput: "abc",
      });
      expect(row.amountInput).toBe("abc");
      expect(row.errors).toEqual(
        expect.arrayContaining([
          "Invalid date value",
          "Amount must be a valid number",
        ]),
      );
    });

    it("accepts a repaired valid row without inventing values", () => {
      const row = buildParsedRow({
        date: "2025-02-28",
        payee: "QA",
        description: "Fixed",
        amountInput: "-3.75",
      });
      expect(row.errors).toBeUndefined();
      expect(row.amount).toBe(-3.75);
      expect(row.amountInput).toBe("-3.75");
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

  describe("detectHeaderRow", () => {
    it("should detect the canonical header and report its order as supported", () => {
      const detection = detectHeaderRow([
        "Date",
        "Payee",
        "Description",
        "Amount",
      ]);
      expect(detection.isHeader).toBe(true);
      expect(detection.supported).toBe(true);
      expect(detection.fields).toEqual([
        "date",
        "payee",
        "description",
        "amount",
      ]);
    });

    it("should report the recognized order for a reordered header", () => {
      const detection = detectHeaderRow([
        "Date",
        "Payee",
        "Amount",
        "Description",
      ]);
      expect(detection.isHeader).toBe(true);
      expect(detection.supported).toBe(true);
      expect(detection.fields).toEqual([
        "date",
        "payee",
        "amount",
        "description",
      ]);
    });

    it("should treat narration as the description column", () => {
      const detection = detectHeaderRow([
        "Amount",
        "Narration",
        "Payee",
        "Date",
      ]);
      expect(detection.supported).toBe(true);
      expect(detection.fields).toEqual([
        "amount",
        "description",
        "payee",
        "date",
      ]);
    });

    it("should detect header row with 'date' and 'description'", () => {
      const detection = detectHeaderRow(["date", "description", "amount"]);
      expect(detection.isHeader).toBe(true);
      // Missing payee — recognized but not mappable.
      expect(detection.supported).toBe(false);
    });

    it("should detect header row with 'date' and 'narration'", () => {
      expect(detectHeaderRow(["date", "narration", "amount"]).isHeader).toBe(
        true,
      );
    });

    it("should be case-insensitive and tolerate padding", () => {
      const detection = detectHeaderRow([
        " DATE ",
        "PAYEE",
        "Description",
        "amount",
      ]);
      expect(detection.isHeader).toBe(true);
      expect(detection.supported).toBe(true);
    });

    it("should infer a single unknown column when exactly one field is unfilled", () => {
      const detection = detectHeaderRow(["Date", "Payee", "Memo", "Amount"]);
      expect(detection.supported).toBe(true);
      expect(detection.fields).toEqual([
        "date",
        "payee",
        "description",
        "amount",
      ]);
    });

    it("should not infer when two columns are unknown", () => {
      const detection = detectHeaderRow(["Date", "Who", "Memo", "Amount"]);
      expect(detection.isHeader).toBe(true);
      expect(detection.supported).toBe(false);
    });

    it("should never infer an unknown column as the amount or the date", () => {
      expect(
        detectHeaderRow(["Date", "Payee", "Description", "Total"]).supported,
      ).toBe(false);
      expect(
        detectHeaderRow(["Booked", "Payee", "Description", "Amount"]).supported,
      ).toBe(false);
    });

    it("should not mark a duplicated column as supported", () => {
      const detection = detectHeaderRow([
        "Date",
        "Description",
        "Narration",
        "Amount",
      ]);
      expect(detection.isHeader).toBe(true);
      expect(detection.supported).toBe(false);
    });

    it("should not mark an extra unknown column as supported", () => {
      const detection = detectHeaderRow([
        "Date",
        "Payee",
        "Description",
        "Amount",
        "Balance",
      ]);
      expect(detection.isHeader).toBe(true);
      expect(detection.supported).toBe(false);
    });

    it("should return isHeader false for a data row", () => {
      expect(
        detectHeaderRow(["2024-01-15", "Coffee Shop", "Morning coffee", "5.00"])
          .isHeader,
      ).toBe(false);
    });

    it("should return isHeader false when only 'date' is present without a companion", () => {
      expect(detectHeaderRow(["date", "time", "location"]).isHeader).toBe(
        false,
      );
    });

    it("should return isHeader false when header tokens appear inside data fields", () => {
      expect(
        detectHeaderRow([
          "2025-12-01",
          "QA Date Shop",
          "Prepaid amount",
          "-4.50",
        ]).isHeader,
      ).toBe(false);
    });

    it("should return isHeader false for an empty record", () => {
      expect(detectHeaderRow([]).isHeader).toBe(false);
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
