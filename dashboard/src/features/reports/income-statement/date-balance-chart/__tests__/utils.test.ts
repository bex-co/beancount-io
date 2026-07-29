import { describe, it, expect, vi } from "vitest";
import {
  createCommonAxisConfig,
  createCommonGridConfig,
  createEmptyChartOption,
} from "../utils";

// Mock chart utilities to avoid numbro dependency issues
vi.mock("@/common/lib/chart/chart", () => ({
  formatDateAxis: (value: string) => value,
  formatYAxisNumber: (value: number) => String(value),
}));

describe("date-balance-chart utils", () => {
  describe("createCommonGridConfig", () => {
    it("should return an object with grid configuration", () => {
      const grid = createCommonGridConfig();
      expect(grid).toBeDefined();
      expect(typeof grid).toBe("object");
    });

    it("should have left padding of 0%", () => {
      const grid = createCommonGridConfig();
      expect(grid).toHaveProperty("left", "0%");
    });

    it("should have right padding of 0%", () => {
      const grid = createCommonGridConfig();
      expect(grid).toHaveProperty("right", "0%");
    });

    it("should have bottom padding of 25px", () => {
      const grid = createCommonGridConfig();
      expect(grid).toHaveProperty("bottom", "25px");
    });

    it("should have top padding of 3%", () => {
      const grid = createCommonGridConfig();
      expect(grid).toHaveProperty("top", "3%");
    });

    it("should have containLabel as true", () => {
      const grid = createCommonGridConfig();
      expect(grid).toHaveProperty("containLabel", true);
    });

    it("should return consistent results on multiple calls", () => {
      const grid1 = createCommonGridConfig();
      const grid2 = createCommonGridConfig();
      expect(grid1).toEqual(grid2);
    });
  });

  describe("createEmptyChartOption", () => {
    it("should return a chart option object", () => {
      const option = createEmptyChartOption();
      expect(option).toBeDefined();
      expect(typeof option).toBe("object");
    });

    it("should have a title configuration", () => {
      const option = createEmptyChartOption();
      expect(option).toHaveProperty("title");
    });

    it("should display 'No Data Available' text", () => {
      const option = createEmptyChartOption();
      const title = option.title as { text: string };
      expect(title.text).toBe("No Data Available");
    });

    it("should center the title horizontally", () => {
      const option = createEmptyChartOption();
      const title = option.title as { left: string; top: string };
      expect(title.left).toBe("center");
    });

    it("should center the title vertically", () => {
      const option = createEmptyChartOption();
      const title = option.title as { top: string };
      expect(title.top).toBe("center");
    });

    it("should use muted color for title text", () => {
      const option = createEmptyChartOption();
      const title = option.title as {
        textStyle: { color: string; fontSize: number };
      };
      expect(title.textStyle.color).toBe("#999");
    });

    it("should use appropriate font size for title", () => {
      const option = createEmptyChartOption();
      const title = option.title as {
        textStyle: { fontSize: number };
      };
      expect(title.textStyle.fontSize).toBe(16);
    });
  });

  describe("createCommonAxisConfig", () => {
    const sampleDates = ["2024-01", "2024-02", "2024-03"];

    it("should return xAxis and yAxis configurations", () => {
      const config = createCommonAxisConfig(sampleDates);
      expect(config).toHaveProperty("xAxis");
      expect(config).toHaveProperty("yAxis");
    });

    it("should set xAxis type to category", () => {
      const config = createCommonAxisConfig(sampleDates);
      const xAxis = config.xAxis as { type: string };
      expect(xAxis.type).toBe("category");
    });

    it("should use provided dates as xAxis data", () => {
      const config = createCommonAxisConfig(sampleDates);
      const xAxis = config.xAxis as { data: string[] };
      expect(xAxis.data).toEqual(sampleDates);
    });

    it("should set yAxis type to value", () => {
      const config = createCommonAxisConfig(sampleDates);
      const yAxis = config.yAxis as { type: string };
      expect(yAxis.type).toBe("value");
    });

    it("should handle empty dates array", () => {
      const config = createCommonAxisConfig([]);
      const xAxis = config.xAxis as { data: string[] };
      expect(xAxis.data).toEqual([]);
    });

    it("should configure xAxis axis line with gray color", () => {
      const config = createCommonAxisConfig(sampleDates);
      const xAxis = config.xAxis as {
        axisLine: { lineStyle: { color: string } };
      };
      expect(xAxis.axisLine.lineStyle.color).toContain("rgba(128, 128, 128");
    });

    it("should configure yAxis split lines", () => {
      const config = createCommonAxisConfig(sampleDates);
      const yAxis = config.yAxis as {
        splitLine: { show: boolean };
      };
      expect(yAxis.splitLine.show).toBe(true);
    });

    it("should configure yAxis axis label formatter", () => {
      const config = createCommonAxisConfig(sampleDates);
      const yAxis = config.yAxis as {
        axisLabel: { formatter: (val: number) => string; fontSize: number };
      };
      expect(typeof yAxis.axisLabel.formatter).toBe("function");
      expect(yAxis.axisLabel.fontSize).toBe(12);
    });

    it("should configure xAxis label formatter", () => {
      const config = createCommonAxisConfig(sampleDates, "monthly");
      const xAxis = config.xAxis as {
        axisLabel: { formatter: (val: string) => string };
      };
      expect(typeof xAxis.axisLabel.formatter).toBe("function");
    });

    it("should use 'monthly' as default interval in formatter", () => {
      const config = createCommonAxisConfig(sampleDates); // no interval
      const xAxis = config.xAxis as {
        axisLabel: { formatter: (val: string) => string };
      };
      // Should not throw even without interval
      expect(() => xAxis.axisLabel.formatter("2024-01")).not.toThrow();
    });

    it("should work with different intervals", () => {
      const intervals: Array<
        "yearly" | "quarterly" | "monthly" | "weekly" | "daily"
      > = ["yearly", "quarterly", "monthly", "weekly", "daily"];

      intervals.forEach((interval) => {
        const config = createCommonAxisConfig(sampleDates, interval);
        expect(config.xAxis).toBeDefined();
        expect(config.yAxis).toBeDefined();
      });
    });
  });
});
