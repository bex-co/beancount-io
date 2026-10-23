import { act, cleanup, render } from "@testing-library/react";
import type { ECharts } from "echarts/core";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DateAndBalance } from "@/graphql/definitions";
import { ThemeProvider } from "@/common/providers/theme-provider";
import { LineChart } from "../line-chart";
import {
  legendSelectionFor,
  type LegendSelection,
} from "../../lib/legend-selection";

// The real client chart and ECharts model; jsdom cannot paint a canvas, so
// only the renderer, size and text metrics are adapted (as in the client's
// own legend tests). The lazy client-only wrapper is skipped.
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

const monthly: DateAndBalance[] = [
  "2026-01-31",
  "2026-02-28",
  "2026-03-31",
].map((date, index) => ({
  date,
  balance: { USD: String(1000 + index), BTC: `0.0${index + 1}` },
}));
const quarterly: DateAndBalance[] = [
  { date: "2026-03-31", balance: { USD: "1002", BTC: "0.03" } },
];

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

describe("LineChart unit selection across period changes (w4/m51)", () => {
  it("keeps the reader's units when the same chart regroups its period", () => {
    const view = (data: DateAndBalance[]) => (
      <ThemeProvider defaultTheme="light">
        <LineChart data={data} interval="monthly" primarySeries="USD" />
      </ThemeProvider>
    );
    const { rerender } = render(view(monthly));
    const chart = chartOf();
    expect(shown(chart)).toEqual({ USD: true, BTC: false });

    toggle(chart, "BTC");
    toggle(chart, "USD");
    expect(shown(chart)).toEqual({ USD: false, BTC: true });

    // A cached regrouping: same chart instance, new option.
    rerender(view(quarterly));
    expect(chartOf()).toBe(chart);
    expect(shown(chart)).toEqual({ USD: false, BTC: true });
  });

  it("restores the owner's units after a pending read remounts the chart", () => {
    let setLoading!: (loading: boolean) => void;
    let setData!: (data: DateAndBalance[]) => void;
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
            <LineChart
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
    toggle(first, "BTC");
    toggle(first, "USD");

    act(() => setLoading(true));
    act(() => {
      setData(quarterly);
      setLoading(false);
    });
    const second = chartOf();
    expect(second).not.toBe(first);
    expect(shown(second)).toEqual({ USD: false, BTC: true });
  });
});

describe("legendSelectionFor", () => {
  it("starts with the primary unit alone, or the first without it", () => {
    expect(legendSelectionFor(["USD", "BTC"], "USD", null)).toEqual({
      USD: true,
      BTC: false,
    });
    expect(legendSelectionFor(["BTC", "ETH"], "USD", null)).toEqual({
      BTC: true,
      ETH: false,
    });
  });

  it("keeps the reader's choice, with a newly present unit hidden", () => {
    expect(
      legendSelectionFor(["USD", "BTC", "ETH"], "USD", {
        USD: false,
        BTC: true,
      }),
    ).toEqual({ USD: false, BTC: true, ETH: false });
  });

  it("keeps a deliberate all-off choice", () => {
    expect(
      legendSelectionFor(["USD", "BTC"], "USD", { USD: false, BTC: false }),
    ).toEqual({ USD: false, BTC: false });
  });

  it("uses the default for a choice about other units", () => {
    expect(legendSelectionFor(["USD"], "USD", { IRAUSD: true })).toEqual({
      USD: true,
    });
  });

  it("uses the default when every chosen unit is absent here", () => {
    // Units → Market value leaves USD alone, which the reader had hidden.
    expect(
      legendSelectionFor(["USD"], "USD", { USD: false, BTC: true }),
    ).toEqual({ USD: true });
  });
});
