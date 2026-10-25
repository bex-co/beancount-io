import * as echarts from "echarts";
import type { EChartsOption } from "echarts";
import { afterEach, describe, expect, it } from "vitest";
import type { QueryResultTable } from "@/graphql/definitions";
import { parseQueryChart } from "../chart-utils";

/**
 * A query chart keeps a nonzero range for very small Decimal results
 * (w4/1049). ECharts rounds an automatic extent to 20 decimals, so 1e-24
 * drew a zero-height bar on a [0, 0] axis and 5.94e-24 / 5.23e-24 a flat
 * line. The built option runs through real ECharts; jsdom cannot paint, so
 * it renders SVG.
 */
echarts.setPlatformAPI({ measureText: (text) => ({ width: text.length * 7 }) });

const charts: echarts.ECharts[] = [];
afterEach(() => charts.splice(0).forEach((chart) => chart.dispose()));

function table(
  firstType: "str" | "date",
  rows: [string, string][],
): QueryResultTable {
  return {
    __typename: "QueryResultTable",
    types: [
      { __typename: "QueryResultType", name: "label", dtype: firstType },
      { __typename: "QueryResultType", name: "amount", dtype: "Decimal" },
    ],
    rows,
  } as QueryResultTable;
}

function draw(result: QueryResultTable) {
  const config = parseQueryChart(result)!;
  const chart = echarts.init(null, null, {
    renderer: "svg",
    ssr: true,
    width: 600,
    height: 300,
  });
  charts.push(chart);
  chart.setOption(config.option);
  const series = (config.option.series as { data: number[] }[])[0];
  const axis = (
    chart.getModel() as unknown as {
      getComponent: (
        type: string,
        index: number,
      ) => {
        axis: { scale: { getExtent: () => [number, number] } };
      };
    }
  ).getComponent("yAxis", 0).axis;
  const y = (index: number, value: number) =>
    (chart.convertToPixel({ seriesIndex: 0 }, [index, value]) as number[])[1];
  const tooltip = (
    config.option.tooltip as {
      valueFormatter: (value: number, index: number) => string;
    }
  ).valueFormatter;
  return {
    option: config.option as EChartsOption,
    plotted: series.data,
    extent: axis.scale.getExtent(),
    y,
    tooltip,
    svg: chart.renderToSVGString(),
  };
}

describe("BQL charts of very small values", () => {
  it.each([
    ["positive", "0.000000000000000000000001"],
    ["negative", "-0.000000000000000000000001"],
  ])("gives a %s 1e-24 bar a real range and height", (_, amount) => {
    const chart = draw(table("str", [["qa-20261024-tiny", amount]]));

    expect(chart.extent[1]).toBeGreaterThan(chart.extent[0]);
    const height = Math.abs(chart.y(0, chart.plotted[0]) - chart.y(0, 0));
    expect(height).toBeGreaterThan(50);
    expect(chart.svg).toContain(amount.startsWith("-") ? "-1e-24" : "1e-24");
    // The tooltip still says the exact decimal the query returned.
    expect(chart.tooltip(chart.plotted[0], 0)).toBe(amount);
  });

  it("keeps two different tiny dated values apart on the line", () => {
    const chart = draw(
      table("date", [
        ["2016-04-12", "0.00000000000000000000000594"],
        ["2016-04-19", "0.00000000000000000000000523"],
      ]),
    );

    expect(chart.extent[1]).toBeGreaterThan(chart.extent[0]);
    expect(
      Math.abs(chart.y(0, chart.plotted[0]) - chart.y(1, chart.plotted[1])),
    ).toBeGreaterThan(5);
    expect(chart.tooltip(chart.plotted[1], 1)).toBe(
      "0.00000000000000000000000523",
    );
  });

  it.each([
    ["1e-12", "0.000000000001"],
    ["1e-15", "0.000000000000001"],
    ["an ordinary amount", "4.00995"],
    ["zero", "0"],
  ])("plots %s as before", (_, amount) => {
    const chart = draw(table("str", [["control", amount]]));
    expect(chart.plotted).toEqual([Number(amount)]);
    expect(
      (chart.option.yAxis as { axisLabel?: unknown }).axisLabel,
    ).toBeUndefined();
  });

  it("keeps a mixed-magnitude series in proportion, not rescaled", () => {
    const chart = draw(
      table("str", [
        ["tiny", "0.000000000000000000000001"],
        ["one", "1"],
      ]),
    );
    expect(chart.plotted).toEqual([1e-24, 1]);
  });

  it("parses a 150,000-point result without throwing (w4/1076)", () => {
    const rows: [string, string][] = Array.from({ length: 150_000 }, (_, i) => [
      `row-${i}`,
      i % 2 === 0 ? "1" : "-1",
    ]);
    const config = parseQueryChart(table("str", rows));
    expect(config).not.toBeNull();
    const series = (config!.option.series as { data: number[] }[])[0];
    expect(series.data).toHaveLength(150_000);
  });

  it("keeps each repeated label's own exact value in the tooltip", () => {
    const chart = draw(
      table("str", [
        ["same", "0.000000000000000000000002"],
        ["same", "0.000000000000000000000003"],
      ]),
    );
    expect(chart.tooltip(chart.plotted[0], 0)).toBe(
      "0.000000000000000000000002",
    );
    expect(chart.tooltip(chart.plotted[1], 1)).toBe(
      "0.000000000000000000000003",
    );
    expect(chart.plotted[1]).toBeGreaterThan(chart.plotted[0]);
  });
});
