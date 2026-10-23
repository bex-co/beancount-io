import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import * as apolloClient from "@apollo/client/react";
import { BudgetChartCard } from "../budget-chart-card";
import { budgetHeadlinePeriod, groupBudgetEntries } from "../budget-utils";
import type { BudgetEntry } from "../types";

vi.mock("@apollo/client/react", () => ({ useQuery: vi.fn() }));
vi.mock("@/common/components/react-echarts", () => ({
  ReactECharts: () => <div data-testid="chart" />,
  default: () => <div data-testid="chart" />,
}));
vi.mock("@/common/hooks/use-format-number", () => ({
  useFormatNumber: () => (value: number) =>
    new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(value),
}));
vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({ canWrite: false }),
}));
vi.mock("@/common/components/ledger-permission/write", () => ({
  LedgerWritePermission: () => null,
}));

const TODAY = "2026-10-15";

/** Month-end dates from `first` through `last` (YYYY-MM). */
function monthEnds(first: string, last: string): string[] {
  const ends: string[] = [];
  let [year, month] = first.split("-").map(Number);
  for (;;) {
    const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
    ends.push(end);
    if (`${year}-${String(month).padStart(2, "0")}` === last) return ends;
    month += 1;
    if (month > 12) [year, month] = [year + 1, 1];
  }
}

describe("budgetHeadlinePeriod", () => {
  it("headlines the current month of a calendar year, not December", () => {
    const year = monthEnds("2026-01", "2026-12");
    expect(budgetHeadlinePeriod(year, "monthly", TODAY, false)).toEqual({
      end: "2026-10-31",
      bucket: 9,
    });
  });

  it("headlines the whole current month when a rolling window clips it", () => {
    const rolling = [...monthEnds("2025-10", "2026-09"), TODAY];
    expect(budgetHeadlinePeriod(rolling, "monthly", TODAY, false)).toEqual({
      end: "2026-10-31",
      bucket: 12,
    });
  });

  it("still headlines the current month when no bucket reaches it", () => {
    const allTime = monthEnds("2026-01", "2026-08");
    expect(budgetHeadlinePeriod(allTime, "monthly", TODAY, false)).toEqual({
      end: "2026-10-31",
      bucket: null,
    });
  });

  it("headlines a past span's final period", () => {
    const lastYear = monthEnds("2025-01", "2025-12");
    expect(budgetHeadlinePeriod(lastYear, "monthly", TODAY, true)).toEqual({
      end: "2025-12-31",
      bucket: 11,
    });
    expect(budgetHeadlinePeriod([], "monthly", TODAY, true)).toBeNull();
  });

  it("follows the budget's interval", () => {
    expect(
      budgetHeadlinePeriod(["2026-12-31"], "quarterly", TODAY, false),
    ).toEqual({ end: "2026-12-31", bucket: 0 });
    expect(budgetHeadlinePeriod([], "weekly", TODAY, false)).toEqual({
      end: "2026-10-18",
      bucket: null,
    });
  });
});

/** The QA ledger's card: `Monthly 122 USD`, dated 2026-08-27. */
const GROCERIES: BudgetEntry[] = [
  {
    date: "2026-08-27",
    entry_hash: "groceries",
    directive_type: "custom",
    type: "budget",
    values: [
      "Expenses:Groceries",
      "monthly",
      { number: "122", currency: "USD" },
    ],
  },
];

function renderCard(time: string | undefined, bucketEnds: string[]) {
  vi.mocked(apolloClient.useQuery).mockReturnValue({
    data: {
      getLedgerIntervalTotals: bucketEnds.map((date) => ({
        date,
        // 30 USD spent so far in October; nothing in any other month.
        balance: date.startsWith("2026-10") ? { USD: "30" } : {},
        accountBalances: {},
      })),
    },
    loading: false,
    error: undefined,
  } as never);
  const [group] = groupBudgetEntries(GROCERIES, TODAY);
  return render(
    <BudgetChartCard
      time={time}
      group={group}
      ledgerId="l1"
      conversion="AT_COST"
      primaryCurrency="USD"
      onDelete={vi.fn()}
    />,
  );
}

const valueAfter = (label: string) =>
  screen.getByText(label, { selector: "p" }).nextElementSibling?.textContent;

