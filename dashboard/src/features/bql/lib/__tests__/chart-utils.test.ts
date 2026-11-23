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
      ).toEqual({ amount: 0.15, text: "0.15", unit: "UNIV2ETHUSDC" });
      expect(
        decodeQueryChartValue({ UNIV2ETHUSDC: "-7.27" }, "Inventory"),
      ).toEqual({ amount: -7.27, text: "-7.27", unit: "UNIV2ETHUSDC" });
      expect(
        decodeQueryChartValue({ USD: "1", EUR: "2" }, "Inventory"),
      ).toBeNull();
    });
  });

  /** Tooltips say the source decimal, not the plotted float (w4/254). */
  describe("tooltip source precision", () => {
    const tooltipFor = (dtype: string, rows: unknown[][]) => {
      const chart = parseQueryChart({
        types: [
          { name: "label", dtype: "str" },
          { name: "amount", dtype },
        ],
        rows,
      } as never)!;
      const tooltip = chart.option.tooltip as {
        valueFormatter: (value: number, dataIndex: number) => string;
      };
      const series = (chart.option.series as Array<{ data: number[] }>)[0]!;
      return (index: number) =>
        tooltip.valueFormatter(series.data[index]!, index);
    };

    it.each([
      ["12345678901234567890.123456789"],
      ["0.000000000000000000000001"],
      ["-98765432109876543210.5"],
      ["0"],
      ["4.00995"],
    ])("keeps Decimal %s exactly", (text) => {
      expect(tooltipFor("Decimal", [["qa", text]])(0)).toBe(text);
    });

    it("keeps an int beyond the float range exactly", () => {
      expect(tooltipFor("int", [["qa", "123456789012345678901"]])(0)).toBe(
        "123456789012345678901",
      );
    });

    it("keeps Amount and Inventory text with the unit", () => {
      expect(
        tooltipFor("Amount", [
          ["qa", { number: "12345678901234567890.12", currency: "USD" }],
        ])(0),
      ).toBe("12345678901234567890.12 USD");
      expect(
        tooltipFor("Inventory", [["qa", { BTC: "0.123456789012345678" }]])(0),
      ).toBe("0.123456789012345678 BTC");
    });

    it("aligns repeated category labels by row", () => {
      const tooltip = tooltipFor("Decimal", [
        ["same", "1.10"],
        ["same", "2.20"],
      ]);
      expect(tooltip(0)).toBe("1.10");
      expect(tooltip(1)).toBe("2.20");
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
        data: [
          [Date.UTC(2015, 0, 1), 4841.12],
          [Date.UTC(2015, 0, 4), -4],
          [Date.UTC(2015, 0, 6), -2400],
        ],
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
        data: [
          [Date.UTC(2024, 2, 15), 7],
          [Date.UTC(2024, 5, 30), 0.15],
          [Date.UTC(2024, 8, 30), 0.12],
          [Date.UTC(2024, 9, 15), -7.27],
        ],
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
        data: [
          [Date.UTC(2015, 0, 1), 2],
          [Date.UTC(2015, 0, 4), 1],
          [Date.UTC(2015, 0, 6), 1],
        ],
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
        data: [
          [Date.UTC(2024, 0, 1), 0],
          [Date.UTC(2024, 0, 2), 0],
        ],
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
      expect(chartConfig?.option.useUTC).toBe(true);
      expect(chartConfig?.option.xAxis).toMatchObject({
        type: "time",
      });
      expect(chartConfig?.option.series).toHaveLength(1);
      expect(chartConfig?.option.series?.[0]).toMatchObject({
        type: "line",
        step: "end",
        data: [
          [Date.UTC(2024, 0, 1), 100],
          [Date.UTC(2024, 0, 2), 200],
          [Date.UTC(2024, 0, 3), 150],
        ],
      });
    });

    it("plots dates chronologically with proportional gaps regardless of result order", () => {
      const result = {
        types: [
          { name: "date", dtype: "date" },
          { name: "balance", dtype: "Inventory" },
        ],
        rows: [
          ["2015-11-13", { GLD: "15" }],
          ["2015-11-18", { GLD: "10" }],
          ["2016-05-05", { GLD: "12" }],
        ],
      } as QueryResultTable;
      const reverse = { ...result, rows: [...result.rows].reverse() };
      const start = (
        parseQueryChart(result)!.option.series as Array<{ data: number[][] }>
      )[0].data;
      const end = (
        parseQueryChart(reverse)!.option.series as Array<{ data: number[][] }>
      )[0].data;
      const day = 24 * 60 * 60 * 1000;
      expect(end).toEqual(start);
      expect(start[1][0] - start[0][0]).toBe(5 * day);
      expect(start[2][0] - start[1][0]).toBe(169 * day);
    });

    it("preserves same-day amounts and exact text by row after chronological sorting", () => {
      const result = {
        types: [
          { name: "date", dtype: "date" },
          { name: "balance", dtype: "Inventory" },
        ],
        rows: [
          ["2016-02-25", { USD: "108.00" }],
          ["2016-01-08", { USD: "-2469.00" }],
          ["2016-01-08", { USD: "-3164.0300" }],
        ],
      } as QueryResultTable;
      const option = parseQueryChart(result)!.option;
      const points = (option.series as Array<{ data: number[][] }>)[0].data;
      expect(points.slice(0, 2)).toEqual([
        [Date.UTC(2016, 0, 8), -2469],
        [Date.UTC(2016, 0, 8), -3164.03],
      ]);
      const { valueFormatter } = option.tooltip as {
        valueFormatter: (value: number, index: number) => string;
      };
      expect(valueFormatter(points[0][1], 0)).toBe("-2469.00 USD");
      expect(valueFormatter(points[1][1], 1)).toBe("-3164.0300 USD");
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
        data: [
          [Date.UTC(2024, 0, 1), 100],
          [Date.UTC(2024, 0, 2), 200],
        ],
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
