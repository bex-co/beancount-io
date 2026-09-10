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
    expect(labels.formatAxisTick(0.0225)).not.toBe(labels.formatAxisTick(0.0227));
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
