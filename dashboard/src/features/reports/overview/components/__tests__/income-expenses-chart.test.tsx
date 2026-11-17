import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import type { SupportedLanguage } from "@/i18n/config";
import { IncomeExpensesChart } from "../income-expenses-chart";

type ChartOption = {
  tooltip: {
    trigger: string;
    axisPointer: { type: string };
    formatter?: unknown;
  };
  xAxis: { data: string[] };
  yAxis: { axisLabel: { formatter: (value: number) => string } };
  legend: { data: string[] };
  series: Array<{
    name: string;
    type: string;
    data: Array<number | { value: number; itemStyle: { color: string } }>;
    tooltip: { valueFormatter: (value: unknown, dataIndex: number) => string };
  }>;
};

type AxisPointerLabel = {
  tooltip: {
    axisPointer: {
      label: { formatter: (params: { value: string }) => string };
    };
  };
};

const ledger = vi.hoisted(() => ({ renderCommas: true }));
let captured: ChartOption | undefined;

vi.unmock("react-i18next");
vi.unmock("@/common/hooks/use-translations");
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerData: { options: ledger } }),
}));
vi.mock("@/common/components/react-echarts", () => ({
  ReactECharts: ({ option }: { option: ChartOption }) => {
    captured = option;
    return <div data-testid="chart" />;
  },
}));

// January/April amounts from the reproduced public report, plus an omitted
// synthetic EUR amount and a sparse December to retain unit/zero controls.
const income = [
  { date: "2026-01-31", balance: { USD: "-15500", EUR: "-100" } },
  { date: "2026-04-30", balance: { USD: "-4792.4" } },
  { date: "2026-12-31", balance: {} },
];
const expenses = [
  { date: "2026-01-31", balance: {} },
  { date: "2026-04-30", balance: { USD: "5292.4" } },
  { date: "2026-12-31", balance: {} },
];

async function setup(
  language: SupportedLanguage,
  renderCommas = true,
  dataThrough = "2027-01-15",
) {
  ledger.renderCommas = renderCommas;
  const localization = createLocalization();
  await localization.changeLanguage(language);
  render(
    <LocalizationProvider localization={localization}>
      <IncomeExpensesChart
        income={income}
        expenses={expenses}
        primaryCurrency="USD"
        dataThrough={dataThrough}
      />
    </LocalizationProvider>,
  );
  if (!captured) throw new Error("Income/expense chart was not rendered");
  return captured;
}

beforeEach(() => {
  captured = undefined;
  ledger.renderCommas = true;
});

describe("IncomeExpensesChart tooltip numbers", () => {
  it.each([
    {
      language: "en" as const,
      renderCommas: true,
      expected: ["15,500", "4,792.4", "5,292.4", "0", "-1,234.5"],
      tooltips: ["15,500.00", "4,792.40", "5,292.40", "0.00"],
    },
    {
      language: "de" as const,
      renderCommas: true,
      expected: ["15.500", "4.792,4", "5.292,4", "0", "-1.234,5"],
      tooltips: ["15.500,00", "4.792,40", "5.292,40", "0,00"],
    },
    {
      language: "de" as const,
      renderCommas: false,
      expected: ["15500", "4792.4", "5292.4", "0", "-1234.5"],
      // A currency amount follows the shared formatter, as in Period data.
      tooltips: ["15500,00", "4792,40", "5292,40", "0,00"],
    },
  ])(
    "uses the actual $language number policy with renderCommas=$renderCommas for tooltip and axis",
    async ({ language, renderCommas, expected, tooltips }) => {
      const option = await setup(language, renderCommas);
      // Include a synthetic negative scalar to retain signs without altering
      // the report's income-sign transformation or sparse zero handling.
      const values = [15500, 4792.4, 5292.4, 0, -1234.5];
      expect(values.map(option.yAxis.axisLabel.formatter)).toEqual(expected);
      // Each bar's tooltip formats its own interval's decimal (w4/m53) in
      // the chart's unit, so USD keeps its cents — including the absent
      // December income plotted at -0, which reads as zero.
      expect(option.series[0].data[2]).toBe(-0);
      const [january, april, aprilExpenses, zero] = tooltips;
      expect(
        option.series.map((series) =>
          series.data.map((value, index) =>
            series.tooltip.valueFormatter(value, index),
          ),
        ),
      ).toEqual([
        [january, april, zero],
        [zero, aprilExpenses, zero],
      ]);
    },
  );

  it("preserves the default date tooltip, translated series, sparse zero and single-unit scope", async () => {
    const option = await setup("de");
    expect(option.tooltip.trigger).toBe("axis");
    expect(option.tooltip.axisPointer.type).toBe("shadow");
    expect(option.tooltip.formatter).toBeUndefined();
    expect(option.xAxis.data).toEqual([
      "2026-01-31",
      "2026-04-30",
      "2026-12-31",
    ]);
    expect(option.legend.data).toEqual(["Erträge", "Aufwendungen"]);
    expect(option.series).toMatchObject([
      { name: "Erträge", type: "bar", data: [15500, 4792.4, -0] },
      { name: "Aufwendungen", type: "bar", data: [0, 5292.4, 0] },
    ]);
    expect(screen.getByText(/USD.*EUR/)).toBeInTheDocument();
    expect(income[0].balance).toEqual({ USD: "-15500", EUR: "-100" });
    expect(expenses[0].balance).toEqual({});
  });
});

