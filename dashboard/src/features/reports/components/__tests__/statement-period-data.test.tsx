import { useState, type ComponentProps } from "react";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  DateAndBalance,
  SerializableTreeNode,
} from "@/graphql/definitions";
import {
  LedgerProviderContext,
  type LedgerProviderContextType,
} from "@/common/providers/ledger-provider/context";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { BalanceSheetContent } from "../../balance-sheet/balance-sheet-content";
import { IncomeStatementContent } from "../../income-statement/income-statement-content";

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");

// Canvas is the browser boundary. Capture the actual options produced by the
// real chart components; the disclosures, tables, tabs and localization are real.
vi.mock("@/common/components/react-echarts", () => ({
  ReactECharts: ({ option }: { option: unknown }) => (
    <div data-testid="chart" data-option={JSON.stringify(option)} />
  ),
}));
// Start's isomorphic compiler is absent in Vitest. Keep this test's charts
// expanded without replacing the chart visibility component itself.
vi.mock("@/common/hooks/use-cookie-storage-state", async () => {
  const { useState } = await import("react");
  return {
    useCookieStorageState: (_key: string, value: boolean) => useState(value),
  };
});

afterEach(cleanup);

type Page = "balance" | "income";
type Point = Pick<DateAndBalance, "date" | "balance"> & {
  accountBalances?: Record<string, Record<string, string>>;
};
type ChartOption = {
  xAxis: { data: string[] };
  series: Array<{ name: string; data: Array<number | [string, number]> }>;
};

function tree(account: string): SerializableTreeNode {
  return {
    __typename: "SerializableTreeNode",
    account,
    balance: {},
    balanceChildren: {},
    children: [],
    hasTxns: true,
    cost: null,
    costChildren: null,
  };
}

function points(sign: number): Point[] {
  return [
    {
      date: "2026-01-31",
      balance: { USD: String(sign * 12.125), ACME: "0.000003" },
    },
    { date: "2026-02-28", balance: { USD: String(sign * 20) } },
    { date: "2026-03-31", balance: {} },
  ];
}

function accountPoints(root: string, sign: number): Point[] {
  return points(sign).map((point, index) => ({
    ...point,
    // Deliberately distinct from aggregate balances: stacked charts plot these
    // account segments, including absent-period zeros, rather than balance.
    accountBalances:
      index === 1
        ? {}
        : {
            [`${root}:First`]: { USD: String(sign * 7.25), ACME: "0.000001" },
            [`${root}:Second`]: { USD: String(sign * 4.5), ACME: "0.000002" },
          },
  }));
}

const common = {
  primaryCurrency: "USD",
  reportingEntityName: "Synthetic books",
  reportingEntitySource: "ledger_title" as const,
  ledgerDisplayName: "Synthetic books",
  ledgerOwner: "example",
  ledgerNameParam: "books",
  invertIncomeLiabilitiesEquity: true,
  showZeroBalance: true,
  showZeroTransactions: true,
  showClosedAccounts: true,
  closedAccountNames: new Set<string>(),
  collapsePatterns: [],
  fiscalYearEnd: { month: 12, day: 31 },
};

function Statement({
  page,
  tab,
  stacked = false,
  inverted = true,
  empty = false,
}: {
  page: Page;
  tab: string;
  stacked?: boolean;
  inverted?: boolean;
  empty?: boolean;
}) {
  const [selectedTab, setSelectedTab] = useState(tab);
  const [replacement, replace] = useState(false);
  const [chartMode, setChartMode] = useState<"single" | "stacked">(
    stacked ? "stacked" : "single",
  );
  const current = (value: Point[]) =>
    empty
      ? []
      : replacement
        ? [{ date: "2025-12-31", balance: { EUR: "-345.875" } }]
        : value;
  const props = {
    ...common,
    selectedTab,
    onSelectedTabChange: setSelectedTab,
    unitSelections: {},
    onUnitSelectionChange: () => {},
    conversion: replacement ? ("at_value" as const) : ("units" as const),
    timeInterval: replacement ? ("yearly" as const) : ("monthly" as const),
    onTimeIntervalChange: vi.fn(),
    onConversionChange: vi.fn(),
    invertIncomeLiabilitiesEquity: inverted,
    filters: {
      time: replacement ? "2025" : "2026-Q1",
      account: "",
      filter: "",
    },
  };
  return (
    <>
      <button onClick={() => replace(true)}>
        Replace settled report scope
      </button>
      {page === "balance" ? (
        <BalanceSheetContent
          {...props}
          balanceSheetData={
            {
              assetsHierarchyData: tree("Assets"),
              liabilitiesHierarchyData: tree("Liabilities"),
              equityHierarchyData: tree("Equity"),
              netWorthData: current(points(1)),
              assetsData: current(points(1)),
              liabilitiesData: current(points(-1)),
              equityData: current(points(-1)),
            } as ComponentProps<typeof BalanceSheetContent>["balanceSheetData"]
          }
        />
      ) : (
        <IncomeStatementContent
          {...props}
          chartMode={chartMode}
          onChartModeChange={setChartMode}
          incomeStatementData={
            {
              incomeHierarchyData: tree("Income"),
              expensesHierarchyData: tree("Expenses"),
              netProfitData: current(points(-1)),
              incomeData: current(accountPoints("Income", -1)),
              expensesData: current(accountPoints("Expenses", 1)),
            } as ComponentProps<
              typeof IncomeStatementContent
            >["incomeStatementData"]
          }
        />
      )}
    </>
  );
}

