import { type ReactNode } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LedgerProviderContext,
  type LedgerProviderContextType,
} from "@/common/providers/ledger-provider/context";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import type { SerializableTreeNode } from "@/graphql/definitions";
import { formatNumber } from "@/common/lib/format/format-number";
import { IncomeExpensesChart } from "../income-expenses-chart";
import { DistributionChart } from "../distribution-chart";
import CashFlowSankey from "../cash-flow-sankey";

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");
// The sole rendering boundary is the canvas. All unit selection, grouping,
// account classification, role resolution and option building remain real.
vi.mock("@/common/components/react-echarts", () => ({
  ReactECharts: ({ option }: { option: unknown }) => (
    <div data-testid="chart" data-option={JSON.stringify(option)} />
  ),
}));
afterEach(cleanup);

function node(
  account: string,
  balance: Record<string, unknown> = {},
  children: SerializableTreeNode[] = [],
): SerializableTreeNode {
  return {
    __typename: "SerializableTreeNode",
    account,
    balance,
    balanceChildren: {},
    cost: null,
    costChildren: null,
    hasTxns: true,
    children,
  };
}
const income = [
  { date: "2026-01-31", balance: { USD: "-100.125", VACHR: "-999" } },
  { date: "2026-02-28", balance: { USD: "10" } },
  { date: "2026-03-31", balance: {} },
];
const expenses = [
  { date: "2026-01-31", balance: { USD: "40" } },
  { date: "2026-02-28", balance: { USD: "-5" } },
  { date: "2026-03-31", balance: {} },
];
const assets = node("Assets", {}, [
  node("Assets:Bank:USD", { EUR: 60 }),
  node("Assets:Wallet:USD", { EUR: 40 }),
  node("Assets:TinyA", { EUR: 0.1 }),
  node("Assets:TinyB", { EUR: 0.2 }),
  node("Assets:Vacation", { VACHR: 9999 }),
]);
const liabilities = node("Liabilities", {}, [
  node("Liabilities:Card", { EUR: -75 }),
  node("Liabilities:Loan", { EUR: -25 }),
]);
const sankeyProps = {
  incomeHierarchyData: node("Income", {}, [
    node("Income:Salary", { EUR: -100, VACHR: -999 }),
  ]),
  expensesHierarchyData: node("Expenses", {}, [
    node("Expenses:Food", { EUR: 40 }),
  ]),
  assetsHierarchyData: node("Assets", {}, [
    node("Assets:Bank:CD", { EUR: 10 }),
  ]),
  primaryCurrency: "EUR",
  depth: 3 as const,
  accountMeta: new Map([["Assets:Bank:CD", { "cash-flow-role": "investing" }]]),
};

async function mount(children: ReactNode, language = "en") {
  const localization = createLocalization();
  await localization.changeLanguage(language);
  const ledger = {
    ledgerData: { options: { renderCommas: false } },
  } as unknown as LedgerProviderContextType;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <LocalizationProvider localization={localization}>
      <LedgerProviderContext.Provider value={ledger}>
        {children}
      </LedgerProviderContext.Provider>
    </LocalizationProvider>
  );
  return render(children, { wrapper });
}

function option<T>(): T {
  return JSON.parse(screen.getByTestId("chart").getAttribute("data-option")!);
}
async function table(title: string, summary: string) {
  const opener = screen.getByText(summary, { selector: "summary" });
  expect(opener.closest("details")).not.toHaveAttribute("open");
  await userEvent.setup().click(opener);
  expect(opener.closest("details")).toHaveAttribute("open");
  return screen.getByRole("table", { name: `${title} ${summary}` });
}
const rows = (element: HTMLElement) =>
  within(element).getAllByRole("row").slice(1);
const texts = (row: HTMLElement) =>
  Array.from(row.children).map((cell) => cell.textContent);

type PeriodOption = {
  xAxis: { data: string[] };
  series: Array<{ data: number[] }>;
};
/** An amount as the chart's own formatter writes it (renderCommas off). */
const shown = (value: number, unit: string, language = "en") =>
  `${formatNumber(value, false, language, unit)} ${unit}`;

function assertPeriods(element: HTMLElement, unit: string) {
  const plotted = option<PeriodOption>();
  expect(rows(element).map(texts)).toEqual(
    plotted.xAxis.data.map((date, index) => [
      date,
      shown(plotted.series[0].data[index], unit),
      shown(plotted.series[1].data[index], unit),
      shown(
        plotted.series[0].data[index] - plotted.series[1].data[index],
        unit,
      ),
    ]),
  );
}
type DistributionOption = {
  series: [
    {
      type: string;
      data: Array<{ account?: string; name: string; value: number }>;
    },
  ];
};
function assertDistribution(
  element: HTMLElement,
  unit: string,
  language = "en",
) {
  const series = option<DistributionOption>().series[0];
  expect(rows(element).map((row) => texts(row).slice(0, 2))).toEqual(
    series.data.map((item) => [
      item.account ?? item.name,
      shown(item.value, unit, language),
    ]),
  );
  return series;
}
type FlowsOption = {
  series: [{ links: Array<{ source: string; target: string; value: number }> }];
};
function assertFlows(element: HTMLElement, unit: string) {
  expect(rows(element).map(texts)).toEqual(
    option<FlowsOption>().series[0].links.map((link) => [
      link.source,
      link.target,
      shown(link.value, unit),
    ]),
  );
}