describe("IncomeExpensesChart periods", () => {
  it("names each month in the reader's language on the axis and in the tooltip", async () => {
    const option = await setup("de");
    const axis = option.xAxis as unknown as {
      axisLabel: { formatter: (value: string) => string };
    };
    // The year where the axis starts or turns, the month alone between.
    expect(axis.axisLabel.formatter("2026-01-31")).toBe("Jan. 2026");
    expect(axis.axisLabel.formatter("2026-04-30")).toBe("Apr");
    expect(
      (
        option as unknown as AxisPointerLabel
      ).tooltip.axisPointer.label.formatter({ value: "2026-04-30" }),
    ).toBe("Apr. 2026");
  });

  it("draws the running month lighter and says it is still in progress", async () => {
    const option = await setup("en", true, "2026-12-10");
    const december = option.series.map((series) => series.data[2]);
    // Earlier months stay plain values; the data stops part-way through
    // December, so it is drawn lighter.
    expect(option.series[0].data[1]).toBe(4792.4);
    december.forEach((bar) =>
      expect(bar).toMatchObject({ value: expect.any(Number) }),
    );
    expect(
      (
        option as unknown as AxisPointerLabel
      ).tooltip.axisPointer.label.formatter({ value: "2026-12-31" }),
    ).toBe("Dec 2026 · In progress");
    expect(
      (
        option as unknown as AxisPointerLabel
      ).tooltip.axisPointer.label.formatter({ value: "2026-04-30" }),
    ).toBe("Apr 2026");
  });
});

describe("IncomeExpensesChart selected period", () => {
  it("bands the selected month's column and keeps every bar's color", async () => {
    const localization = createLocalization();
    await localization.changeLanguage("en");
    render(
      <LocalizationProvider localization={localization}>
        <IncomeExpensesChart
          income={income}
          expenses={expenses}
          primaryCurrency="USD"
          dataThrough="2027-01-15"
          selectedDate="2026-04-30"
        />
      </LocalizationProvider>,
    );
    const option = captured as unknown as {
      xAxis: {
        axisLabel: { formatter: (date: string) => string };
        splitArea: { areaStyle: { color: string[] } };
      };
      series: Array<{ data: unknown[] }>;
    };
    const colors = option.xAxis.splitArea.areaStyle.color;
    expect(colors).toHaveLength(3);
    expect(colors.filter((color) => color !== "rgba(0,0,0,0)")).toHaveLength(1);
    expect(colors[1]).not.toBe("rgba(0,0,0,0)");
    expect(option.xAxis.axisLabel.formatter("2026-04-30")).toMatch(
      /^\{selected\|/,
    );
    // No bar steps back for the selection.
    expect(option.series[0].data).toEqual([15500, 4792.4, -0]);
  });
});
