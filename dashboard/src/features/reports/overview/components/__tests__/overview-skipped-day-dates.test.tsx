import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { EChartsOption } from "echarts";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NetWorthCard } from "../net-worth-card";
import { RecentActivityCard } from "../recent-activity-card";
import { describeNetWorthValuation } from "../../lib/net-worth-valuation";
import { formatPeriodMonth } from "../../lib/overview-utils";

/**
 * Overview writes each ledger date as its own calendar day in every browser
 * zone (w4/1027). Apia skipped 2011-12-30 and Kiritimati 1994-12-31; a local
 * midnight on those days rolls into the next, so a December 30 price read as
 * December 31 and a December figure as January. The real components and
 * formatters run; only reads and the canvas are replaced.
 */
const captured: EChartsOption[] = [];
const journal = vi.hoisted(() => ({ date: "2011-12-30" }));
const router = vi.hoisted(() => ({ search: {} as Record<string, string> }));
vi.mock("@/common/components/react-echarts", () => ({
  ReactECharts: ({ option }: { option: EChartsOption }) => {
    captured.push(option);
    return <div data-testid="chart" />;
  },
}));
vi.mock("@apollo/client/react", () => ({
  useQuery: () => ({
    data: {
      getLedgerJournal: {
        data: [
          {
            entry_hash: "day",
            date: journal.date,
            directive_type: "Transaction",
            flag: "*",
            payee: "qa-20261023-day",
            narration: "",
            postings: [
              {
                account: "Expenses:Food",
                units: { number: "10", currency: "USD" },
              },
              {
                account: "Assets:Cash",
                units: { number: "-10", currency: "USD" },
              },
            ],
            tags: [],
            links: [],
          },
        ],
        total: 1,
      },
    },
    loading: false,
    error: undefined,
    refetch: vi.fn(),
  }),
}));
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerData: { options: { renderCommas: true } } }),
}));
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key} ${JSON.stringify(params)}` : key,
    i18n: { language: "en" },
  }),
}));
vi.mock("@tanstack/react-router", async () => {
  const { useHydrated } = await vi.importActual<
    typeof import("@tanstack/react-router")
  >("@tanstack/react-router");
  return {
    useHydrated,
    Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
    useNavigate: () => vi.fn(),
    useSearch: () => router.search,
  };
});

const originalTz = process.env.TZ;
const inZone = (zone: string) => {
  beforeAll(() => {
    process.env.TZ = zone;
  });
  afterAll(() => {
    process.env.TZ = originalTz;
  });
};

/** A holding whose latest price is `day`, stale by the end of January. */
function valuationPricedOn(day: string) {
  return describeNetWorthValuation({
    market: { USD: "20.00" },
    cost: { USD: "10.00" },
    units: { QA2011DATE: "1" },
    currency: "USD",
    date: "2012-01-31",
    today: "2026-10-23",
    pricePairs: [
      {
        base: "QA2011DATE",
        quote: "USD",
        prices: ["2011-12-28", "2011-12-29", day].map((date) => ({ date })),
      },
    ],
    managedSources: [],
  });
}

describe("Overview in Pacific/Apia, which skipped 2011-12-30", () => {
  inZone("Pacific/Apia");

  it.each(["2011-12-29", "2011-12-30", "2011-12-31"])(
    "keeps a %s price date in the stale summary and the holding row",
    async (day) => {
      const shown = new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", {
        timeZone: "UTC",
        dateStyle: "medium",
      });
      render(
        <NetWorthCard
          ledgerOwner="owner"
          ledgerName="book"
          valuation={valuationPricedOn(day)}
          data={[{ date: "2012-01-31", balance: { USD: "20.00" } }]}
          primaryCurrency="USD"
        />,
      );
      const summary = screen.getByRole("button", {
        name: /page\.overview\.valuedAtMarket/,
      });
      expect(summary.textContent).toContain(`"date":"${shown}"`);
      await userEvent.click(summary);
      expect(
        await screen.findByText(
          new RegExp(`page\\.overview\\.holdingPrice .*"date":"${shown}"`),
        ),
      ).toBeInTheDocument();
    },
  );

  it.each([
    ["2011-12-29", "Dec 29, 2011"],
    ["2011-12-30", "Dec 30, 2011"],
    ["2011-12-31", "Dec 31, 2011"],
  ])("labels a %s Recent activity entry %s", async (day, label) => {
    journal.date = day;
    render(
      <RecentActivityCard
        ledgerId="owner/book"
        ledgerOwner="owner"
        ledgerName="book"
        account=""
        filter=""
        time="2011-12"
        primaryCurrency="USD"
        incomeRoot="Income"
        expensesRoot="Expenses"
        canWrite={false}
      />,
    );
    expect((await screen.findAllByText(label)).length).toBeGreaterThan(0);
  });
});

describe("Overview in Pacific/Kiritimati, which skipped 1994-12-31", () => {
  inZone("Pacific/Kiritimati");

  it("keeps December 1994 in the Net Worth chart and table", () => {
    const card = (
      <NetWorthCard
        ledgerOwner="owner"
        ledgerName="book"
        valuation={null}
        data={[
          { date: "1994-11-30", balance: { USD: "10.00" } },
          { date: "1994-12-31", balance: { USD: "20.00" } },
        ]}
        primaryCurrency="USD"
      />
    );
    captured.length = 0;
    router.search = {};
    render(card);
    const axis = (
      captured.at(-1)!.xAxis as {
        axisLabel: { formatter: (value: string) => string };
      }
    ).axisLabel.formatter;
    expect(["1994-11-30", "1994-12-31"].map(axis)).toEqual(["Nov", "Dec"]);
    cleanup();

    router.search = { view: "table" };
    render(card);
    const table = screen.getByRole("table");
    expect(within(table).getByText("Dec 1994")).toBeInTheDocument();
    expect(within(table).queryByText("Jan 1995")).toBeNull();
    router.search = {};
  });

  it("keeps December 1994 in Money movement's month headings", () => {
    expect(
      ["1994-11-30", "1994-12-30", "1994-12-31", "1995-01-31"].map((day) =>
        formatPeriodMonth(day, "en"),
      ),
    ).toEqual([
      "November 1994",
      "December 1994",
      "December 1994",
      "January 1995",
    ]);
    // A value that is not a ledger date is shown as given.
    expect(formatPeriodMonth("not-a-date", "en")).toBe("not-a-date");
  });
});
