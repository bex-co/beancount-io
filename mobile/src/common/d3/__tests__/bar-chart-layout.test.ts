import fs from "fs";
import path from "path";
import { axisLabelWidth } from "../axis-label-width";
import { BAR_CHART_MIN_AXIS_WIDTH, barChartLayout } from "../bar-chart-layout";
import { formatShortMoneyWithCurrency } from "../../number-utils";

/**
 * Home's spending chart (note w2/048): a fixed 50pt gutter clipped the
 * leading digit of `0.8 MSEK`-style ticks at the card's hidden-overflow edge.
 */

// A 402pt phone minus the 20pt content padding on each side.
const CHART_WIDTH = 362;
const FONT = 12;

const ticks = (values: number[], currency: string) =>
  values.map((tick) => formatShortMoneyWithCurrency(tick, currency));

function expectInsidePlot(
  layout: ReturnType<typeof barChartLayout>,
  count: number,
) {
  for (let i = 0; i < count; i++) {
    expect(layout.barX(i) >= layout.axisWidth).toBe(true);
    expect(layout.barX(i) + layout.barWidth <= CHART_WIDTH).toBe(true);
    expect(layout.labelX(i) > layout.axisWidth).toBe(true);
    expect(layout.labelX(i) < CHART_WIDTH).toBe(true);
  }
}

describe("barChartLayout", () => {
  it("widens the gutter for zero-spending MSEK ticks", () => {
    // Both months empty: d3 ticks the [0, 1] domain in steps of 0.2.
    const labels = ticks([0, 0.2, 0.4, 0.6, 0.8, 1], "MSEK");
    expect(labels[4]).toBe("0.8 MSEK");
    const layout = barChartLayout(CHART_WIDTH, labels, 2, FONT);
    expect(layout.axisWidth).toBe(axisLabelWidth(labels, FONT, 50));
    expect(layout.axisWidth >= 76).toBe(true);
    expectInsidePlot(layout, 2);
  });

  it("keeps the 50pt minimum for short USD ticks", () => {
    const labels = ticks([0, 0.2, 0.4, 0.6, 0.8, 1], "USD");
    const layout = barChartLayout(CHART_WIDTH, labels, 2, FONT);
    expect(layout.axisWidth).toBe(BAR_CHART_MIN_AXIS_WIDTH);
    expectInsidePlot(layout, 2);
  });

  it("fits signed and longer currency-bearing ticks", () => {
    for (const values of [
      [-20000, -10000, 0, 10000, 20000],
      [0, 250000, 500000, 750000, 1000000],
    ]) {
      const labels = ticks(values, "MSEK");
      const layout = barChartLayout(CHART_WIDTH, labels, 2, FONT);
      expect(layout.axisWidth).toBe(axisLabelWidth(labels, FONT, 50));
      expect(layout.axisWidth > BAR_CHART_MIN_AXIS_WIDTH).toBe(true);
      expectInsidePlot(layout, 2);
    }
  });

  it("keeps several bars and their centred labels within the plot", () => {
    const labels = ticks([0, 2000, 4000], "MRMB");
    const layout = barChartLayout(CHART_WIDTH, labels, 6, FONT);
    expectInsidePlot(layout, 6);
    expect(layout.labelX(0)).toBe(layout.barX(0) + layout.barWidth / 2);
  });

  it("draws nothing for an empty series", () => {
    expect(barChartLayout(CHART_WIDTH, ["$0"], 0, FONT).barWidth).toBe(0);
  });

  it("is the layout Home's bar chart draws with", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "bar-chart-d3.tsx"),
      "utf8",
    );
    expect(source.includes("barChartLayout(")).toBe(true);
    expect(source.includes("x={axisWidth - 4}")).toBe(true);
    expect(source.includes("leftPadding")).toBe(false);
  });
});
