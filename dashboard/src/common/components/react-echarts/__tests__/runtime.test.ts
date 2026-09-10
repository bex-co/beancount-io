// @vitest-environment node
import { describe, expect, it } from "vitest";
import { init } from "../runtime";
import { use as registerCharts } from "echarts/core";
import { SVGRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";

// Exercise the real selective registry without jsdom's missing Canvas API.
// Production-browser checks separately exercise the Canvas renderer.
registerCharts(SVGRenderer);
const axes = {
  xAxis: { type: "category" as const, data: ["Jan", "Feb"] },
  yAxis: { type: "value" as const },
};
const cases: [string, EChartsOption][] = [
  ["bar", { ...axes, series: [{ name: "Income", type: "bar", data: [4, 7] }] }],
  [
    "line",
    {
      ...axes,
      series: [{ name: "Balance", type: "line", data: [4, 7], areaStyle: {} }],
    },
  ],
  [
    "pie",
    {
      series: [
        {
          type: "pie",
          data: [
            { name: "Assets", value: 4 },
            { name: "Income", value: 7 },
          ],
        },
      ],
    },
  ],
  [
    "sankey",
    {
      series: [
        {
          type: "sankey",
          data: [{ name: "Income" }, { name: "Expenses" }],
          links: [{ source: "Income", target: "Expenses", value: 4 }],
        },
      ],
    },
  ],
  [
    "treemap",
    {
      series: [
        {
          type: "treemap",
          data: [
            { name: "Assets", value: 4 },
            { name: "Income", value: 7 },
          ],
        },
      ],
    },
  ],
];

describe("the shared chart registry", () => {
  it("registers a transparent app-dark theme with readable label colors", () => {
    const chart = init(undefined, "app-dark", {
      renderer: "svg",
      ssr: true,
      width: 600,
      height: 300,
    });
    try {
      chart.setOption({
        ...axes,
        animation: false,
        backgroundColor: undefined,
        legend: { data: ["Balance"] },
        series: [{ name: "Balance", type: "line", data: [4, 7] }],
      });
      const option = chart.getOption() as {
        backgroundColor?: string;
        textStyle?: { color?: string };
        legend?: Array<{ textStyle?: { color?: string } }>;
      };
      expect(option.backgroundColor === "transparent" || !option.backgroundColor).toBe(
        true,
      );
      const svg = chart.renderToSVGString();
      // Dark theme contrast color #B9B8CE should appear for axis/legend text.
      expect(svg.toLowerCase()).toContain("#b9b8ce");
    } finally {
      chart.dispose();
    }
  });

  it.each(cases)(
    "renders %s with registered report components",
    (_name, option) => {
      const chart = init(undefined, undefined, {
        renderer: "svg",
        ssr: true,
        width: 600,
        height: 300,
      });
      try {
        chart.setOption({
          ...option,
          animation: false,
          title: { text: "Ledger" },
          legend: { type: "scroll" },
          tooltip: { trigger: "item" },
        });
        const svg = chart.renderToSVGString();
        expect(svg).toContain("Ledger");
        expect(svg).toContain("<path");
        expect(chart.getOption().series).toHaveLength(1);
      } finally {
        chart.dispose();
      }
    },
  );
  it("supports inside zoom, scroll legends, and axis-pointer tooltips", () => {
    const chart = init(undefined, undefined, {
      renderer: "svg",
      ssr: true,
      width: 600,
      height: 300,
    });
    try {
      chart.setOption({
        ...axes,
        animation: false,
        legend: { type: "scroll" },
        tooltip: { trigger: "axis", axisPointer: { type: "cross" } },
        dataZoom: [{ type: "inside", start: 0, end: 100 }],
        series: [{ name: "Balance", type: "line", data: [4, 7] }],
      });
      chart.dispatchAction({ type: "dataZoom", start: 20, end: 80 });
      expect(chart.getOption().dataZoom).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ start: 20, end: 80 }),
        ]),
      );
      chart.dispatchAction({ type: "legendUnSelect", name: "Balance" });
      expect(chart.getOption().legend).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            selected: expect.objectContaining({ Balance: false }),
          }),
        ]),
      );
    } finally {
      chart.dispose();
    }
  });
});
