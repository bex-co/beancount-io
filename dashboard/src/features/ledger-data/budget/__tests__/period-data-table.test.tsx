/**
 * The budget chart's periods are drawn on a canvas, so the only way to read a
 * past actual was to hover it. These cases assert the values a reader can
 * actually reach after opening the disclosure from the keyboard.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as apolloClient from "@apollo/client/react";
import { BudgetChartCard } from "../budget-chart-card";
import { groupBudgetEntries } from "../budget-utils";
import type { BudgetEntry } from "../types";

vi.mock("@apollo/client/react", () => ({ useQuery: vi.fn() }));
// Capture what the chart is actually told to plot, so the table can be checked
// against the canvas rather than against a number typed into this file.
const chartOptions: Array<{
  series?: Array<{ name: string; data: number[] }>;
}> = [];
vi.mock("@/common/components/react-echarts", () => ({
  ReactECharts: ({ option }: { option: { series?: unknown } }) => {
    chartOptions.push(
      option as { series?: Array<{ name: string; data: number[] }> },
    );
    return <div data-testid="chart" />;
  },
  default: () => <div data-testid="chart" />,
}));
vi.mock("@/common/hooks/use-format-number", () => ({
  // The shipped formatter rounds; a raw String() would assert float noise the
  // reader never sees.
  useFormatNumber: () => (value: number) =>
    new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value),
}));
vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({ canWrite: false }),
}));
vi.mock("@/common/components/ledger-permission/write", () => ({
  LedgerWritePermission: () => null,
}));

function budgetEntry(
  account: string,
  currency: string,
  date: string,
  amount: string,
  interval = "monthly",
): BudgetEntry {
  return {
    date,
    entry_hash: `${account}-${currency}-${date}`,
    directive_type: "custom",
    type: "budget",
    values: [account, interval, { number: amount, currency }],
  };
}

/** The live Dining card: 200 USD a month, one month with real spending. */
const DINING = [budgetEntry("Expenses:Dining", "USD", "2026-01-01", "200")];

const INTERVALS = [
  { date: "2026-01-31", balance: { USD: "160.5" }, accountBalances: {} },
  { date: "2026-02-28", balance: {}, accountBalances: {} },
  { date: "2026-03-31", balance: {}, accountBalances: {} },
];

function mockRead(override: Record<string, unknown>) {
  vi.mocked(apolloClient.useQuery).mockReturnValue({
    data: undefined,
    loading: false,
    error: undefined,
    ...override,
  } as never);
}

function renderDining() {
  const [group] = groupBudgetEntries(DINING, "2026-03-31");
  return render(
    <BudgetChartCard
      group={group}
      ledgerId="l1"
      conversion="AT_COST"
      primaryCurrency="USD"
      onDelete={vi.fn()}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  chartOptions.length = 0;
  mockRead({ data: { getLedgerIntervalTotals: INTERVALS } });
});

function plotted() {
  const option = chartOptions.at(-1);
  const series = option?.series ?? [];
  return { budget: series[0]?.data ?? [], actual: series[1]?.data ?? [] };
}

const money = (value: number) =>
  `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)} USD`;
afterEach(cleanup);

function periodTable() {
  return screen.getByRole("table", { name: "Expenses:Dining USD Period data" });
}

describe("budget period data", () => {
  it("lists each plotted period with its target and actual", async () => {
    const user = userEvent.setup();
    renderDining();

    const summary = screen.getByText("Period data");
    summary.focus();
    await user.keyboard("{Enter}");

    const rows = within(periodTable())
      .getAllByRole("row")
      .slice(1)
      .map((row) =>
        within(row)
          .getAllByRole("cell")
          .map((cell) => cell.textContent?.trim()),
      );

    // The reader sees the values the chart plots, period for period.
    const { budget, actual } = plotted();
    expect(rows).toEqual(
      INTERVALS.map((point, index) => [
        point.date,
        money(budget[index]),
        money(actual[index]),
      ]),
    );
    // And the one that was previously reachable only by hovering.
    expect(rows[0]).toEqual(["2026-01-31", "200 USD", "160.5 USD"]);
  });

  it("names its columns", async () => {
    const user = userEvent.setup();
    renderDining();
    await user.click(screen.getByText("Period data"));

    expect(
      within(periodTable())
        .getAllByRole("columnheader")
        .map((h) => h.textContent?.trim()),
    ).toEqual(["Period", "Budget", "Actual"]);
  });

  it("shows nothing rather than a table of zeros when the read fails", () => {
    mockRead({ error: new Error("network") });
    renderDining();
    expect(screen.queryByText("Period data")).not.toBeInTheDocument();
  });

  it("shows nothing while the read is still in flight", () => {
    mockRead({ loading: true });
    renderDining();
    expect(screen.queryByText("Period data")).not.toBeInTheDocument();
  });

  it("shows nothing when the read returns no periods", () => {
    mockRead({ data: { getLedgerIntervalTotals: [] } });
    renderDining();
    expect(screen.queryByText("Period data")).not.toBeInTheDocument();
  });

  it("keeps the dated target history as a separate table", async () => {
    const user = userEvent.setup();
    renderDining();
    await user.click(screen.getByText("Period data"));

    // Both tables share the card's accessible name, so count them.
    // The dated target history keeps its own name, so the two are told apart.
    expect(
      screen.getByRole("table", { name: "Expenses:Dining USD" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("table", { name: "Expenses:Dining USD Period data" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2026-01-01")).toBeInTheDocument();
  });

  it("follows the target's direction for an income budget", async () => {
    const user = userEvent.setup();
    const income = [budgetEntry("Income:Salary", "USD", "2026-01-01", "5000")];
    const [group] = groupBudgetEntries(income, "2026-01-31");
    mockRead({
      data: {
        getLedgerIntervalTotals: [
          {
            date: "2026-01-31",
            balance: { USD: "-4000" },
            accountBalances: {},
          },
        ],
      },
    });
    render(
      <BudgetChartCard
        group={group}
        ledgerId="l1"
        conversion="AT_COST"
        primaryCurrency="USD"
        onDelete={vi.fn()}
      />,
    );
    await user.click(screen.getByText("Period data"));

    const row = within(
      screen.getByRole("table", { name: "Income:Salary USD Period data" }),
    ).getAllByRole("row")[1];
    // Whatever sign convention the chart uses for an income target, the table
    // repeats it rather than inventing its own.
    const { budget, actual } = plotted();
    expect(
      within(row)
        .getAllByRole("cell")
        .map((c) => c.textContent?.trim()),
    ).toEqual(["2026-01-31", money(budget[0]), money(actual[0])]);
    expect(budget[0]).toBeGreaterThan(0);
  });
});
