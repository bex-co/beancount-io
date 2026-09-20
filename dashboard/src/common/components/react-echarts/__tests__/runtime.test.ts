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
/** WCAG contrast of a hex colour against a white card. */
function contrastOnWhite(hex: string): number {
  const channel = (value: number) => {
    const srgb = value / 255;
    return srgb <= 0.03928
      ? srgb / 12.92
      : Math.pow((srgb + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const luminance =
    0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  return 1.05 / (luminance + 0.05);
}

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
      expect(
        option.backgroundColor === "transparent" || !option.backgroundColor,
      ).toBe(true);
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
  it("keeps an unselected but operable legend label readable in light mode", () => {
    // Reports start non-primary currencies unselected; clicking one enables
    // its series, so the label is a control, not a disabled affordance.
    const chart = init(undefined, "app-light", {
      renderer: "svg",
      ssr: true,
      width: 600,
      height: 300,
    });
    try {
      chart.setOption({
        ...axes,
        animation: false,
        legend: {
          data: ["USD", "IRAUSD", "VACHR"],
          selected: { USD: true, IRAUSD: false, VACHR: false },
        },
        series: [
          { name: "USD", type: "line", data: [4, 7] },
          { name: "IRAUSD", type: "line", data: [2, 3] },
          { name: "VACHR", type: "line", data: [1, 2] },
        ],
      });

      const svg = chart.renderToSVGString();
      const labelFill = (label: string) =>
        svg.match(new RegExp(`<text[^>]*fill="([^"]+)"[^>]*>${label}<`))?.[1] ??
        null;

      const selected = labelFill("USD");
      const unselected = labelFill("IRAUSD");
      expect(selected).not.toBeNull();
      expect(unselected).not.toBeNull();
      // Both readable...
      expect(contrastOnWhite(selected as string)).toBeGreaterThanOrEqual(4.5);
      expect(contrastOnWhite(unselected as string)).toBeGreaterThanOrEqual(4.5);
      // ...and still distinguishable from each other.
      expect(unselected).not.toBe(selected);
      // The near-white default this replaced would fail outright.
      expect(contrastOnWhite("#cfd2d7")).toBeLessThan(4.5);
      expect(labelFill("VACHR")).toBe(unselected);
    } finally {
      chart.dispose();
    }
  });

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
