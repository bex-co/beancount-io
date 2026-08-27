import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { EChartsOption } from "echarts";
import { ActivityBreakdownChart, NetCashFlowChart } from "../cash-flow-charts";
import type { CashFlowIntervalPoint } from "../lib/model";

const { captureOption } = vi.hoisted(() => ({ captureOption: vi.fn() }));

vi.mock("@/common/components/react-echarts", () => ({
  ReactECharts: ({ option }: { option: EChartsOption }) => {
    captureOption(option);
    return null;
  },
}));

vi.mock("@/common/hooks/use-format-number", () => ({
  useFormatNumber: () => (value: number) => String(value),
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => key,
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

const points: CashFlowIntervalPoint[] = [
  {
    date: "2026-01-01",
    activities: {
      operating: { USD: "3500.00" },
      investing: { USD: "-1000.00" },
      financing: {},
    },
    net: { USD: "2500.00", EUR: "-10.50" },
  },
  {
    date: "2026-02-01",
    activities: {
      operating: { USD: "-100.00" },
      investing: {},
      financing: { USD: "200.00" },
    },
    net: { USD: "100.00" },
  },
];

describe("NetCashFlowChart", () => {
  it("converts exact decimal strings to numbers only at the chart boundary", () => {
    render(
      <NetCashFlowChart data={points} interval="monthly" primarySeries="USD" />,
    );

    const option = captureOption.mock.calls.at(-1)![0];
    const series = option.series as Array<{
      name: string;
      data: number[];
    }>;
    // Primary currency first; missing currency in an interval becomes 0.
    expect(series.map((entry) => entry.name)).toEqual(["USD", "EUR"]);
    expect(series[0].data).toEqual([2500, 100]);
    expect(series[1].data).toEqual([-10.5, 0]);

    const legend = option.legend as { selected: Record<string, boolean> };
    expect(legend.selected).toEqual({ USD: true, EUR: false });
  });

  it("renders the empty option when there are no intervals", () => {
    render(<NetCashFlowChart data={[]} interval="monthly" />);

    const option = captureOption.mock.calls.at(-1)![0];
    expect(option.series).toEqual([]);
  });
});

describe("ActivityBreakdownChart", () => {
  it("stacks one series per activity within each currency group", () => {
    render(
      <ActivityBreakdownChart
        data={points}
        interval="monthly"
        primarySeries="USD"
      />,
    );

    const option = captureOption.mock.calls.at(-1)![0];
    const series = option.series as Array<{
      name: string;
      stack: string;
      data: number[];
    }>;
    // One (currency × activity) series per combination; USD is the only currency here.
    expect(series).toHaveLength(3);
    expect(series.every((entry) => entry.stack === "USD")).toBe(true);
    // operating, investing, financing in model order; missing activity → 0.
    expect(series[0].data).toEqual([3500, -100]);
    expect(series[1].data).toEqual([-1000, 0]);
    expect(series[2].data).toEqual([0, 200]);
  });
});