async function mount(props: ComponentProps<typeof Statement>, language = "en") {
  const localization = createLocalization();
  await localization.changeLanguage(language);
  const ledger = {
    ...common,
    ledgerData: { options: { renderCommas: false } },
  } as unknown as LedgerProviderContextType;
  const route = createRootRoute({
    component: () => (
      <LocalizationProvider localization={localization}>
        <LedgerProviderContext.Provider value={ledger}>
          <Statement {...props} />
        </LedgerProviderContext.Provider>
      </LocalizationProvider>
    ),
  });
  const router = createRouter({
    routeTree: route,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  await act(async () => {
    await router.load();
  });
  render(<RouterProvider router={router} />);
  await screen.findByRole("tabpanel");
}

function option(): ChartOption {
  return JSON.parse(
    within(screen.getByRole("tabpanel"))
      .getByTestId("chart")
      .getAttribute("data-option")!,
  );
}

async function openTable(title: string, disclosure = "Period data") {
  const panel = screen.getByRole("tabpanel");
  const summary = within(panel).getByText(disclosure, { selector: "summary" });
  expect(summary.closest("details")).not.toHaveAttribute("open");
  await userEvent.setup().click(summary);
  expect(summary.closest("details")).toHaveAttribute("open");
  return within(panel).getByRole("table", { name: `${title} ${disclosure}` });
}

function tableMatchesChart(table: HTMLElement, chart: ChartOption) {
  const units = [...new Set(chart.series.map((series) => series.name))];
  expect(
    within(table)
      .getAllByRole("columnheader")
      .map((cell) => cell.textContent),
  ).toEqual([expect.any(String), ...units]);
  const rows = within(table).getAllByRole("row").slice(1);
  expect(rows).toHaveLength(chart.xAxis.data.length);
  rows.forEach((row, index) => {
    expect(within(row).getByRole("rowheader")).toHaveTextContent(
      chart.xAxis.data[index],
    );
    const cells = within(row).getAllByRole("cell");
    units.forEach((unit, column) => {
      const plotted = chart.series
        .filter((series) => series.name === unit)
        .map((series) => {
          const value = series.data[index];
          return Array.isArray(value) ? value[1] : value;
        });
      expect(
        Array.from(cells[column].querySelectorAll("bdi")).map(
          (amount) => amount.textContent,
        ),
      ).toEqual(plotted.map((value) => `${value} ${unit}`));
    });
  });
}

describe("statement period data", () => {
  it.each([
    ["balance", "netWorth", "Net Worth"],
    ["balance", "assets", "Assets"],
    ["balance", "liabilities", "Liabilities"],
    ["balance", "equity", "Equity"],
    ["income", "netProfit", "Net Profit"],
    ["income", "income", "Income"],
    ["income", "expenses", "Expenses"],
  ] as const)(
    "exposes the actual %s %s plotted values, units and periods",
    async (page, tab, title) => {
      await mount({ page, tab });
      const chart = option();
      // A fixed source-value control ensures canvas capture itself isn't a stub.
      const first = chart.series[0].data[0];
      expect(Array.isArray(first) ? first[1] : first).toBe(12.125);
      const table = await openTable(title);
      tableMatchesChart(table, chart);
      expect(within(table).getAllByRole("row")[2]).toHaveTextContent("0 ACME");
    },
  );

  it.each(["income", "expenses"])(
    "labels every %s account segment within its unit, using stacked series",
    async (tab) => {
      await mount({ page: "income", tab, stacked: true });
      const table = await openTable(tab === "income" ? "Income" : "Expenses");
      tableMatchesChart(table, option());
      const row = within(table).getAllByRole("row")[1];
      within(row)
        .getAllByRole("cell")
        .forEach((cell) => {
          expect(cell).toHaveTextContent(
            `${tab === "income" ? "Income" : "Expenses"}:First`,
          );
          expect(cell).toHaveTextContent(
            `${tab === "income" ? "Income" : "Expenses"}:Second`,
          );
          expect(cell).not.toHaveTextContent("12.125");
        });
    },
  );

  it.each(["balance", "income"] as const)(
    "replaces %s period rows and units with the completed interval/conversion/filter result",
    async (page) => {
      await mount({ page, tab: page === "balance" ? "netWorth" : "netProfit" });
      const title = page === "balance" ? "Net Worth" : "Net Profit";
      await openTable(title);
      await userEvent
        .setup()
        .click(
          screen.getByRole("button", { name: "Replace settled report scope" }),
        );
      const table = within(screen.getByRole("tabpanel")).getByRole("table", {
        name: `${title} Period data`,
      });
      tableMatchesChart(table, option());
      expect(table).toHaveTextContent("2025-12-31");
      expect(table).not.toHaveTextContent("2026-01-31");
      expect(table).not.toHaveTextContent("USD");
    },
  );

  it("keeps the configured raw credit signs and German disclosure/table labels", async () => {
    await mount({ page: "balance", tab: "liabilities", inverted: false }, "de");
    const table = await openTable("Verbindlichkeiten", "Daten je Zeitraum");
    tableMatchesChart(table, option());
    expect(table).toHaveTextContent("-12.125 USD");
  });

  it("keeps an empty chart free of invented period rows", async () => {
    await mount({ page: "income", tab: "netProfit", empty: true });
    expect(option().series).toEqual([]);
    expect(
      within(screen.getByRole("tabpanel")).queryByText("Period data"),
    ).not.toBeInTheDocument();
  });
});
