import { act, cleanup, render } from "@testing-library/react";
import type { ECharts } from "echarts/core";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/common/providers/theme-provider";
import type { LegendSelection } from "../../lib/legend-selection";
import { ActivityBreakdownChart, NetCashFlowChart } from "../cash-flow-charts";
import type { CashFlowIntervalPoint } from "../lib/model";

// The real client chart and ECharts model; jsdom cannot paint a canvas, so
// only the renderer, size and text metrics are adapted (as in LineChart's
// unit-selection test). The lazy client-only wrapper is skipped.
const charts = vi.hoisted(() => [] as ECharts[]);
vi.mock("@/common/components/react-echarts/runtime", async () => {
  const runtime = await vi.importActual<
    typeof import("@/common/components/react-echarts/runtime")
  >("@/common/components/react-echarts/runtime");
  const { use, setPlatformAPI } = await import("echarts/core");
  const { SVGRenderer } = await import("echarts/renderers");
  use(SVGRenderer);
  setPlatformAPI({ measureText: (text) => ({ width: text.length * 7 }) });
  return {
    ...runtime,
    init: (element: HTMLElement, theme?: string) => {
      const chart = runtime.init(element, theme, {
        renderer: "svg",
        ssr: true,
        width: 600,
        height: 300,
      });
      charts.push(chart);
      return chart;
    },
  };
});
vi.mock("@/common/components/react-echarts", async () => {
  const { ReactEChartsClient } =
    await import("@/common/components/react-echarts/client");
  return { ReactECharts: ReactEChartsClient };
});
// Stable, like the real hook (a useCallback).
vi.mock("@/common/hooks/use-format-number", () => {
  const format = (value: number) => String(value);
  return { useFormatNumber: () => format };
});
// A new `t` on every render, like the real hook.
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => key,
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

/** Dollars and vacation hours, as in the example ledger's December. */
function point(
  date: string,
  usd: string,
  hours: string,
): CashFlowIntervalPoint {
  return {
    date,
    activities: {
      operating: { USD: usd, VACHR: hours },
      investing: {},
      financing: { USD: "240.68", VACHR: `-${hours}` },
    },
    net: { USD: usd, VACHR: "0" },
  };
}
const monthly = [
  point("2016-10-31", "4802.68", "15"),
  point("2016-11-30", "4700.00", "10"),
  point("2016-12-31", "4802.68", "15"),
];
const quarterly = [point("2016-12-31", "14305.36", "40")];

/** The chart currently mounted: the last one created and not disposed. */
function chartOf(): ECharts {
  const chart = charts.findLast((each) => !each.isDisposed());
  if (!chart) throw new Error("Expected a mounted chart");
  return chart;
}

function shown(chart: ECharts): LegendSelection {
  const option = chart.getOption() as {
    legend: Array<{ selected: LegendSelection }>;
  };
  return option.legend[0].selected;
}

/** The reader clicks a legend item, as the canvas does. */
function toggle(chart: ECharts, unit: string) {
  act(() => {
    chart.dispatchAction({ type: "legendToggleSelect", name: unit });
  });
}

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(() => {
  cleanup();
  charts.length = 0;
  vi.unstubAllGlobals();
});

/**
 * Choosing another interval used to put USD back: each new option carried
 * the primary-unit default over the reader's VACHR, and the page's pending
 * branch unmounted the chart with whatever it held (w4/1024).
 */
describe.each([
  ["Net Cash Flow", NetCashFlowChart],
  ["By Activity", ActivityBreakdownChart],
])("%s unit selection across interval changes (w4/1024)", (_, Chart) => {
  it("keeps the reader's units when a cached interval regroups the chart", () => {
    const view = (data: CashFlowIntervalPoint[]) => (
      <ThemeProvider defaultTheme="light">
        <Chart data={data} interval="monthly" primarySeries="USD" />
      </ThemeProvider>
    );
    const { rerender } = render(view(monthly));
    const chart = chartOf();
    expect(shown(chart)).toEqual({ USD: true, VACHR: false });

    toggle(chart, "VACHR");
    toggle(chart, "USD");
    expect(shown(chart)).toEqual({ USD: false, VACHR: true });

    // A cached regrouping: same chart instance, new option.
    rerender(view(quarterly));
    expect(chartOf()).toBe(chart);
    expect(shown(chart)).toEqual({ USD: false, VACHR: true });
  });

  it("restores the page's units after an uncached read remounts the chart", () => {
    let setLoading!: (loading: boolean) => void;
    let setData!: (data: CashFlowIntervalPoint[]) => void;
    function Report() {
      const [units, setUnits] = useState<LegendSelection>();
      const [loading, load] = useState(false);
      const [data, use] = useState(monthly);
      setLoading = load;
      setData = use;
      return (
        <ThemeProvider defaultTheme="light">
          {loading ? (
            <p>Loading</p>
          ) : (
            <Chart
              data={data}
              interval="monthly"
              primarySeries="USD"
              legendSelection={units}
              onLegendSelectionChange={setUnits}
            />
          )}
        </ThemeProvider>
      );
    }
    render(<Report />);
    const first = chartOf();
    toggle(first, "VACHR");
    toggle(first, "USD");

    act(() => setLoading(true));
    act(() => {
      setData(quarterly);
      setLoading(false);
    });
    const second = chartOf();
    expect(second).not.toBe(first);
    expect(shown(second)).toEqual({ USD: false, VACHR: true });
  });

  it("starts a first visit on the primary unit alone", () => {
    render(
      <ThemeProvider defaultTheme="light">
        <Chart data={monthly} interval="monthly" primarySeries="USD" />
      </ThemeProvider>,
    );
    expect(shown(chartOf())).toEqual({ USD: true, VACHR: false });
  });
});
