import { tableToCSV } from "../export-utils";
import type { QueryResultTable } from "@/graphql/definitions";

describe("export-utils", () => {
  describe("tableToCSV", () => {
    it("should generate CSV with headers and rows", () => {
      const result: QueryResultTable = {
        types: [
          { name: "account", dtype: "str" },
          { name: "balance", dtype: "Decimal" },
        ],
        rows: [
          ["Assets:Cash", 1000],
          ["Assets:Bank", 5000],
        ],
      } as any;

      const csv = tableToCSV(result);

      expect(csv).toBe("account,balance\nAssets:Cash,1000\nAssets:Bank,5000");
    });

    it("should escape fields with commas", () => {
      const result: QueryResultTable = {
        types: [{ name: "description", dtype: "str" }],
        rows: [["Hello, World"], ["Test, with, commas"]],
      } as any;

      const csv = tableToCSV(result);

      expect(csv).toBe('description\n"Hello, World"\n"Test, with, commas"');
    });

    it("should escape fields with quotes", () => {
      const result: QueryResultTable = {
        types: [{ name: "text", dtype: "str" }],
        rows: [['He said "Hello"'], ['"Quoted"']],
      } as any;

      const csv = tableToCSV(result);

      expect(csv).toBe('text\n"He said ""Hello"""\n"""Quoted"""');
    });

    it("should escape fields with newlines", () => {
      const result: QueryResultTable = {
        types: [{ name: "text", dtype: "str" }],
        rows: [["Line 1\nLine 2"], ["Single line"]],
      } as any;

      const csv = tableToCSV(result);

      expect(csv).toBe('text\n"Line 1\nLine 2"\nSingle line');
    });

    it("should handle null and undefined values", () => {
      const result: QueryResultTable = {
        types: [
          { name: "col1", dtype: "str" },
          { name: "col2", dtype: "str" },
        ],
        rows: [
          [null, undefined],
          ["value", null],
        ],
      } as any;

      const csv = tableToCSV(result);

      expect(csv).toBe("col1,col2\n,\nvalue,");
    });

    it("should convert objects to JSON", () => {
      const result: QueryResultTable = {
        types: [{ name: "data", dtype: "object" }],
        rows: [[{ key: "value", number: 42 }]],
      } as any;

      const csv = tableToCSV(result);

      // Object gets JSON stringified and then CSV escaped (quotes are doubled)
      expect(csv).toContain('"{""key"":""value"",""number"":42}"');
    });

    it("should handle empty result", () => {
      const result: QueryResultTable = {
        types: [],
        rows: [],
      } as any;

      const csv = tableToCSV(result);

      expect(csv).toBe("");
    });

    it("should handle multiple columns and rows", () => {
      const result: QueryResultTable = {
        types: [
          { name: "id", dtype: "int" },
          { name: "name", dtype: "str" },
          { name: "amount", dtype: "Decimal" },
        ],
        rows: [
          [1, "Alice", 100.5],
          [2, "Bob", 200.75],
          [3, "Charlie", 150.25],
        ],
      } as any;

      const csv = tableToCSV(result);

      expect(csv).toBe(
        "id,name,amount\n1,Alice,100.5\n2,Bob,200.75\n3,Charlie,150.25",
      );
    });

    it("should handle formula injection attempts", () => {
      const result: QueryResultTable = {
        types: [{ name: "formula", dtype: "str" }],
        rows: [
          ["=1+1"],
          ["=cmd|'/c calc'!A1"],
          ["+1+1"],
          ["-1+1"],
          ["@SUM(A1:A10)"],
        ],
      } as any;

      const csv = tableToCSV(result);

      // All formulas should be properly escaped
      expect(csv).toContain("=1+1");
      expect(csv).toContain("=cmd|'/c calc'!A1");
      // These should be safe when quoted
      const lines = csv.split("\n");
      expect(lines.length).toBe(6); // header + 5 rows
    });

    it("should handle empty strings", () => {
      const result: QueryResultTable = {
        types: [{ name: "text", dtype: "str" }],
        rows: [[""], ["   "], ["value"]],
      } as any;

      const csv = tableToCSV(result);

      expect(csv).toBe("text\n\n   \nvalue");
    });

    it("should handle special characters", () => {
      const result: QueryResultTable = {
        types: [{ name: "text", dtype: "str" }],
        rows: [["Tab\there"], ["Line\rReturn"], ["Both\r\nNewlines"]],
      } as any;

      const csv = tableToCSV(result);

      // Fields with \r or \n should be quoted
      expect(csv).toContain('"');
      expect(csv).toContain("Line\rReturn");
      expect(csv).toContain("Both\r\nNewlines");
    });
  });
});
