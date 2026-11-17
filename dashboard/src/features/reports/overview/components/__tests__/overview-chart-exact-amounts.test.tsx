import { type ReactNode } from "react";
import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { node, renderInLedger, rows, table } from "./overview-chart-test-utils";
import { IncomeExpensesChart } from "../income-expenses-chart";
import CashFlowSankey from "../cash-flow-sankey";

/**
 * Overview chart text reads the ledger's decimals (w4/m53): 4.00995 BTC is not
 * 4.01, -0.00001 BTC is not -0, and 9007199254740993 BTC is not …992 — in
 * Income vs Expenses Period data and hovers, and Cash Flow Flows and hovers,
 * including the computed Net and Savings. The real unit model, grouping, formatter and translations run;
 * only the canvas is replaced, keeping the option it was given.
 */
let captured: Record<string, unknown> | undefined;
vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");
vi.mock("@/common/components/react-echarts", () => ({
  ReactECharts: ({ option }: { option: Record<string, unknown> }) => {
    captured = option;
    return <div data-testid="chart" />;
  },
}));
afterEach(() => {
  cleanup();
  captured = undefined;
});

async function mount(children: ReactNode, language?: string) {
  await renderInLedger(children, language);
  if (!captured) throw new Error("chart was not rendered");
  return captured;
}

type PeriodOption = {
  series: Array<{
    data: number[];
    tooltip: { valueFormatter: (value: unknown, dataIndex: number) => string };
  }>;
};

describe("Income vs Expenses amounts and net", () => {
  const chart = (income: string, expense: string) =>
    mount(
      <IncomeExpensesChart
        income={[
          { date: "2026-07-31", balance: { BTC: income } },
          { date: "2026-08-31", balance: {} },
        ]}
        expenses={[
          { date: "2026-07-31", balance: { BTC: expense } },
          { date: "2026-08-31", balance: {} },
        ]}
        primaryCurrency="BTC"
      />,
    ) as Promise<PeriodOption>;
  const hovers = (option: PeriodOption) =>
    option.series.map((series) =>
      series.data.map((value, index) =>
        series.tooltip.valueFormatter(value, index),
      ),
    );

  it("keeps fractions and subtracts the net exactly", async () => {
    const option = await chart("-4.00995", "0.00001");
    expect(option.series.map((series) => series.data)).toEqual([
      [4.00995, -0],
      [0.00001, 0],
    ]);
    expect(hovers(option)).toEqual([
      ["4.00995", "0"],
      ["0.00001", "0"],
    ]);
    expect(rows(await table("Income vs Expenses", "Period data"))).toEqual([
      ["2026-07-31", "4.00995 BTC", "0.00001 BTC", "4.00994 BTC"],
      ["2026-08-31", "0 BTC", "0 BTC", "0 BTC"],
    ]);
  });

  it("keeps an income beyond 2^53 and its exact net", async () => {
    const option = await chart("-9007199254740993", "1");
    expect(hovers(option)[0][0]).toBe("9,007,199,254,740,993");
    expect(hovers(option)[1][0]).toBe("1");
    expect(rows(await table("Income vs Expenses", "Period data"))[0]).toEqual([
      "2026-07-31",
      "9,007,199,254,740,993 BTC",
      "1 BTC",
      "9,007,199,254,740,992 BTC",
    ]);
  });
});

type FlowOption = {
  tooltip: { formatter: (params: unknown) => string };
  series: [
    {
      links: Array<{
        source: string;
        target: string;
        value: number;
        exact: string;
      }>;
    },
  ];
};

describe("Cash Flow links and savings", () => {
  const chart = (income: string, expense: string) =>
    mount(
      <CashFlowSankey
        incomeHierarchyData={node("Income", {}, [
          node("Income:QaMining", { BTC: income }),
        ])}
        expensesHierarchyData={node("Expenses", {}, [
          node("Expenses:QaFees", { BTC: expense }),
        ])}
        assetsHierarchyData={node("Assets", {}, [
          node("Assets:Bank", {}, [node("Assets:Bank:Checking", { BTC: "1" })]),
        ])}
        primaryCurrency="BTC"
      />,
    ) as Promise<FlowOption>;
  const edgeHover = (option: FlowOption, index: number) =>
    option.tooltip
      .formatter({ dataType: "edge", data: option.series[0].links[index] })
      .replace(/\s+/g, " ")
      .trim();

  it("keeps fractions in every link and computes Savings exactly", async () => {
    const option = await chart("-4.00995", "0.00001");
    expect(
      option.series[0].links.map(({ target, value, exact }) => [
        target,
        value,
        exact,
      ]),
    ).toEqual([
      ["Cash Flow", 4.00995, "4.00995"],
      ["Expenses:QaFees", 0.00001, "0.00001"],
      ["Savings", 4.00994, "4.00994"],
    ]);
    expect(edgeHover(option, 0)).toBe(
      "<strong>Income:QaMining → Cash Flow</strong><br/> 4.00995 BTC",
    );
    expect(rows(await table("Cash Flow", "Flows"))).toEqual([
      ["Income:QaMining", "Cash Flow", "4.00995 BTC"],
      ["Cash Flow", "Expenses:QaFees", "0.00001 BTC"],
      ["Cash Flow", "To cash", "4.00994 BTC"],
    ]);
  });

  it("keeps an income beyond 2^53 and Savings one below it", async () => {
    const option = await chart("-9007199254740993", "1");
    expect(edgeHover(option, 0)).toBe(
      "<strong>Income:QaMining → Cash Flow</strong><br/> 9,007,199,254,740,993 BTC",
    );
    expect(rows(await table("Cash Flow", "Flows"))).toEqual([
      ["Income:QaMining", "Cash Flow", "9,007,199,254,740,993 BTC"],
      ["Cash Flow", "Expenses:QaFees", "1 BTC"],
      ["Cash Flow", "To cash", "9,007,199,254,740,992 BTC"],
    ]);
  });
});
