import {
  flattenHierarchy,
  resolveCurrency,
  summarizeBalanceSheet,
  summarizeIncomeStatement,
  summarizeIntervalTotals,
  summarizeOverview,
} from "@/features/ledger/utils/report-summaries";
import type { SerializableTreeNodePublic } from "@/foundation/fava";

/**
 * w2/m28:t002. The projections that made the statements usable to an agent.
 * The cases here are the ones a chart payload hides: which currency a total is
 * in, whether a parent and its children are counted twice, and what an empty
 * ledger answers.
 */

type TreeNode = SerializableTreeNodePublic;

const node = (
  account: string,
  balance: Record<string, string>,
  children: TreeNode[] = [],
  balanceChildren: Record<string, string> = {},
): TreeNode => ({
  account,
  balance,
  balance_children: balanceChildren,
  children,
  has_txns: true,
});

describe("resolveCurrency", () => {
  it("honours the requested conversion when the data carries it", () => {
    expect(resolveCurrency([{ USD: "1", EUR: "2" }], "EUR")).toBe("EUR");
  });

  it("ignores a requested currency the ledger never uses", () => {
    // Reporting zeroes in a currency nothing is denominated in reads as "no
    // money", which is a worse answer than "here is the currency you have".
    expect(resolveCurrency([{ USD: "1" }, { USD: "2" }], "JPY")).toBe("USD");
  });

  it("picks the most common currency when none is requested", () => {
    expect(
      resolveCurrency([{ USD: "1" }, { USD: "2" }, { EUR: "3" }]),
    ).toBe("USD");
  });

  it("survives a period with no balance at all", () => {
    expect(() =>
      resolveCurrency([undefined as never, { USD: "1" }]),
    ).not.toThrow();
  });
});

describe("flattenHierarchy", () => {
  it("reports each account's own balance, never its children's as well", () => {
    const tree = node(
      "Assets",
      {},
      [
        node("Assets:Cash", { USD: "100" }),
        node("Assets:Bank", { USD: "250" }, [
          node("Assets:Bank:Savings", { USD: "900" }),
        ]),
      ],
      { USD: "1250" },
    );
    expect(flattenHierarchy(tree, "USD")).toEqual([
      { account: "Assets:Cash", balance: 100 },
      { account: "Assets:Bank", balance: 250 },
      { account: "Assets:Bank:Savings", balance: 900 },
    ]);
  });

  it("drops zero-balance accounts — the vocabulary resource lists what exists", () => {
    const tree = node("Assets", {}, [
      node("Assets:Cash", { USD: "0" }),
      node("Assets:Bank", { USD: "5" }),
    ]);
    expect(flattenHierarchy(tree, "USD")).toEqual([
      { account: "Assets:Bank", balance: 5 },
    ]);
  });

  it("returns nothing rather than throwing for a missing hierarchy", () => {
    expect(flattenHierarchy(undefined, "USD")).toEqual([]);
  });
});

describe("summarizeBalanceSheet", () => {
  const data = {
    net_worth_data: [
      { date: "2026-01-31", balance: { USD: "900" } },
      { date: "2026-02-28", balance: { USD: "1150" } },
    ],
    assets_data: [],
    liabilities_data: [],
    equity_data: [],
    assets_hierarchy_data: node("Assets", {}, [
      node("Assets:Cash", { USD: "1250" }),
    ], { USD: "1250" }),
    liabilities_hierarchy_data: node(
      "Liabilities",
      {},
      [node("Liabilities:Card", { USD: "-100" })],
      { USD: "-100" },
    ),
    equity_hierarchy_data: node("Equity", {}, [], {}),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  it("states the totals and the accounts behind them", () => {
    expect(summarizeBalanceSheet(data)).toEqual({
      asOf: "2026-02-28",
      currency: "USD",
      assets: 1250,
      liabilities: -100,
      equity: 0,
      netWorth: 1150,
      byAccount: [
        { account: "Assets:Cash", balance: 1250 },
        { account: "Liabilities:Card", balance: -100 },
      ],
    });
  });

  it("answers an empty ledger without inventing a date", () => {
    const summary = summarizeBalanceSheet({
      ...data,
      net_worth_data: [],
    });
    expect(summary.asOf).toBeNull();
    // With no series to read from, net worth falls back to assets plus
    // liabilities — which is the identity, not a guess.
    expect(summary.netWorth).toBe(1150);
  });
});

describe("summarizeIncomeStatement", () => {
  it("derives profit from beancount's signs rather than subtracting", () => {
    const summary = summarizeIncomeStatement({
      net_profit_data: [
        { date: "2026-01-01", balance: { USD: "-40" } },
        { date: "2026-12-31", balance: { USD: "-40" } },
      ],
      income_data: [],
      expenses_data: [],
      income_hierarchy_data: node("Income", {}, [
        node("Income:Salary", { USD: "-100" }),
      ], { USD: "-100" }),
      expenses_hierarchy_data: node("Expenses", {}, [
        node("Expenses:Food", { USD: "60" }),
      ], { USD: "60" }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    expect(summary.period).toEqual({ from: "2026-01-01", to: "2026-12-31" });
    expect(summary.income).toBe(-100);
    expect(summary.expenses).toBe(60);
    // Income is negative in beancount, so profit is the negated sum — 40, not
    // -160 as a naive subtraction would give.
    expect(summary.net).toBe(40);
    expect(summary.byAccount).toEqual([
      { account: "Income:Salary", balance: -100 },
      { account: "Expenses:Food", balance: 60 },
    ]);
  });
});

describe("summarizeOverview", () => {
  it("keeps the net-worth series and drops the eleven chart series", () => {
    expect(
      summarizeOverview({
        net_worth_data: [
          { date: "2026-01-31", balance: { USD: "10" } },
          { date: "2026-02-28", balance: { USD: "20" } },
        ],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
    ).toEqual({
      currency: "USD",
      netWorth: 20,
      series: [
        { date: "2026-01-31", netWorth: 10 },
        { date: "2026-02-28", netWorth: 20 },
      ],
    });
  });

  it("reports zero rather than undefined for a ledger with no history", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(summarizeOverview({ net_worth_data: [] } as any).netWorth).toBe(0);
  });
});

describe("summarizeIntervalTotals", () => {
  it("states the currency once and drops zero accounts", () => {
    expect(
      summarizeIntervalTotals(
        [
          {
            date: "2026-01",
            balance: { USD: "30" },
            account_balances: {
              "Expenses:Food": { USD: "30" },
              "Expenses:Rent": { USD: "0" },
            },
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ] as any,
      ),
    ).toEqual({
      currency: "USD",
      intervals: [
        {
          period: "2026-01",
          total: 30,
          byAccount: [{ account: "Expenses:Food", balance: 30 }],
        },
      ],
    });
  });
});
