import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { EChartsOption, LineSeriesOption } from "echarts";
import { NetWorthCard } from "../net-worth-card";
import type { DataSeries } from "../../lib/overview-utils";

// ECharts renders to canvas, which jsdom cannot assert on: capture the option
// object instead.
const capturedOptions: EChartsOption[] = [];

vi.mock("@/common/components/react-echarts", () => ({
  ReactECharts: ({ option }: { option: EChartsOption }) => {
    capturedOptions.push(option);
    return <div data-testid="echarts-mock" />;
  },
}));

vi.mock("@/common/hooks/use-format-number", () => ({
  useFormatNumber: () => (v: number) => String(v),
}));

let language = "en";

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => key,
    i18n: { language },
  }),
}));

function lastOption(): EChartsOption {
  const option = capturedOptions.at(-1);
  if (!option) throw new Error("chart was never rendered");
  return option;
}

function lineSeries(option: EChartsOption): LineSeriesOption[] {
  return (
    Array.isArray(option.series) ? option.series : [option.series]
  ) as LineSeriesOption[];
}

function axisLabelFormatter(option: EChartsOption): (value: string) => string {
  const xAxis = option.xAxis as {
    axisLabel: { formatter: (value: string) => string };
  };
  return xAxis.axisLabel.formatter;
}

beforeEach(() => {
  capturedOptions.length = 0;
  language = "en";
});

const multiMonth: DataSeries = [
  { date: "2026-01-31", balance: { USD: 100 } },
  { date: "2026-02-28", balance: { USD: 150 } },
  { date: "2026-03-31", balance: { USD: 120 } },
];

const singleMonth: DataSeries = [{ date: "2026-01-31", balance: { USD: 100 } }];

describe("NetWorthCard chart series", () => {
  it("shows a visible marker for a single-point series", () => {
    render(<NetWorthCard data={singleMonth} primaryCurrency="USD" />);

    const series = lineSeries(lastOption());
    expect(series).toHaveLength(1);
    expect(series[0].data).toEqual([100]);
    expect(series[0].symbol).toBe("circle");
    expect(series[0].symbolSize).toBe(7);
    expect(series[0].showSymbol).toBe(true);
  });

  it("keeps symbols off for a multi-point series", () => {
    render(<NetWorthCard data={multiMonth} primaryCurrency="USD" />);

    const series = lineSeries(lastOption());
    expect(series[0].data).toEqual([100, 150, 120]);
    expect(series[0].symbol).toBe("none");
    expect(series[0].symbolSize).toBeUndefined();
    expect(series[0].showSymbol).toBe(false);
  });

  it("treats a series with one finite value among null gaps as single-point", () => {
    const data: DataSeries = [
      { date: "2026-01-31", balance: { USD: 100 } },
      { date: "2026-02-28", balance: { USD: 150, EUR: 10 } },
      { date: "2026-03-31", balance: { USD: 120 } },
    ];

    render(<NetWorthCard data={data} primaryCurrency="EUR" />);

    const series = lineSeries(lastOption());
    const eur = series.find((item) => item.name === "EUR");
    expect(eur?.data).toEqual([null, 10, null]);
    expect(eur?.symbol).toBe("circle");
  });

  it("renders the empty state without a chart", () => {
    render(<NetWorthCard data={[]} primaryCurrency="USD" />);

    expect(screen.queryByTestId("echarts-mock")).not.toBeInTheDocument();
    expect(screen.getByText("common.noDataFound")).toBeInTheDocument();
  });

  it("keeps the currency tooltip formatter", () => {
    render(<NetWorthCard data={multiMonth} primaryCurrency="USD" />);

    const tooltip = lastOption().tooltip as {
      trigger: string;
      valueFormatter: (value: number) => string;
    };
    expect(tooltip.trigger).toBe("axis");
    expect(tooltip.valueFormatter(150)).toBe("150");
  });
});

describe("NetWorthCard localization", () => {
  it("formats the x-axis in the active language", () => {
    render(<NetWorthCard data={multiMonth} primaryCurrency="USD" />);
    expect(axisLabelFormatter(lastOption())("2026-02-28")).toBe("Feb");
  });

  it("re-renders the axis formatter when the language changes", () => {
    const { rerender } = render(
      <NetWorthCard data={multiMonth} primaryCurrency="USD" />,
    );
    const englishOption = lastOption();

    language = "fr";
    rerender(<NetWorthCard data={multiMonth} primaryCurrency="USD" />);
    const frenchOption = lastOption();

    expect(frenchOption).not.toBe(englishOption);
    expect(axisLabelFormatter(frenchOption)("2026-02-28")).toBe("févr.");
  });

  it("formats table-view month labels in the active language", async () => {
    language = "fr";
    render(<NetWorthCard data={multiMonth} primaryCurrency="USD" />);

    await userEvent.click(
      screen.getByRole("button", { name: "page.overview.tableView" }),
    );

    expect(screen.getByText("févr. 2026")).toBeInTheDocument();
    expect(screen.getByText("mars 2026")).toBeInTheDocument();
  });

  it("falls back to the raw date in the table for an unparseable date", async () => {
    render(
      <NetWorthCard
        data={[{ date: "not-a-date", balance: { USD: 1 } }]}
        primaryCurrency="USD"
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "page.overview.tableView" }),
    );

    expect(screen.getByText("not-a-date")).toBeInTheDocument();
  });
});
