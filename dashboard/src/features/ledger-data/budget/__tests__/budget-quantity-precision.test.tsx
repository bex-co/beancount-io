/**
 * Budget readouts through the real formatter. A 0.0004 BTC target with
 * 0.0005 BTC spent read "0 BTC / 0.001 BTC / +0 BTC" in the headline, the
 * Period data and the tooltip, because a commodity went through the cash
 * fallback's three digits. They keep the recorded precision now (w4/m45).
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
  default: () => <div data-testid="chart" />,
}));
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({
    ledgerData: { options: { renderCommas: true } },
  }),
}));
vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({ canWrite: false }),
}));
vi.mock("@/common/components/ledger-permission/write", () => ({
  LedgerWritePermission: () => null,
}));

const ACCOUNT = "Expenses:Qa-20261021:Precision";

function target(date: string, number: string, currency: string): BudgetEntry {
  return {
    date,
    entry_hash: `${currency}-${date}-${number}`,
    directive_type: "custom",
    type: "budget",
    values: [ACCOUNT, "monthly", { number, currency }],
  };
}

function renderCard(
  entries: BudgetEntry[],
  actual: Record<string, string>,
  primaryCurrency = "USD",
) {
  vi.mocked(apolloClient.useQuery).mockReturnValue({
    data: {
      getLedgerIntervalTotals: [
        { date: "2026-09-30", balance: actual, accountBalances: {} },
      ],
    },
    loading: false,
    error: undefined,
  } as never);
  const [group] = groupBudgetEntries(entries, "2026-09-30");
  return render(
    <BudgetChartCard
      group={group}
      ledgerId="l1"
      conversion="AT_COST"
      primaryCurrency={primaryCurrency}
      onDelete={vi.fn()}
    />,
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 8, 30, 12));
  chartOptions.length = 0;
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe("Budget card quantity precision", () => {
  it("keeps a fine BTC target, actual and variance in every readout", async () => {
    renderCard([target("2026-09-01", "0.0004", "BTC")], { BTC: "0.0005" });

    expect(valueAfter("Current budget")).toBe("0.0004 BTC");
    expect(valueAfter("Latest actual")).toBe("0.0005 BTC");
    expect(variance()).toBe("+0.0001 BTC");
    expect(screen.getByText("Above target")).toBeInTheDocument();
    expect(lastTooltip(chartOptions.at(-1)!, "2026-09-30")).toBe(
      "2026-09-30 Budget: 0.0004 BTC Actual: 0.0005 BTC",
    );
    expect((await periodRows())[0]).toEqual([
      "2026-09-30",
      "0.0004 BTC",
      "0.0005 BTC",
    ]);
    // The dated history keeps the amount as written.
    const history = screen.getByRole("table", { name: `${ACCOUNT} BTC` });
    expect(within(history).getByText("0.0004 BTC")).toBeInTheDocument();
  });

  it("rounds a prorated target to the recorded precision", () => {
    // 0.0004 for September 1–15, then 0.001: summed day by day that is
    // 0.0007 plus binary residue, which must not read as recorded digits.
    renderCard(
      [
        target("2026-09-01", "0.0004", "BTC"),
        target("2026-09-16", "0.001", "BTC"),
      ],
      { BTC: "0.0007" },
    );
    expect(valueAfter("Current budget")).toBe("0.0007 BTC");
    expect(valueAfter("Latest actual")).toBe("0.0007 BTC");
    expect(variance()).toBe("0 BTC");
    expect(screen.getByText("On target")).toBeInTheDocument();
  });

  it("takes the actual's precision when it is finer than the target's", () => {
    renderCard([target("2026-09-01", "0.004", "BTC")], { BTC: "0.00512345" });
    expect(valueAfter("Current budget")).toBe("0.004 BTC");
    expect(valueAfter("Latest actual")).toBe("0.00512345 BTC");
    expect(variance()).toBe("+0.00112345 BTC");
  });

  it("leaves a larger BTC budget as it was", () => {
    renderCard([target("2026-09-01", "0.004", "BTC")], { BTC: "0.005" });
    expect(valueAfter("Current budget")).toBe("0.004 BTC");
    expect(valueAfter("Latest actual")).toBe("0.005 BTC");
    expect(variance()).toBe("+0.001 BTC");
    expect(screen.getByText("Above target")).toBeInTheDocument();
  });

  it("keeps cash at its minor units however finely it was written", async () => {
    renderCard([target("2026-09-01", "400.0000", "USD")], { USD: "500.12345" });
    expect(valueAfter("Current budget")).toBe("400.00 USD");
    expect(valueAfter("Latest actual")).toBe("500.12 USD");
    expect(variance()).toBe("+100.12 USD");
    expect((await periodRows())[0]).toEqual([
      "2026-09-30",
      "400.00 USD",
      "500.12 USD",
    ]);
  });
});
