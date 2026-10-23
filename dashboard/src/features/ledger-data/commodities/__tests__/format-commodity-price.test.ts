import { describe, expect, it } from "vitest";
import {
  commodityAxisDecimals,
  formatCommodityAxisTick,
  formatCommodityPriceLabel,
} from "../format-commodity-price";
import { buildCommodityChartLabels } from "../build-commodity-chart-labels";

describe("formatCommodityPriceLabel", () => {
  it("preserves distinct low-price CUSDC quotes without 2dp rounding", () => {
    expect(formatCommodityPriceLabel("0.0225")).toBe("0.0225");
    expect(formatCommodityPriceLabel("0.0227")).toBe("0.0227");
    expect(formatCommodityPriceLabel("0.0230")).toBe("0.023");
  });

  it("keeps large BTC quotes readable", () => {
    expect(formatCommodityPriceLabel("59000.00")).toBe("59000");
    expect(formatCommodityPriceLabel("59000.50")).toBe("59000.5");
  });
});

describe("commodity axis formatting", () => {
  it("uses enough decimals for the CUSDC range so ticks stay distinct", () => {
    const values = [0.0225, 0.0227, 0.023];
    expect(commodityAxisDecimals(values)).toBeGreaterThan(2);
    expect(formatCommodityAxisTick(0.0225, values)).not.toBe(
      formatCommodityAxisTick(0.0227, values),
    );
  });

  it("keeps two decimals for large BTC-scale values", () => {
    const values = [58000, 59000, 60000];
    expect(commodityAxisDecimals(values)).toBe(2);
    expect(formatCommodityAxisTick(59000, values)).toBe("59000.00");
  });
});

describe("buildCommodityChartLabels", () => {
  it("formats the reproduced CUSDC tooltips from source decimals", () => {
    const labels = buildCommodityChartLabels(
      [
        { date: "2024-01-01", value: "0.0225" },
        { date: "2024-06-01", value: "0.0227" },
        { date: "2024-12-31", value: "0.0230" },
      ],
      "CUSDC/USD",
      (date) => date,
    );

    expect(labels.formatTooltip("2024-01-01")).toBe(
      "2024-01-01<br/>CUSDC/USD: 0.0225",
    );
    expect(labels.formatTooltip("2024-06-01")).toBe(
      "2024-06-01<br/>CUSDC/USD: 0.0227",
    );
    expect(labels.formatTooltip("2024-12-31")).toBe(
      "2024-12-31<br/>CUSDC/USD: 0.023",
    );
    expect(labels.formatAxisTick(0.0225)).not.toBe(
      labels.formatAxisTick(0.0227),
    );
  });

  it("keeps BTC tooltips aligned with source quotes", () => {
    const labels = buildCommodityChartLabels(
      [{ date: "2024-08-01", value: "59000.00" }],
      "BTC/USD",
      (date) => date,
    );

    expect(labels.formatTooltip("2024-08-01")).toBe(
      "2024-08-01<br/>BTC/USD: 59000",
    );
    expect(labels.formatAxisTick(59000)).toBe("59000.00");
  });
});

describe("tiny and exponent quotes (w4/1003)", () => {
  it("trims only the mantissa of an exponent quote", () => {
    expect(formatCommodityPriceLabel("1.25e-10")).toBe("1.25e-10");
    expect(formatCommodityPriceLabel("2.5e-10")).toBe("2.5e-10");
    expect(formatCommodityPriceLabel("5e-10")).toBe("5e-10");
    expect(formatCommodityPriceLabel("1.250E-10")).toBe("1.25E-10");
    expect(formatCommodityPriceLabel("2.0e+20")).toBe("2e+20");
    expect(formatCommodityPriceLabel("0.000000002")).toBe("0.000000002");
    expect(formatCommodityPriceLabel("0.000000000")).toBe("0");
  });

  it("keeps a nano-price series' ticks distinct and nonzero", () => {
    const { formatAxisTick } = buildCommodityChartLabels(
      [
        { date: "2016-01-01", value: "0.000000001" },
        { date: "2016-02-01", value: "0.000000002" },
        { date: "2016-03-01", value: "0.000000003" },
      ],
      "QAMICRO/USD",
      (date) => date,
    );
    // ECharts' nice ticks for this series, float noise included.
    const ticks = [0, 5e-10, 1e-9, 1.5000000000000002e-9, 2e-9, 2.5e-9, 3e-9];
    expect(ticks.map(formatAxisTick)).toEqual([
      "0",
      "5e-10",
      "1e-9",
      "1.5e-9",
      "2e-9",
      "2.5e-9",
      "3e-9",
    ]);
  });

  it("keeps a constant tiny price nonzero", () => {
    const values = [2e-9, 2e-9];
    expect(formatCommodityAxisTick(2e-9, values)).toBe("2e-9");
    expect(formatCommodityAxisTick(2.2e-9, values)).toBe("2.2e-9");
  });

  it("writes a fine series above 1e-6 in plain decimals", () => {
    const values = [0.000001, 0.00000102];
    expect(formatCommodityAxisTick(0.000001005, values)).toBe("0.000001005");
  });

  it("keeps ordinary quotes and genuine zero as before", () => {
    const cusdc = [0.0225, 0.0227, 0.023];
    expect(
      [0.018, 0.0225, 0.025].map((tick) =>
        formatCommodityAxisTick(tick, cusdc),
      ),
    ).toEqual(["0.01800", "0.02250", "0.02500"]);
    expect(formatCommodityAxisTick(0.4, [0, 0, 0])).toBe("0.40");
    expect(formatCommodityAxisTick(59000, [58000, 60000])).toBe("59000.00");
  });
});
