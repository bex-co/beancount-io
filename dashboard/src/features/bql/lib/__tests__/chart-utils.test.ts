import {
  canPlotQuery,
  decodeQueryChartValue,
  parseFiniteNumber,
  parseQueryChart,
} from "../chart-utils";
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

  describe("parseFiniteNumber / decodeQueryChartValue", () => {
    it("parses decimal strings and rejects non-finite values", () => {
      expect(parseFiniteNumber("4841.12")).toBe(4841.12);
      expect(parseFiniteNumber("-4.00")).toBe(-4);
      expect(parseFiniteNumber(2)).toBe(2);
      expect(parseFiniteNumber("not-a-number")).toBeNull();
      expect(parseFiniteNumber(null)).toBeNull();
    });

    it("reads single-unit inventory maps without scanning currency names", () => {
      expect(
        decodeQueryChartValue({ UNIV2ETHUSDC: "0.15" }, "Inventory"),
      ).toEqual({ amount: 0.15, unit: "UNIV2ETHUSDC" });
      expect(
        decodeQueryChartValue({ UNIV2ETHUSDC: "-7.27" }, "Inventory"),
      ).toEqual({ amount: -7.27, unit: "UNIV2ETHUSDC" });
      expect(
        decodeQueryChartValue(
          { USD: "1", EUR: "2" },
          "Inventory",
        ),
      ).toBeNull();
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

    it("plots Decimal wire strings including fractional and negative values", () => {
      const result: QueryResultTable = {
        types: [
          { name: "date", dtype: "date" },
          { name: "sum_number", dtype: "Decimal" },
        ],
        rows: [
          ["2015-01-01", "4841.12"],
          ["2015-01-04", "-4.00"],
          ["2015-01-06", "-2400.00"],
        ],
      } as any;

      const chartConfig = parseQueryChart(result);

      expect(chartConfig?.type).toBe("line");
      expect(chartConfig?.option.series?.[0]).toMatchObject({
        type: "line",
        data: [4841.12, -4, -2400],
      });
    });

    it("plots single-unit Inventory maps and exposes the unit", () => {
      const result: QueryResultTable = {
        types: [
          { name: "date", dtype: "date" },
          { name: "sum_position", dtype: "Inventory" },
        ],
        rows: [
          ["2024-03-15", { UNIV2ETHUSDC: "7.00" }],
          ["2024-06-30", { UNIV2ETHUSDC: "0.15" }],
          ["2024-09-30", { UNIV2ETHUSDC: "0.12" }],
          ["2024-10-15", { UNIV2ETHUSDC: "-7.27" }],
        ],
      } as any;

      const chartConfig = parseQueryChart(result);

      expect(chartConfig?.option.series?.[0]).toMatchObject({
        name: "UNIV2ETHUSDC",
        data: [7, 0.15, 0.12, -7.27],
      });
      expect(chartConfig?.option.yAxis).toMatchObject({
        name: "UNIV2ETHUSDC",
      });
    });

    it("keeps numeric integers working", () => {
      const result: QueryResultTable = {
        types: [
          { name: "date", dtype: "date" },
          { name: "count", dtype: "int" },
        ],
        rows: [
          ["2015-01-01", 2],
          ["2015-01-04", 1],
          ["2015-01-06", 1],
        ],
      } as any;

      expect(parseQueryChart(result)?.option.series?.[0]).toMatchObject({
        data: [2, 1, 1],
      });
    });

    it("preserves an explicit zero decimal string", () => {
      const result: QueryResultTable = {
        types: [
          { name: "date", dtype: "date" },
          { name: "balance", dtype: "Decimal" },
        ],
        rows: [
          ["2024-01-01", "0"],
          ["2024-01-02", "0.00"],
        ],
      } as any;

      expect(parseQueryChart(result)?.option.series?.[0]).toMatchObject({
        data: [0, 0],
      });
    });

    it("omits the chart for multi-unit inventory rows", () => {
      const result: QueryResultTable = {
        types: [
          { name: "date", dtype: "date" },
          { name: "balance", dtype: "Inventory" },
        ],
        rows: [
          ["2024-01-01", { USD: "1" }],
          ["2024-01-02", { EUR: "2" }],
        ],
      } as any;

      expect(parseQueryChart(result)).toBeNull();
    });

    it("omits the chart for mixed units within one cell", () => {
      const result: QueryResultTable = {
        types: [
          { name: "date", dtype: "date" },
          { name: "balance", dtype: "Inventory" },
        ],
        rows: [["2024-01-01", { USD: "1", EUR: "2" }]],
      } as any;

      expect(parseQueryChart(result)).toBeNull();
    });

    it("should generate line chart config for date-based numeric data", () => {
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

    it("omits the chart when a row is incomplete", () => {
      const result: QueryResultTable = {
        types: [
          { name: "date", dtype: "date" },
          { name: "balance", dtype: "Decimal" },
        ],
        rows: [["2024-01-01"], []],
      } as any;

      expect(parseQueryChart(result)).toBeNull();
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
        name: "USD",
        data: [100, 200],
      });
    });

    it("omits the chart for missing or invalid cells instead of inventing zeros", () => {
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

      expect(parseQueryChart(result)).toBeNull();
    });
  });
});
