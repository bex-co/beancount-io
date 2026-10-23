/**
 * A Budget card compares the ledger's decimals (w4/m55). A daily target of
 * 9007199254740993 USD against an actual of 9007199254740992 USD is 1.00 USD
 * under, not "On target": as doubles both are …992 before any comparison.
 * The real formatter, grouping, proration and variance run; only the read
 * and the canvas are replaced.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import * as apolloClient from "@apollo/client/react";
import { BudgetChartCard } from "../budget-chart-card";
import { groupBudgetEntries } from "../budget-utils";
import type { BudgetEntry } from "../types";
import {
  lastTooltip,
  periodRows,
  valueAfter,
  variance,
} from "./budget-card-readouts";

const chartOptions = vi.hoisted(
  () =>
    [] as Array<{
      series?: Array<{ name: string; data: number[] }>;
      tooltip?: { formatter?: (params: unknown) => string };
    }>,
);

vi.mock("@apollo/client/react", () => ({ useQuery: vi.fn() }));
vi.mock("@/common/components/react-echarts", () => ({
  ReactECharts: ({ option }: { option: (typeof chartOptions)[number] }) => {
    chartOptions.push(option);
    return <div data-testid="chart" />;
  },
}));
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerData: { options: { renderCommas: true } } }),
}));
vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({ canWrite: false }),
}));
vi.mock("@/common/components/ledger-permission/write", () => ({
  LedgerWritePermission: () => null,
}));

const ACCOUNT = "Expenses:QaDaily";

/** The reproduced ledger: one daily target and its December 31 actual. */
function renderLastYear(target: string, actual: string) {
  const entries: BudgetEntry[] = [
    {
      date: "2025-12-31",
      entry_hash: "target",
      directive_type: "custom",
      type: "budget",
      values: [ACCOUNT, "daily", { number: target, currency: "USD" }],
    },
  ];
  vi.mocked(apolloClient.useQuery).mockReturnValue({
    data: {
      getLedgerIntervalTotals: [
        { date: "2025-12-30", balance: {}, accountBalances: {} },
        { date: "2025-12-31", balance: { USD: actual }, accountBalances: {} },
      ],
    },
    loading: false,
    error: undefined,
  } as never);
  const [group] = groupBudgetEntries(entries, "2026-10-23");
  render(
    <BudgetChartCard
      group={group}
      ledgerId="l1"
      conversion="AT_COST"
      primaryCurrency="USD"
      time="year-1"
      onDelete={vi.fn()}
    />,
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 23, 12));
  chartOptions.length = 0;
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe("Budget card exact amounts", () => {
  it("shows a target one unit above the actual as 1.00 USD under", async () => {
    renderLastYear("9007199254740993", "9007199254740992");

    expect(valueAfter("Budget")).toBe("9,007,199,254,740,993.00 USD");
    expect(valueAfter("Latest actual")).toBe("9,007,199,254,740,992.00 USD");
    expect(variance()).toBe("-1.00 USD");
    expect(screen.getByText("Below target")).toBeInTheDocument();
    expect((await periodRows()).at(-1)).toEqual([
      "2025-12-31",
      "9,007,199,254,740,993.00 USD",
      "9,007,199,254,740,992.00 USD",
    ]);
    expect(lastTooltip(chartOptions.at(-1)!, "2025-12-31")).toBe(
      "2025-12-31 Budget: 9,007,199,254,740,993.00 USD Actual: 9,007,199,254,740,992.00 USD",
    );
    // The dated history keeps the amount as written.
    const history = screen.getByRole("table", { name: `${ACCOUNT} USD` });
    expect(
      within(history).getByText("9007199254740993 USD"),
    ).toBeInTheDocument();
  });

  it("shows an actual one unit above the target as 1.00 USD over", async () => {
    renderLastYear("9007199254740992", "9007199254740993");

    expect(valueAfter("Budget")).toBe("9,007,199,254,740,992.00 USD");
    expect(valueAfter("Latest actual")).toBe("9,007,199,254,740,993.00 USD");
    expect(variance()).toBe("+1.00 USD");
    expect(screen.getByText("Above target")).toBeInTheDocument();
    expect((await periodRows()).at(-1)[2]).toBe("9,007,199,254,740,993.00 USD");
  });

  it("keeps the ordinary 100/99 control under by 1.00 USD", async () => {
    renderLastYear("100.00", "99.00");

    expect(valueAfter("Budget")).toBe("100.00 USD");
    expect(valueAfter("Latest actual")).toBe("99.00 USD");
    expect(variance()).toBe("-1.00 USD");
    expect(screen.getByText("Below target")).toBeInTheDocument();
    expect((await periodRows()).at(-1)).toEqual([
      "2025-12-31",
      "100.00 USD",
      "99.00 USD",
    ]);
  });

  it("reads an exactly met target as on target", () => {
    renderLastYear("9007199254740993", "9007199254740993");

    expect(variance()).toBe("0.00 USD");
    expect(screen.getByText("On target")).toBeInTheDocument();
  });
});
