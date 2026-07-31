import { describe, it, expect } from "vitest";
import {
  tableToCSV,
  formatNumber,
  csvObjectToString,
  isEmpty,
  defaultRowsFilter,
  holdingsRowsFilter,
} from "../utils";

describe("Holdings Utils", () => {
  describe("formatNumber", () => {
    it("should format a number with more than 2 decimal places to 2 decimal places", () => {
      expect(formatNumber(123.456789)).toBe("123.46");
      expect(formatNumber(0.123456)).toBe("0.12");
      expect(formatNumber(999.999)).toBe("1000.00");
    });

    it("should not format numbers with 2 or fewer decimal places", () => {
      expect(formatNumber(123.45)).toBe("123.45");
      expect(formatNumber(100.5)).toBe("100.5");
      expect(formatNumber(42)).toBe("42");
    });

    it("should handle integer numbers", () => {
      expect(formatNumber(100)).toBe("100");
      expect(formatNumber(0)).toBe("0");
      expect(formatNumber(-50)).toBe("-50");
    });

    it("should handle negative numbers with decimals", () => {
      expect(formatNumber(-123.456789)).toBe("-123.46");
      expect(formatNumber(-0.999)).toBe("-1.00");
    });

    it("should handle string numbers", () => {
      expect(formatNumber("123.456789")).toBe("123.46");
      expect(formatNumber("42")).toBe("42");
      expect(formatNumber("0.12")).toBe("0.12");
    });

    it("should handle zero with decimals", () => {
      expect(formatNumber(0.001234)).toBe("0.00");
      expect(formatNumber("0.0")).toBe("0"); // String "0.0" converts to number 0, returns "0"
    });

    it("should handle very large numbers", () => {
      expect(formatNumber(1234567890.123456)).toBe("1234567890.12");
    });

    it("should handle very small numbers", () => {
      expect(formatNumber(0.000123)).toBe("0.00");
    });

    it("should handle non-numeric strings by converting to string", () => {
      expect(formatNumber("abc")).toBe("abc");
      expect(formatNumber("not a number")).toBe("not a number");
    });

    it("should handle null and undefined", () => {
      expect(formatNumber(null)).toBe("");
      expect(formatNumber(undefined)).toBe("");
    });

    it("should handle boolean values", () => {
      expect(formatNumber(true)).toBe("true");
      expect(formatNumber(false)).toBe("0"); // Boolean false converts to number 0, returns "0"
    });

    it("should handle objects by converting to string", () => {
      expect(formatNumber({})).toBe("[object Object]");
      expect(formatNumber([])).toBe("0"); // Empty array converts to number 0, returns "0"
    });
  });

  describe("csvObjectToString", () => {
    it("should convert simple object to CSV string format", () => {
      const obj = { USD: 100, EUR: 200 };
      const result = csvObjectToString(obj);
      expect(result).toContain("USD");
      expect(result).toContain("EUR");
      expect(result).toContain("100");
      expect(result).toContain("200");
    });

    it("should format numbers with more than 2 decimal places", () => {
      const obj = { USD: 123.456789, EUR: 999.999 };
      const result = csvObjectToString(obj);
      expect(result).toContain("123.46");
      expect(result).toContain("1000.00");
    });

    it("should handle object with single key-value pair", () => {
      const obj = { USD: 100 };
      const result = csvObjectToString(obj);
      expect(result).toBe("100 USD");
    });

    it("should handle object with multiple currencies", () => {
      const obj = { USD: 100, EUR: 200, GBP: 300 };
      const result = csvObjectToString(obj);
      expect(result).toContain("100 USD");
      expect(result).toContain("200 EUR");
      expect(result).toContain("300 GBP");
    });

    it("should separate entries with CRLF", () => {
      const obj = { USD: 100, EUR: 200 };
      const result = csvObjectToString(obj);
      expect(result).toContain("\r\n");
    });

    it("should handle empty object", () => {
      const obj = {};
      const result = csvObjectToString(obj);
      expect(result).toBe("");
    });
  });

  describe("tableToCSV", () => {
    it("should convert simple table to CSV format", () => {
      const headers = ["Name", "Age", "City"];
      const rows = [
        ["Alice", 30, "New York"],
        ["Bob", 25, "London"],
      ];
      const result = tableToCSV(headers, rows);

      expect(result).toContain('"Name","Age","City"');
      expect(result).toContain('"Alice","30","New York"');
      expect(result).toContain('"Bob","25","London"');
    });

    it("should handle empty headers", () => {
      const headers: string[] = [];
      const rows = [["Alice", 30]];
      const result = tableToCSV(headers, rows);

      expect(result).toBe("");
    });

    it("should handle empty rows", () => {
      const headers = ["Name", "Age"];
      const rows: Array<Array<string | number>> = [];
      const result = tableToCSV(headers, rows);

      expect(result).toBe("");
    });

    it("should handle null values in cells", () => {
      const headers = ["Name", "Value"];
      const rows = [
        ["Alice", null],
        [null, "test"],
      ];
      const result = tableToCSV(headers, rows);

      expect(result).toContain('""');
    });

    it("should handle undefined values in cells", () => {
      const headers = ["Name", "Value"];
      const rows = [
        ["Alice", undefined],
        [undefined, "test"],
      ];
      const result = tableToCSV(headers, rows);

      expect(result).toContain('""');
    });

    it("should escape quotes in cell values", () => {
      const headers = ["Name", "Quote"];
      const rows = [["Alice", 'She said "hello"']];
      const result = tableToCSV(headers, rows);

      expect(result).toContain('She said ""hello""');
    });

    it("should handle object cells by converting to string", () => {
      const headers = ["Name", "Amounts"];
      const rows = [["Alice", { USD: 100, EUR: 200 }]];
      const result = tableToCSV(headers, rows);

      expect(result).toContain("100 USD");
      expect(result).toContain("200 EUR");
    });

    it("should handle number values", () => {
      const headers = ["Product", "Price", "Quantity"];
      const rows = [
        ["Apple", 1.5, 10],
        ["Banana", 0.75, 20],
      ];
      const result = tableToCSV(headers, rows);

      expect(result).toContain('"1.5"');
      expect(result).toContain('"10"');
      expect(result).toContain('"0.75"');
      expect(result).toContain('"20"');
    });

    it("should separate rows with newline", () => {
      const headers = ["A", "B"];
      const rows = [
        ["1", "2"],
        ["3", "4"],
      ];
      const result = tableToCSV(headers, rows);
      const lines = result.split("\n");

      expect(lines).toHaveLength(3); // header + 2 data rows
    });

    it("should handle single row", () => {
      const headers = ["Name", "Age"];
      const rows = [["Alice", 30]];
      const result = tableToCSV(headers, rows);

      expect(result).toBe('"Name","Age"\n"Alice","30"');
    });

    it("should handle single column", () => {
      const headers = ["Name"];
      const rows = [["Alice"], ["Bob"], ["Charlie"]];
      const result = tableToCSV(headers, rows);

      expect(result).toContain('"Name"');
      expect(result).toContain('"Alice"');
      expect(result).toContain('"Bob"');
      expect(result).toContain('"Charlie"');
    });

    it("should handle complex objects in cells", () => {
      const headers = ["Name", "Balance"];
      const rows = [
        ["Alice", { USD: 123.456789, EUR: 200 }],
        ["Bob", { GBP: 300.12 }],
      ];
      const result = tableToCSV(headers, rows);

      expect(result).toContain("123.46 USD"); // formatNumber should round
      expect(result).toContain("200 EUR");
      expect(result).toContain("300.12 GBP");
    });

    it("should handle mixed types in cells", () => {
      const headers = ["Col1", "Col2", "Col3"];
      const rows = [
        ["string", 123, true],
        [null, undefined, { key: "value" }],
      ];
      const result = tableToCSV(headers, rows);

      expect(result).toContain('"string"');
      expect(result).toContain('"123"');
      expect(result).toContain('"true"');
      expect(result).toContain('""'); // null
      expect(result).toContain('""'); // undefined
    });

    it("should wrap all cells in quotes", () => {
      const headers = ["A", "B"];
      const rows = [["1", "2"]];
      const result = tableToCSV(headers, rows);

      // Count quotes - should be 2 per cell (opening and closing)
      const quoteCount = (result.match(/"/g) || []).length;
      expect(quoteCount).toBeGreaterThan(0);
    });

    it("should handle special characters in cells", () => {
      const headers = ["Text"];
      const rows = [["Line1\nLine2"], ["Comma, value"], ["Tab\tvalue"]];
      const result = tableToCSV(headers, rows);

      expect(result).toContain("Line1");
      expect(result).toContain("Comma, value");
      expect(result).toContain("Tab");
    });

    it("should handle empty strings in cells", () => {
      const headers = ["A", "B"];
      const rows = [
        ["", "value"],
        ["value", ""],
      ];
      const result = tableToCSV(headers, rows);

      expect(result).toContain('""');
    });

    it("should handle very long strings in cells", () => {
      const longString = "a".repeat(1000);
      const headers = ["Text"];
      const rows = [[longString]];
      const result = tableToCSV(headers, rows);

      expect(result).toContain(longString);
    });
  });

  describe("isEmpty", () => {
    it("should return true for string '0'", () => {
      expect(isEmpty("0")).toBe(true);
    });

    it("should return true for empty string", () => {
      expect(isEmpty("")).toBe(true);
    });

    it("should return true for number 0", () => {
      expect(isEmpty(0)).toBe(true);
    });

    it("should return true for boolean false", () => {
      expect(isEmpty(false)).toBe(true);
    });

    it("should return true for empty object", () => {
      expect(isEmpty({})).toBe(true);
    });

    it("should return false for non-empty string", () => {
      expect(isEmpty("hello")).toBe(false);
      expect(isEmpty("1")).toBe(false);
    });

    it("should return false for non-zero number", () => {
      expect(isEmpty(1)).toBe(false);
      expect(isEmpty(-1)).toBe(false);
      expect(isEmpty(0.1)).toBe(false);
    });

    it("should return false for boolean true", () => {
      expect(isEmpty(true)).toBe(false);
    });

    it("should return false for non-empty object", () => {
      expect(isEmpty({ key: "value" })).toBe(false);
      expect(isEmpty({ a: 1 })).toBe(false);
    });

    it("should return false for arrays (even empty ones)", () => {
      expect(isEmpty([])).toBe(false);
      expect(isEmpty([1, 2, 3])).toBe(false);
    });

    it("should return true for null (carries no value)", () => {
      expect(isEmpty(null)).toBe(true);
    });

    it("should return true for undefined (carries no value)", () => {
      expect(isEmpty(undefined)).toBe(true);
    });
  });

  describe("defaultRowsFilter", () => {
    it("should filter out rows where all cells from index 1 are empty", () => {
      const rows = [
        ["Account", "0", ""],
        ["Assets", "100", "200"],
        ["Liabilities", "0", "0"],
      ];
      const result = defaultRowsFilter(rows);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(["Assets", "100", "200"]);
    });

    it("should keep rows where at least one cell from index 1 is non-empty", () => {
      const rows = [
        ["Account", "100", "0"],
        ["Account2", "0", "50"],
      ];
      const result = defaultRowsFilter(rows);
      expect(result).toHaveLength(2);
    });

    it("should return empty array when all rows are empty", () => {
      const rows = [
        ["A", "0", ""],
        ["B", "", "0"],
      ];
      const result = defaultRowsFilter(rows);
      expect(result).toHaveLength(0);
    });

    it("should return all rows when none are empty", () => {
      const rows = [
        ["A", "100", "200"],
        ["B", "50", "75"],
      ];
      const result = defaultRowsFilter(rows);
      expect(result).toHaveLength(2);
    });

    it("should handle empty input array", () => {
      const result = defaultRowsFilter([]);
      expect(result).toHaveLength(0);
    });

    it("should handle rows with only the first column (no data columns)", () => {
      const rows = [["Account"], ["Assets"]];
      // slice(1) returns [], and [].every(...) is vacuously true, so rows are filtered out
      const result = defaultRowsFilter(rows);
      expect(result).toHaveLength(0);
    });
  });

  describe("holdingsRowsFilter", () => {
    it("should filter out rows where the second cell is empty", () => {
      const rows = [
        ["Account", "0", "100"],
        ["Assets", "100", "200"],
      ];
      const result = holdingsRowsFilter(rows);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(["Assets", "100", "200"]);
    });

    it("should filter out rows where all cells from index 1 are empty", () => {
      const rows = [
        ["Account", "100", "0"],
        ["Assets", "100", ""],
      ];
      const result = holdingsRowsFilter(rows);
      // first row: row[1]="100" (non-empty), but row.slice(1) = ["100", "0"] - "0" is empty but "100" is not
      // so not all are empty => keep
      // second row: row[1]="100" (non-empty), but row.slice(1) = ["100", ""] - "" is empty but "100" is not
      // so not all are empty => keep
      expect(result).toHaveLength(2);
    });

    it("should filter out rows where second cell is empty even if other cells have values", () => {
      const rows = [["Account", "", "200"]];
      const result = holdingsRowsFilter(rows);
      expect(result).toHaveLength(0);
    });

    it("should keep rows with non-empty second cell and mixed data", () => {
      const rows = [["Account", "100", "0", ""]];
      // row[1]="100" is non-empty; not all of slice(1) are empty ("100" is not empty)
      const result = holdingsRowsFilter(rows);
      expect(result).toHaveLength(1);
    });

    it("should filter out rows where second cell is '0'", () => {
      const rows = [
        ["Account", "0", "200"],
        ["Assets", "100", "200"],
      ];
      const result = holdingsRowsFilter(rows);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(["Assets", "100", "200"]);
    });

    it("should handle empty input array", () => {
      const result = holdingsRowsFilter([]);
      expect(result).toHaveLength(0);
    });
  });
});
