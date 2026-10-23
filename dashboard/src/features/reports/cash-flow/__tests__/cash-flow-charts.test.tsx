import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

/**
 * Both charts' values are readable without a pointer: a named Period data
 * disclosure with the model's exact decimals and the chart's plotted zeros
 * (w4/996).
 */
describe("Cash Flow chart period data", () => {
  function withHeading(name: string, chart: React.ReactNode) {
    return (
      <>
        <h2 id="chart-title">{name}</h2>
        {chart}
      </>
    );
  }
  /** Opens the disclosure (native Enter is covered in the browser check). */
  async function openPeriodData() {
    const summary = screen.getByText("page.accountReport.periodData");
    await userEvent.setup().click(summary);
    expect(summary.closest("details")).toHaveAttribute("open");
  }
  const rows = (table: HTMLElement) =>
    within(table)
      .getAllByRole("row")
      .slice(1)
      .map((row) =>
        Array.from(row.querySelectorAll("th, td"), (cell) => cell.textContent),
      );

  it("lists net cash flow per period and unit", async () => {
    render(
      withHeading(
        "Net Cash Flow",
        <NetCashFlowChart
          data={points}
          interval="monthly"
          primarySeries="USD"
          labelledBy="chart-title"
        />,
      ),
    );
    await openPeriodData();
    const table = screen.getByRole("table", {
      name: "Net Cash Flow page.accountReport.periodData",
    });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual(["page.accountReport.period", "USD", "EUR"]);
    expect(rows(table)).toEqual([
      ["2026-01-01", "2500.00 USD", "-10.50 EUR"],
      // A unit absent from a period is the chart's plotted zero.
      ["2026-02-01", "100.00 USD", "0 EUR"],
    ]);
  });

  it("lists each activity's amount per period and unit", async () => {
    render(
      withHeading(
        "By Activity",
        <ActivityBreakdownChart
          data={points}
          interval="monthly"
          primarySeries="USD"
          labelledBy="chart-title"
        />,
      ),
    );
    await openPeriodData();
    const table = screen.getByRole("table", {
      name: "By Activity page.accountReport.periodData",
    });
    expect(rows(table)).toEqual([
      [
        "2026-01-01",
        "page.cashFlow.operating: 3500.00 USD" +
          "page.cashFlow.investing: -1000.00 USD" +
          "page.cashFlow.financing: 0 USD",
      ],
      [
        "2026-02-01",
        "page.cashFlow.operating: -100.00 USD" +
          "page.cashFlow.investing: 0 USD" +
          "page.cashFlow.financing: 200.00 USD",
      ],
    ]);
  });

  it("follows a settled replacement and shows nothing for no data", async () => {
    const view = (data: CashFlowIntervalPoint[]) =>
      withHeading(
        "Net Cash Flow",
        <NetCashFlowChart data={data} labelledBy="chart-title" />,
      );
    const { rerender } = render(view(points));
    await openPeriodData();
    rerender(view(points.slice(1)));
    expect(rows(screen.getByRole("table"))).toEqual([
      ["2026-02-01", "100.00 USD"],
    ]);

    rerender(view([]));
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByText("page.accountReport.periodData")).toBeNull();
  });
});