describe("Budget card headline on 2026-10-15", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 15, 12));
  });
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it.each([
    ["This year", "year", monthEnds("2026-01", "2026-12")],
    [
      "Last 12 months",
      "2025-10-16 - 2026-10-15",
      [...monthEnds("2025-10", "2026-09"), TODAY],
    ],
    ["All time", undefined, monthEnds("2026-08", "2026-10")],
  ])("%s describes October with its full monthly target", (_, time, ends) => {
    renderCard(time, ends);
    expect(valueAfter("Current budget")).toBe("122 USD");
    expect(valueAfter("Latest actual")).toBe("30 USD");
  });

  it("Last year describes its final period", () => {
    renderCard("year-1", monthEnds("2025-01", "2025-12"));
    expect(valueAfter("Budget")).toBe("0 USD");
    expect(valueAfter("Latest actual")).toBe("0 USD");
  });
});

/**
 * Update Budget on the day of the original target: the journal returns both
 * same-date directives newest first, and the later one must win (w4/232).
 */
describe("Budget card with two targets on the same date", () => {
  const sameDay = (number: string, hash: string): BudgetEntry => ({
    date: "2026-10-20",
    entry_hash: hash,
    directive_type: "custom",
    type: "budget",
    values: ["Expenses:Qa-Budget", "monthly", { number, currency: "USD" }],
  });
  // Newest first, as getLedgerJournal returns them.
  const journal = [sameDay("234.56", "newer"), sameDay("123.45", "older")];

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 20, 12));
  });
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("headlines the newer target prorated over October 20–31", () => {
    vi.mocked(apolloClient.useQuery).mockReturnValue({
      data: {
        getLedgerIntervalTotals: monthEnds("2026-10", "2026-10").map(
          (date) => ({ date, balance: {}, accountBalances: {} }),
        ),
      },
      loading: false,
      error: undefined,
    } as never);
    const [group] = groupBudgetEntries(journal, "2026-10-20");
    expect(group.amount).toBe("234.56 USD");
    expect(group.entry_hash).toBe("newer");
    render(
      <BudgetChartCard
        time={undefined}
        group={group}
        ledgerId="l1"
        conversion="AT_COST"
        primaryCurrency="USD"
        onDelete={vi.fn()}
      />,
    );
    // 234.56 × 12 / 31 = 90.797…, prorated exactly and rounded to USD cents
    // (w4/m55); not the older 123.45 × 12 / 31 = 47.79.
    expect(valueAfter("Current budget")).toBe("90.8 USD");
  });
});

/**
 * A 31 × 2^40 USD target keeps a visible ±1 USD difference (w4/978); exact
 * proration needs no round-off allowance at that scale (w4/m55).
 */
describe("Budget card variance at large amounts", () => {
  const LARGE: BudgetEntry[] = [
    {
      date: "2026-01-01",
      entry_hash: "large",
      directive_type: "custom",
      type: "budget",
      values: [
        "Expenses:Dining",
        "monthly",
        { number: "34084860461056.00", currency: "USD" },
      ],
    },
  ];

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 31, 12));
  });
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it.each([
    ["34084860461057.00", "Above target", "+1 USD"],
    ["34084860461055.00", "Below target", "-1 USD"],
    ["34084860461056.00", "On target", "0 USD"],
  ])("shows actual %s as %s, %s", (actual, badge, difference) => {
    vi.mocked(apolloClient.useQuery).mockReturnValue({
      data: {
        getLedgerIntervalTotals: monthEnds("2026-01", "2026-10").map(
          (date) => ({
            date,
            balance: date === "2026-10-31" ? { USD: actual } : {},
            accountBalances: {},
          }),
        ),
      },
      loading: false,
      error: undefined,
    } as never);
    const [group] = groupBudgetEntries(LARGE, "2026-10-31");
    render(
      <BudgetChartCard
        time={undefined}
        group={group}
        ledgerId="l1"
        conversion="AT_COST"
        primaryCurrency="USD"
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText(badge)).toBeInTheDocument();
    expect(
      screen.getByText("Variance", { selector: "p" }).parentElement
        ?.nextElementSibling?.textContent,
    ).toBe(difference);
  });
});
