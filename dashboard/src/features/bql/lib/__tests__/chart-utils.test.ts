import { canPlotQuery, parseQueryChart } from "../chart-utils";
import type { QueryResultTable } from "@/graphql/definitions";

describe("chart-utils", () => {
  describe("canPlotQuery", () => {
    it("should return true for 2 columns with date and number", () => {
      const result: QueryResultTable = {
        types: [
          { name: "date", dtype: "date" },
          { name: "balance", dtype: "Decimal" },
        ],
        rows: [],
      } as any;

      expect(canPlotQuery(result)).toBe(true);
    });

    it("should return true for 2 columns with string and Inventory", () => {
      const result: QueryResultTable = {
        types: [
          { name: "account", dtype: "str" },
          { name: "balance", dtype: "Inventory" },
        ],
        rows: [],
      } as any;

      expect(canPlotQuery(result)).toBe(true);
    });

    it("should return true for 2 columns with date and int", () => {
      const result: QueryResultTable = {
        types: [
          { name: "date", dtype: "date" },
          { name: "count", dtype: "int" },
        ],
        rows: [],
      } as any;

      expect(canPlotQuery(result)).toBe(true);
    });

    it("should return false for 1 column", () => {
      const result: QueryResultTable = {
        types: [{ name: "account", dtype: "str" }],
        rows: [],
      } as any;

      expect(canPlotQuery(result)).toBe(false);
    });

    it("should return false for 3 columns", () => {
      const result: QueryResultTable = {
        types: [
          { name: "date", dtype: "date" },
          { name: "account", dtype: "str" },
          { name: "balance", dtype: "Decimal" },
        ],
        rows: [],
      } as any;

      expect(canPlotQuery(result)).toBe(false);
    });

    it("should return false for wrong first column type", () => {
      const result: QueryResultTable = {
        types: [
          { name: "number", dtype: "int" },
          { name: "balance", dtype: "Decimal" },
        ],
        rows: [],
      } as any;

      expect(canPlotQuery(result)).toBe(false);
    });

    it("should return false for wrong second column type", () => {
      const result: QueryResultTable = {
        types: [
          { name: "date", dtype: "date" },
          { name: "account", dtype: "str" },
        ],
        rows: [],
      } as any;

      expect(canPlotQuery(result)).toBe(false);
    });

    it("should return false for null types", () => {
      const result: QueryResultTable = {
        types: null as any,
        rows: [],
      };

      expect(canPlotQuery(result)).toBe(false);
    });
  });

  describe("parseQueryChart", () => {
    it("should return null for non-plottable query", () => {
      const result: QueryResultTable = {
        types: [{ name: "account", dtype: "str" }],
        rows: [],
      } as any;

      expect(parseQueryChart(result)).toBeNull();
    });

    it("should generate line chart config for date-based data", () => {
      const result: QueryResultTable = {
        types: [
          { name: "date", dtype: "date" },
          { name: "balance", dtype: "Decimal" },
        ],
        rows: [
          ["2024-01-01", 100],
          ["2024-01-02", 200],
          ["2024-01-03", 150],
        ],
      } as any;

      const chartConfig = parseQueryChart(result);

      expect(chartConfig).not.toBeNull();
      expect(chartConfig?.type).toBe("line");
      expect(chartConfig?.option.xAxis).toMatchObject({
        type: "category",
        data: ["2024-01-01", "2024-01-02", "2024-01-03"],
        boundaryGap: false,
      });
      expect(chartConfig?.option.series).toHaveLength(1);
      expect(chartConfig?.option.series?.[0]).toMatchObject({
        type: "line",
        data: [100, 200, 150],
      });
    });

    it("should generate bar chart config for string-based data", () => {
      const result: QueryResultTable = {
        types: [
          { name: "account", dtype: "str" },
          { name: "balance", dtype: "int" },
        ],
        rows: [
          ["Assets:Cash", 1000],
          ["Assets:Bank", 5000],
          ["Liabilities:Loan", -2000],
        ],
      } as any;

      const chartConfig = parseQueryChart(result);

      expect(chartConfig).not.toBeNull();
      expect(chartConfig?.type).toBe("bar");
      expect(chartConfig?.option.xAxis).toMatchObject({
        type: "category",
        data: ["Assets:Cash", "Assets:Bank", "Liabilities:Loan"],
        boundaryGap: true,
      });
      expect(chartConfig?.option.series).toHaveLength(1);
      expect(chartConfig?.option.series?.[0]).toMatchObject({
        type: "bar",
        data: [1000, 5000, -2000],
      });
    });

    it("should handle rows with less than 2 columns", () => {
      const result: QueryResultTable = {
        types: [
          { name: "date", dtype: "date" },
          { name: "balance", dtype: "Decimal" },
        ],
        rows: [["2024-01-01"], []],
      } as any;

      const chartConfig = parseQueryChart(result);

      expect(chartConfig).not.toBeNull();
      expect(chartConfig?.option.xAxis).toMatchObject({
        type: "category",
        data: [],
      });
    });

    it("should extract numeric value from object with number property", () => {
      const result: QueryResultTable = {
        types: [
          { name: "date", dtype: "date" },
          { name: "balance", dtype: "Amount" },
        ],
        rows: [
          ["2024-01-01", { number: 100, currency: "USD" }],
          ["2024-01-02", { number: 200, currency: "USD" }],
        ],
      } as any;

      const chartConfig = parseQueryChart(result);

      expect(chartConfig).not.toBeNull();
      expect(chartConfig?.option.series?.[0]).toMatchObject({
        type: "line",
        data: [100, 200],
      });
    });

    it("should handle null/undefined values", () => {
      const result: QueryResultTable = {
        types: [
          { name: "date", dtype: "date" },
          { name: "balance", dtype: "Decimal" },
        ],
        rows: [
          ["2024-01-01", null],
          ["2024-01-02", undefined],
          ["2024-01-03", 100],
        ],
      } as any;

      const chartConfig = parseQueryChart(result);

      expect(chartConfig).not.toBeNull();
      expect(chartConfig?.option.series?.[0]).toMatchObject({
        type: "line",
        data: [0, 0, 100],
      });
    });
  });
});
