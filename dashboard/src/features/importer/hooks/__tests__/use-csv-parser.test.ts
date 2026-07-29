import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCSVParser } from "../use-csv-parser";

describe("useCSVParser", () => {
  describe("parseCSV – basic behaviour", () => {
    it("should return empty result for an empty string", () => {
      const { result } = renderHook(() => useCSVParser());
      const parsed = result.current.parseCSV("");
      expect(parsed.rows).toHaveLength(0);
      expect(parsed.validCount).toBe(0);
      expect(parsed.errorCount).toBe(0);
      expect(parsed.hasErrors).toBe(false);
    });

    it("should return empty result for whitespace-only content", () => {
      const { result } = renderHook(() => useCSVParser());
      const parsed = result.current.parseCSV("   \n   \n  ");
      expect(parsed.rows).toHaveLength(0);
    });

    it("should parse a single valid row without a header", () => {
      const { result } = renderHook(() => useCSVParser());
      const csv = "2024-01-15,Starbucks,Morning coffee,5.50";
      const parsed = result.current.parseCSV(csv);

      expect(parsed.rows).toHaveLength(1);
      expect(parsed.validCount).toBe(1);
      expect(parsed.errorCount).toBe(0);
      expect(parsed.hasErrors).toBe(false);

      const row = parsed.rows[0];
      expect(row.date).toBe("2024-01-15");
      expect(row.payee).toBe("Starbucks");
      expect(row.description).toBe("Morning coffee");
      expect(row.amount).toBe(5.5);
      expect(row.errors).toBeUndefined();
    });

    it("should skip a header row and parse the data rows", () => {
      const { result } = renderHook(() => useCSVParser());
      const csv = [
        "Date,Payee,Description,Amount",
        "2024-01-15,Starbucks,Morning coffee,5.50",
        "2024-01-16,Amazon,Books,15.00",
      ].join("\n");

      const parsed = result.current.parseCSV(csv);

      expect(parsed.rows).toHaveLength(2);
      expect(parsed.validCount).toBe(2);
      expect(parsed.errorCount).toBe(0);
    });

    it("should parse multiple valid rows correctly", () => {
      const { result } = renderHook(() => useCSVParser());
      const csv = [
        "2024-01-01,Shop A,Item A,10.00",
        "2024-01-02,Shop B,Item B,-5.00",
        "2024-01-03,Shop C,Item C,0",
      ].join("\n");

      const parsed = result.current.parseCSV(csv);

      expect(parsed.rows).toHaveLength(3);
      expect(parsed.rows[0].amount).toBe(10);
      expect(parsed.rows[1].amount).toBe(-5);
      expect(parsed.rows[2].amount).toBe(0);
    });

    it("should handle Windows-style CRLF line endings", () => {
      const { result } = renderHook(() => useCSVParser());
      const csv =
        "2024-01-15,Starbucks,Morning coffee,5.50\r\n2024-01-16,Amazon,Books,15.00\r\n";

      const parsed = result.current.parseCSV(csv);

      expect(parsed.rows).toHaveLength(2);
      expect(parsed.validCount).toBe(2);
      expect(parsed.rows[0].payee).toBe("Starbucks");
      expect(parsed.rows[1].payee).toBe("Amazon");
    });
  });

  describe("parseCSV – quoted fields (bug fix: commas inside quotes)", () => {
    it("should correctly parse a payee that contains a comma in quotes", () => {
      const { result } = renderHook(() => useCSVParser());
      const csv = '2024-01-15,"Amazon, Inc.",Book purchase,15.00';

      const parsed = result.current.parseCSV(csv);

      expect(parsed.rows).toHaveLength(1);
      expect(parsed.validCount).toBe(1);
      expect(parsed.rows[0].payee).toBe("Amazon, Inc.");
      expect(parsed.rows[0].amount).toBe(15);
      expect(parsed.rows[0].errors).toBeUndefined();
    });

    it("should correctly parse a description that contains a comma in quotes", () => {
      const { result } = renderHook(() => useCSVParser());
      const csv = '2024-03-10,Walmart,"Groceries, fruit, and bread",42.50';

      const parsed = result.current.parseCSV(csv);

      expect(parsed.rows).toHaveLength(1);
      expect(parsed.validCount).toBe(1);
      expect(parsed.rows[0].description).toBe("Groceries, fruit, and bread");
    });

    it("should handle multiple quoted fields with commas in a single row", () => {
      const { result } = renderHook(() => useCSVParser());
      const csv = '2024-06-01,"Doe, Jane","Salary, June 2024",3000.00';

      const parsed = result.current.parseCSV(csv);

      expect(parsed.rows).toHaveLength(1);
      expect(parsed.rows[0].payee).toBe("Doe, Jane");
      expect(parsed.rows[0].description).toBe("Salary, June 2024");
      expect(parsed.rows[0].amount).toBe(3000);
    });

    it("should handle escaped double-quotes inside a quoted field", () => {
      const { result } = renderHook(() => useCSVParser());
      // RFC 4180: "" inside a quoted field represents a literal "
      const csv = '2024-01-20,"He said ""hello""",Test,9.99';

      const parsed = result.current.parseCSV(csv);

      expect(parsed.rows).toHaveLength(1);
      expect(parsed.rows[0].payee).toBe('He said "hello"');
    });

    it("should parse a mix of quoted and unquoted fields correctly", () => {
      const { result } = renderHook(() => useCSVParser());
      const csv = [
        "Date,Payee,Description,Amount",
        '2024-01-15,"Amazon, Inc.",Book purchase,15.00',
        "2024-01-16,Starbucks,Coffee,5.50",
        '2024-01-17,"Whole Foods, Market",Groceries,78.32',
      ].join("\n");

      const parsed = result.current.parseCSV(csv);

      expect(parsed.rows).toHaveLength(3);
      expect(parsed.validCount).toBe(3);
      expect(parsed.rows[0].payee).toBe("Amazon, Inc.");
      expect(parsed.rows[1].payee).toBe("Starbucks");
      expect(parsed.rows[2].payee).toBe("Whole Foods, Market");
    });
  });

  describe("parseCSV – validation errors", () => {
    it("should report an error for a row with fewer than 4 columns", () => {
      const { result } = renderHook(() => useCSVParser());
      const csv = "2024-01-15,Starbucks,Coffee";

      const parsed = result.current.parseCSV(csv);

      expect(parsed.rows).toHaveLength(1);
      expect(parsed.errorCount).toBe(1);
      expect(parsed.hasErrors).toBe(true);
      expect(parsed.rows[0].errors).toBeDefined();
      expect(parsed.rows[0].errors![0]).toMatch(/Expected 4 columns/);
    });

    it("should report an error for a row with more than 4 columns (unquoted extra comma)", () => {
      const { result } = renderHook(() => useCSVParser());
      const csv = "2024-01-15,a,b,c,extra";

      const parsed = result.current.parseCSV(csv);

      expect(parsed.errorCount).toBe(1);
      expect(parsed.rows[0].errors![0]).toMatch(/Expected 4 columns/);
    });

    it("should report a date error for an invalid date format", () => {
      const { result } = renderHook(() => useCSVParser());
      const csv = "15/01/2024,Starbucks,Coffee,5.50";

      const parsed = result.current.parseCSV(csv);

      expect(parsed.errorCount).toBe(1);
      const errors = parsed.rows[0].errors!;
      expect(errors.some((e) => e.includes("date"))).toBe(true);
    });

    it("should report an error for an empty payee", () => {
      const { result } = renderHook(() => useCSVParser());
      const csv = "2024-01-15,,Coffee,5.50";

      const parsed = result.current.parseCSV(csv);

      expect(parsed.errorCount).toBe(1);
      const errors = parsed.rows[0].errors!;
      expect(errors.some((e) => e.toLowerCase().includes("payee"))).toBe(true);
    });

    it("should report an error for an empty description", () => {
      const { result } = renderHook(() => useCSVParser());
      const csv = "2024-01-15,Starbucks,,5.50";

      const parsed = result.current.parseCSV(csv);

      expect(parsed.errorCount).toBe(1);
      const errors = parsed.rows[0].errors!;
      expect(errors.some((e) => e.toLowerCase().includes("description"))).toBe(
        true,
      );
    });

    it("should report an error for a non-numeric amount", () => {
      const { result } = renderHook(() => useCSVParser());
      const csv = "2024-01-15,Starbucks,Coffee,notanumber";

      const parsed = result.current.parseCSV(csv);

      expect(parsed.errorCount).toBe(1);
      const errors = parsed.rows[0].errors!;
      expect(errors.some((e) => e.toLowerCase().includes("amount"))).toBe(true);
    });

    it("should accumulate multiple errors on the same row", () => {
      const { result } = renderHook(() => useCSVParser());
      // Bad date + bad amount
      const csv = "baddate,,Coffee,xyz";

      const parsed = result.current.parseCSV(csv);

      expect(parsed.errorCount).toBe(1);
      const errors = parsed.rows[0].errors!;
      expect(errors.length).toBeGreaterThanOrEqual(2);
    });

    it("should correctly count valid vs error rows in a mixed file", () => {
      const { result } = renderHook(() => useCSVParser());
      const csv = [
        "2024-01-01,Shop A,Item A,10.00", // valid
        "baddate,Shop B,Item B,20.00", // error: bad date
        "2024-01-03,Shop C,Item C,30.00", // valid
      ].join("\n");

      const parsed = result.current.parseCSV(csv);

      expect(parsed.rows).toHaveLength(3);
      expect(parsed.validCount).toBe(2);
      expect(parsed.errorCount).toBe(1);
      expect(parsed.hasErrors).toBe(true);
    });
  });

  describe("parseCSV – row numbering in error messages", () => {
    it("should use row 1 numbering when there is no header", () => {
      const { result } = renderHook(() => useCSVParser());
      const csv = "badrow";

      const parsed = result.current.parseCSV(csv);
      const errorMsg = parsed.rows[0].errors![0];
      expect(errorMsg).toContain("Row 1");
    });

    it("should use row 2 numbering for the first data row when a header is present", () => {
      const { result } = renderHook(() => useCSVParser());
      const csv = ["Date,Payee,Description,Amount", "badrow"].join("\n");

      const parsed = result.current.parseCSV(csv);
      const errorMsg = parsed.rows[0].errors![0];
      expect(errorMsg).toContain("Row 2");
    });
  });

  describe("initial hook state", () => {
    it("should start with isLoading false and no error", () => {
      const { result } = renderHook(() => useCSVParser());
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should expose parseFile and parseCSV functions", () => {
      const { result } = renderHook(() => useCSVParser());
      expect(typeof result.current.parseFile).toBe("function");
      expect(typeof result.current.parseCSV).toBe("function");
    });
  });
});
