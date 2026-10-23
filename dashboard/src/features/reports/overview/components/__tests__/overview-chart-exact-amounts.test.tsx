import { type ReactNode } from "react";
import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SerializableTreeNode } from "@/graphql/definitions";
import { node, renderInLedger, rows, table } from "./overview-chart-test-utils";
import { IncomeExpensesChart } from "../income-expenses-chart";
import { DistributionChart } from "../distribution-chart";
import CashFlowSankey from "../cash-flow-sankey";

/**
 * Overview chart text reads the ledger's decimals (w4/m53): 4.00995 BTC is not
 * 4.01, -0.00001 BTC is not -0, and 9007199254740993 BTC is not …992 — in the
 * distribution Breakdown and hovers, Income vs Expenses Period data and
 * hovers, and Cash Flow Flows and hovers, including the computed Other, Net
 * and Savings. The real unit model, grouping, formatter and translations run;
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

type Datum = { name: string; value: number; exact: string; account?: string };
type ItemOption = {
  tooltip: { formatter: (params: unknown) => string };
  series: [{ type: string; data: Datum[] }];
};
/** What ECharts hands an item tooltip: the datum itself under `data`. */
const hover = (option: ItemOption, datum: Datum) =>
  option.tooltip.formatter({
    name: datum.name,
    value: datum.value,
    data: datum,
  });

describe("distribution amounts", () => {
  // The two reproduced fixtures: a negative small account sends the chart to
  // the bar fallback; positive balances draw the pie.
  const digits = node("Assets", {}, [
    node("Assets:QaMain", { BTC: "4.00995" }),
    node("Assets:QaSmall", { BTC: "-0.00001" }),
  ]);
  const large = node("Assets", {}, [
    node("Assets:QaLarge", { BTC: "9007199254740993" }),
    node("Assets:QaSmall", { BTC: "1" }),
  ]);
  const chart = (data: SerializableTreeNode, language?: string) =>
    mount(
      <DistributionChart
        title="Assets Distribution"
        data={data}
        primaryCurrency="BTC"
      />,
      language,
    ) as Promise<ItemOption>;

  it("keeps a fraction and a nonzero signed Other in the bar and its Breakdown", async () => {
    const option = await chart(digits);
    const [series] = option.series;
    expect(series.type).toBe("bar");
    // Geometry stays numeric; the decimal rides beside it.
    expect(series.data.map(({ value, exact }) => [value, exact])).toEqual([
      [4.00995, "4.00995"],
      [-0.00001, "-0.00001"],
    ]);
    expect(hover(option, series.data[0])).toBe("Assets:QaMain: 4.00995");
    expect(hover(option, series.data[1])).toBe("Other: -0.00001");

    const breakdown = rows(await table("Assets Distribution", "Breakdown"));
    expect(breakdown.map((row) => row.slice(0, 2))).toEqual([
      ["Assets:QaMain", "4.00995 BTC"],
      ["Other", "-0.00001 BTC"],
    ]);
  });

  it("keeps an integer beyond 2^53 in the pie and its Breakdown, beside an ordinary Other", async () => {
    const option = await chart(large);
    const [series] = option.series;
    expect(series.type).toBe("pie");
    expect(series.data.map((datum) => datum.exact)).toEqual([
      "9007199254740993",
      "1",
    ]);
    expect(hover(option, series.data[0])).toMatch(
      /^Assets:QaLarge: 9,007,199,254,740,993 \(/,
    );
    expect(hover(option, series.data[1])).toMatch(/^Other: 1 \(/);

    const breakdown = rows(await table("Assets Distribution", "Breakdown"));
    expect(breakdown.map((row) => row.slice(0, 2))).toEqual([
      ["Assets:QaLarge", "9,007,199,254,740,993 BTC"],
      ["Other", "1 BTC"],
    ]);
  });

  it("sums Other as decimals, so balances that cancel leave no residue row", async () => {
    // As doubles 0.1 + 0.2 - 0.3 is 5.55e-17, which drew an Other of "0".
    const option = await chart(
      node("Assets", {}, [
        node("Assets:QaMain", { BTC: "100" }),
        node("Assets:TinyA", { BTC: "0.1" }),
        node("Assets:TinyB", { BTC: "0.2" }),
        node("Assets:TinyC", { BTC: "-0.3" }),
      ]),
    );
    expect(option.series[0].type).toBe("pie");
    expect(option.series[0].data.map((datum) => datum.account)).toEqual([
      "Assets:QaMain",
    ]);
  });

  it("keeps ISO minor units and the reader's separators", async () => {
    await chart(
      node("Assets", {}, [
        node("Assets:Bank", { USD: "1234.5" }),
        node("Assets:Wallet", { USD: "-0.001" }),
      ]),
    );
    expect(rows(await table("Assets Distribution", "Breakdown"))).toEqual([
      ["Assets:Bank", "1,234.50 USD", "100%"],
      // Rounds to the cent like every USD amount, without becoming -0.00.
      ["Other", "0.00 USD", "0%"],
    ]);
    cleanup();

    await chart(digits, "de");
    expect(
      rows(await table("Assets Distribution", "Aufschlüsselung")).map(
        (row) => row[1],
      ),
    ).toEqual(["4,00995 BTC", "-0,00001 BTC"]);
  });
});

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
      ["Cash Flow", "Savings", "4.00994 BTC"],
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
      ["Cash Flow", "Savings", "9,007,199,254,740,992 BTC"],
    ]);
  });
});
