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
    valueFormatter?: (value: number) => string;
    formatter?: unknown;
  };
  xAxis: { data: string[] };
  yAxis: { axisLabel: { formatter: (value: number) => string } };
  legend: { data: string[] };
  series: Array<{ name: string; type: string; data: number[] }>;
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

async function setup(language: SupportedLanguage, renderCommas = true) {
  ledger.renderCommas = renderCommas;
  const localization = createLocalization();
  await localization.changeLanguage(language);
  render(
    <LocalizationProvider localization={localization}>
      <IncomeExpensesChart
        income={income}
        expenses={expenses}
        primaryCurrency="USD"
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
    },
    {
      language: "de" as const,
      renderCommas: true,
      expected: ["15.500", "4.792,4", "5.292,4", "0", "-1.234,5"],
    },
    {
      language: "de" as const,
      renderCommas: false,
      expected: ["15500", "4792.4", "5292.4", "0", "-1234.5"],
    },
  ])(
    "uses the actual $language number policy with renderCommas=$renderCommas for tooltip and axis",
    async ({ language, renderCommas, expected }) => {
      const option = await setup(language, renderCommas);
      // Include a synthetic negative scalar to retain signs without altering
      // the report's income-sign transformation or sparse zero handling.
      const values = [15500, 4792.4, 5292.4, 0, -1234.5];
      expect(
        values.map((value) => option.tooltip.valueFormatter?.(value)),
      ).toEqual(expected);
      expect(values.map(option.yAxis.axisLabel.formatter)).toEqual(expected);
      // Negating the real chart's absent income creates -0. Keep that raw
      // series value, while its tooltip retains the existing visible "0".
      const sparseIncome = option.series[0].data[2];
      expect(sparseIncome).toBe(-0);
      expect(option.tooltip.valueFormatter?.(sparseIncome)).toBe("0");
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
