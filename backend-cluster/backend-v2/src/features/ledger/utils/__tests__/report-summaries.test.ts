import {
  flattenHierarchy,
  resolveCurrency,
  summarizeBalanceSheet,
  summarizeIncomeStatement,
  summarizeIntervalTotals,
  summarizeOverview,
} from "@/features/ledger/utils/report-summaries";
import type {
  DateAndBalanceWithAccountBalancePublic,
  SerializableTreeNodePublic,
} from "@/foundation/fava";

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
    expect(resolveCurrency([{ USD: "1" }, { USD: "2" }, { EUR: "3" }])).toBe(
      "USD",
    );
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
    assets_hierarchy_data: node(
      "Assets",
      {},
      [node("Assets:Cash", { USD: "1250" })],
      { USD: "1250" },
    ),
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
      income_hierarchy_data: node(
        "Income",
        {},
        [node("Income:Salary", { USD: "-100" })],
        { USD: "-100" },
      ),
      expenses_hierarchy_data: node(
        "Expenses",
        {},
        [node("Expenses:Food", { USD: "60" })],
        { USD: "60" },
      ),
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
  const strategies = ["units", "at_cost", "at_value"] as const;
  const march: DateAndBalanceWithAccountBalancePublic = {
    date: "2026-03-31",
    balance: {},
    account_balances: {
      "Assets:Bank:Checking": { USD: "-500" },
      "Assets:Bank:Savings": { USD: "500" },
      "Assets:Bank:Unused": { USD: "0" },
      "Assets:Bank:NegativeZero": { USD: "-0" },
    },
  };
  const expectedMarch = {
    period: "2026-03-31",
    total: 0,
    byAccount: [
      { account: "Assets:Bank:Checking", balance: -500 },
      { account: "Assets:Bank:Savings", balance: 500 },
    ],
  };

  it("states the currency once and drops zero accounts", () => {
    expect(
      summarizeIntervalTotals([
        {
          date: "2026-01",
          balance: { USD: "30" },
          account_balances: {
            "Expenses:Food": { USD: "30" },
            "Expenses:Rent": { USD: "0" },
          },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any),
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

  it.each(strategies)(
    "preserves signed zero-net account movements with %s",
    (conversion) => {
      expect(summarizeIntervalTotals([march], conversion)).toEqual({
        currency: "USD",
        intervals: [expectedMarch],
      });
    },
  );

  it("preserves the explicit supported USD control for zero-net movements", () => {
    expect(summarizeIntervalTotals([march], "USD")).toEqual({
      currency: "USD",
      intervals: [expectedMarch],
    });
  });

  it.each(strategies)(
    "keeps March identical in narrow and wide windows with %s",
    (conversion) => {
      const opening: DateAndBalanceWithAccountBalancePublic = {
        date: "2026-01-31",
        balance: { USD: "1000" },
        account_balances: { "Assets:Bank:Checking": { USD: "1000" } },
      };
      const narrow = summarizeIntervalTotals([march], conversion);
      const wide = summarizeIntervalTotals([opening, march], conversion);
      expect(narrow).toEqual({ currency: "USD", intervals: [expectedMarch] });
      expect(wide).toEqual({
        currency: "USD",
        intervals: [
          {
            period: "2026-01-31",
            total: 1000,
            byAccount: [{ account: "Assets:Bank:Checking", balance: 1000 }],
          },
          expectedMarch,
        ],
      });
    },
  );

  it.each(strategies)(
    "infers non-USD zero-net currency from accounts with %s",
    (conversion) => {
      const euro: DateAndBalanceWithAccountBalancePublic = {
        date: "2026-03-31",
        balance: {},
        account_balances: {
          "Assets:Bank:Checking": { EUR: "-500" },
          "Assets:Bank:Savings": { EUR: "500" },
        },
      };
      expect(summarizeIntervalTotals([euro], conversion)).toEqual({
        currency: "EUR",
        intervals: [expectedMarch],
      });
    },
  );

  it.each(strategies)(
    "uses the existing default for genuinely empty results with %s",
    (conversion) => {
      expect(summarizeIntervalTotals([], conversion)).toEqual({
        currency: "USD",
        intervals: [],
      });
      expect(
        summarizeIntervalTotals(
          [{ date: "2026-03-31", balance: {}, account_balances: {} }],
          conversion,
        ),
      ).toEqual({
        currency: "USD",
        intervals: [{ period: "2026-03-31", total: 0, byAccount: [] }],
      });
    },
  );

  it.each(strategies)(
    "preserves nonzero-net totals, signs and zero-account omission with %s",
    (conversion) => {
      expect(
        summarizeIntervalTotals(
          [
            {
              ...march,
              balance: { USD: "30" },
              account_balances: {
                "Expenses:Food": { USD: "50" },
                "Expenses:Refunds": { USD: "-20" },
                "Expenses:Unused": { USD: "0" },
              },
            },
          ],
          conversion,
        ),
      ).toEqual({
        currency: "USD",
        intervals: [
          {
            period: "2026-03-31",
            total: 30,
            byAccount: [
              { account: "Expenses:Food", balance: 50 },
              { account: "Expenses:Refunds", balance: -20 },
            ],
          },
        ],
      });
    },
  );

  const mixed: DateAndBalanceWithAccountBalancePublic = {
    date: "2026-03-31",
    balance: {},
    account_balances: {
      "Assets:Bank:Checking": { EUR: "-500", USD: "-900" },
      "Assets:Bank:Savings": { EUR: "500", USD: "900" },
      "Assets:Bank:Unused": { EUR: "0" },
    },
  };

  it("uses account currency-key frequency without combining currencies", () => {
    expect(summarizeIntervalTotals([mixed], "units")).toEqual({
      currency: "EUR",
      intervals: [expectedMarch],
    });
  });

  it("keeps the first-seen account currency when their frequencies tie", () => {
    const tied = {
      ...mixed,
      account_balances: {
        "Assets:Bank:Checking": mixed.account_balances["Assets:Bank:Checking"],
        "Assets:Bank:Savings": mixed.account_balances["Assets:Bank:Savings"],
      },
    };
    expect(summarizeIntervalTotals([tied], "units")).toEqual({
      currency: "EUR",
      intervals: [expectedMarch],
    });
  });

  it("honours an explicit account currency despite another's higher frequency", () => {
    expect(summarizeIntervalTotals([mixed], "USD")).toEqual({
      currency: "USD",
      intervals: [
        {
          period: "2026-03-31",
          total: 0,
          byAccount: [
            { account: "Assets:Bank:Checking", balance: -900 },
            { account: "Assets:Bank:Savings", balance: 900 },
          ],
        },
      ],
    });
  });

  it("ignores an unsupported explicit currency and keeps the frequency policy", () => {
    expect(summarizeIntervalTotals([mixed], "JPY")).toEqual({
      currency: "EUR",
      intervals: [expectedMarch],
    });
  });

  it("keeps aggregate zero-valued currency keys ahead of account evidence", () => {
    expect(
      summarizeIntervalTotals([{ ...mixed, balance: { USD: "0" } }], "EUR"),
    ).toEqual({
      currency: "USD",
      intervals: [
        {
          period: "2026-03-31",
          total: 0,
          byAccount: [
            { account: "Assets:Bank:Checking", balance: -900 },
            { account: "Assets:Bank:Savings", balance: 900 },
          ],
        },
      ],
    });
  });
});