describe("Overview chart data alternatives", () => {
  it("exposes income, expenses and net for the actual intervals, including refunds and sparse zeros", async () => {
    await mount(
      <IncomeExpensesChart
        income={income}
        expenses={expenses}
        primaryCurrency="USD"
      />,
    );
    const element = await table("Income vs Expenses", "Period data");
    expect(
      within(element)
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent),
    ).toEqual(["Period", "Income", "Expenses", "Net Profit"]);
    assertPeriods(element, "USD");
    expect(rows(element)[1]).toHaveTextContent("-10.00 USD");
    expect(
      screen.getByText(/Balances in VACHR are not included/),
    ).toBeInTheDocument();
    expect(element).not.toHaveTextContent("999");
  });

  it.each([
    ["Assets Distribution", assets, false],
    ["Liabilities Distribution", liabilities, true],
  ] as const)(
    "exposes %s plotted accounts, amounts and shares in the selected unit",
    async (title, data, inverse) => {
      await mount(
        <DistributionChart
          title={title}
          data={data}
          inverse={inverse}
          primaryCurrency="EUR"
        />,
      );
      const element = await table(title, "Breakdown");
      const series = assertDistribution(element, "EUR");
      expect(
        within(element)
          .getAllByRole("columnheader")
          .map((cell) => cell.textContent),
      ).toEqual(["Account", "Amount", "Share of total"]);
      const total = series.data.reduce((sum, item) => sum + item.value, 0);
      rows(element).forEach((row, index) => {
        expect(parseFloat(texts(row)[2]!)).toBeCloseTo(
          (series.data[index].value / total) * 100,
          1,
        );
      });
      if (!inverse) {
        expect(rows(element).map((row) => texts(row)[0])).toEqual([
          "Assets:Wallet:USD",
          "Assets:Bank:USD",
          "Other",
        ]);
        expect(
          screen.getByText(/Balances in VACHR are not included/),
        ).toBeInTheDocument();
      }
    },
  );

  it("exposes exact Sankey links including declared investing and computed savings, without omitted-unit totals", async () => {
    await mount(<CashFlowSankey {...sankeyProps} />);
    const element = await table("Cash Flow", "Flows");
    assertFlows(element, "EUR");
    expect(
      within(element)
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent),
    ).toEqual(["From", "To", "Amount"]);
    expect(element).toHaveTextContent("Assets:Bank");
    expect(element).toHaveTextContent("Savings");
    expect(
      screen.getByText(/Balances in VACHR are not included/),
    ).toBeInTheDocument();
    expect(element).not.toHaveTextContent("999");
  });

  it("follows signed bar fallback ordering and uses absolute-total shares even when net balance is zero", async () => {
    await mount(
      <DistributionChart
        title="Assets Distribution"
        primaryCurrency="EUR"
        data={node("Assets", {}, [
          node("Assets:Negative", { EUR: -20 }),
          node("Assets:Positive", { EUR: 20 }),
        ])}
      />,
    );
    const element = await table("Assets Distribution", "Breakdown");
    expect(assertDistribution(element, "EUR").type).toBe("bar");
    expect(
      within(element).getByRole("columnheader", {
        name: "Share of absolute total",
      }),
    ).toBeInTheDocument();
    expect(rows(element).map((row) => texts(row)[2])).toEqual(["50%", "50%"]);
  });

  it("replaces interval rows and selected unit with the settled replacement report", async () => {
    const view = await mount(
      <IncomeExpensesChart
        income={income}
        expenses={expenses}
        primaryCurrency="USD"
      />,
    );
    await table("Income vs Expenses", "Period data");
    view.rerender(
      <IncomeExpensesChart
        primaryCurrency="EUR"
        income={[{ date: "2025-12-31", balance: { EUR: -7.125 } }]}
        expenses={[{ date: "2025-12-31", balance: { EUR: 3 } }]}
      />,
    );
    const element = screen.getByRole("table", {
      name: "Income vs Expenses Period data",
    });
    assertPeriods(element, "EUR");
    expect(element).not.toHaveTextContent("2026-01-31");
    expect(element).not.toHaveTextContent("USD");
  });

  it("uses a noncurrency commodity without relabeling it as the absent operating currency", async () => {
    await mount(
      <IncomeExpensesChart
        primaryCurrency="USD"
        income={[{ date: "2026-01-31", balance: { VACHR: -0.000003 } }]}
        expenses={[{ date: "2026-01-31", balance: { VACHR: 0.000001 } }]}
      />,
    );
    const element = await table("Income vs Expenses", "Period data");
    // The commodity keeps its recorded digits rather than reading 0 (w4/m53).
    expect(rows(element).map(texts)).toEqual([
      ["2026-01-31", "0.000003 VACHR", "0.000001 VACHR", "0.000002 VACHR"],
    ]);
    expect(screen.getByRole("table")).not.toHaveTextContent("USD");
  });

  it("replaces a distribution's entire breakdown after unit/conversion/filter data changes", async () => {
    const view = await mount(
      <DistributionChart
        title="Assets Distribution"
        data={assets}
        primaryCurrency="EUR"
      />,
    );
    await table("Assets Distribution", "Breakdown");
    view.rerender(
      <DistributionChart
        title="Assets Distribution"
        data={node("Assets", { VACHR: 25 })}
        primaryCurrency="USD"
      />,
    );
    const element = screen.getByRole("table", {
      name: "Assets Distribution Breakdown",
    });
    assertDistribution(element, "VACHR");
    expect(rows(element)).toHaveLength(1);
    expect(element).not.toHaveTextContent("EUR");
  });

  it("withholds both canvas and flows while authoritative account roles are pending, then follows changed roles", async () => {
    const view = await mount(
      <CashFlowSankey {...sankeyProps} accountMetaPending />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading account roles",
    );
    expect(screen.queryByTestId("chart")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    view.rerender(<CashFlowSankey {...sankeyProps} />);
    assertFlows(await table("Cash Flow", "Flows"), "EUR");
    view.rerender(
      <CashFlowSankey
        {...sankeyProps}
        accountMeta={
          new Map([["Assets:Bank:CD", { "cash-flow-role": "cash" }]])
        }
      />,
    );
    const element = screen.getByRole("table", { name: "Cash Flow Flows" });
    assertFlows(element, "EUR");
    expect(element).not.toHaveTextContent("Assets:Bank");
  });

  it("does not manufacture an expense point for an unsupplied chart index", async () => {
    await mount(
      <IncomeExpensesChart
        income={income}
        expenses={[]}
        primaryCurrency="USD"
      />,
    );
    const element = await table("Income vs Expenses", "Period data");
    expect(rows(element).map((row) => texts(row)[2])).toEqual(["—", "—", "—"]);
    expect(rows(element).map((row) => texts(row)[3])).toEqual(["—", "—", "—"]);
  });

  it("localizes disclosure and share labels with the actual German catalog", async () => {
    await mount(
      <DistributionChart
        title="Vermögensverteilung"
        data={assets}
        primaryCurrency="EUR"
      />,
      "de",
    );
    const element = await table("Vermögensverteilung", "Aufschlüsselung");
    expect(
      within(element).getByRole("columnheader", {
        name: "Anteil am Gesamtwert",
      }),
    ).toBeInTheDocument();
    assertDistribution(element, "EUR", "de");
  });

  it.each(["income", "distribution", "flows"])(
    "keeps empty %s charts free of invented data rows",
    async (kind) => {
      const children: Record<string, ReactNode> = {
        income: <IncomeExpensesChart income={[]} expenses={[]} />,
        distribution: (
          <DistributionChart title="Assets Distribution" data={null} />
        ),
        flows: <CashFlowSankey />,
      };
      await mount(children[kind]);
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      expect(document.querySelector("details")).toBeNull();
    },
  );

  describe("amounts without binary noise (w3/627)", () => {
    it("writes a computed Net at the unit's precision", async () => {
      await mount(
        <IncomeExpensesChart
          income={[{ date: "2026-01-31", balance: { USD: "-4100" } }]}
          expenses={[{ date: "2026-01-31", balance: { USD: "2474.26" } }]}
          primaryCurrency="USD"
        />,
      );
      const element = await table("Income vs Expenses", "Period data");

      // 4100 - 2474.26 is 1625.7399999999998 as a double.
      expect(texts(rows(element)[0])).toEqual([
        "2026-01-31",
        "4100.00 USD",
        "2474.26 USD",
        "1625.74 USD",
      ]);
    });

    it("writes a grouped distribution row at the unit's precision", async () => {
      await mount(
        <DistributionChart
          title="Assets Distribution"
          data={node("Assets", {}, [
            node("Assets:Bank", { USD: 0.1 }),
            node("Assets:Cash", { USD: 0.2 }),
          ])}
          primaryCurrency="USD"
        />,
      );
      const element = await table("Assets Distribution", "Breakdown");

      for (const row of rows(element)) {
        expect(texts(row)[1]).toMatch(/^\d+\.\d{2} USD$/);
      }
    });

    it("formats amounts in the reader's language", async () => {
      await mount(
        <IncomeExpensesChart
          income={[{ date: "2026-01-31", balance: { EUR: "-4100" } }]}
          expenses={[{ date: "2026-01-31", balance: { EUR: "2474.26" } }]}
          primaryCurrency="EUR"
        />,
        "de",
      );
      const element = await table(
        "Erträge vs. Aufwendungen",
        "Daten je Zeitraum",
      );

      expect(texts(rows(element)[0]).slice(1)).toEqual([
        "4100,00 EUR",
        "2474,26 EUR",
        "1625,74 EUR",
      ]);
    });
  });
});
