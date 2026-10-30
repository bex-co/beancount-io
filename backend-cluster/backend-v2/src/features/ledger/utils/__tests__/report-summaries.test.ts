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
  IncomeStatementDataPublic,
  OverviewPublic,
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
      valuation: "latest-price",
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

  /**
   * w6/006. A filter that selects one transfer cancels every aggregate — the
   * net-worth point and the Assets root are empty maps — while both accounts
   * still hold money. The currency then came from the request alone: a
   * strategy name or a currency nothing carries, under which every account
   * read as zero and vanished.
   */
  describe("when a transfer cancels every aggregate", () => {
    const transfer = (currency: string) =>
      ({
        net_worth_data: [{ date: "2026-03-31", balance: {} }],
        assets_data: [],
        liabilities_data: [],
        equity_data: [],
        assets_hierarchy_data: node("Assets", {}, [
          node("Assets:Bank", {}, [
            node("Assets:Bank:Checking", { [currency]: "-500" }),
            node("Assets:Bank:Savings", { [currency]: "500" }),
            node("Assets:Bank:Unused", {}),
          ]),
        ]),
        liabilities_hierarchy_data: node("Liabilities", {}),
        equity_hierarchy_data: node("Equity", {}),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any;
    const summary = (currency: string, valuation = "latest-price") => ({
      asOf: "2026-03-31",
      currency,
      valuation,
      assets: 0,
      liabilities: 0,
      equity: 0,
      netWorth: 0,
      byAccount: [
        { account: "Assets:Bank:Checking", balance: -500 },
        { account: "Assets:Bank:Savings", balance: 500 },
      ],
    });

    it.each([
      ["units", "units"],
      ["at_cost", "cost"],
      ["at_value", "latest-price"],
      ["USD", "latest-price"],
      [undefined, "latest-price"],
    ])(
      "keeps both signed accounts in USD with conversion=%s",
      (conversion, valuation) => {
        expect(summarizeBalanceSheet(transfer("USD"), conversion)).toEqual(
          summary("USD", valuation),
        );
      },
    );

    it("reports the accounts' currency, not one the request names but nothing carries", () => {
      // EUR was asked for but nothing carries it, so nothing was converted:
      // the totals are units, not EUR prices (w23/050).
      // ...and it says so: the USD stayed USD for want of a EUR price.
      expect(summarizeBalanceSheet(transfer("USD"), "EUR")).toEqual({
        ...summary("USD", "units"),
        missingPrices: [{ from: "USD", to: "EUR" }],
      });
    });

    it("reads a non-USD ledger's currency from its accounts", () => {
      expect(summarizeBalanceSheet(transfer("CHF"), "units")).toEqual(
        summary("CHF", "units"),
      );
    });

    it("honours a requested currency the accounts do carry", () => {
      const mixed = transfer("USD");
      mixed.assets_hierarchy_data.children[0].children[0].balance = {
        USD: "-500",
        EUR: "-40",
      };
      mixed.assets_hierarchy_data.children[0].children[1].balance = {
        USD: "500",
        EUR: "40",
      };
      expect(summarizeBalanceSheet(mixed, "EUR")).toEqual({
        ...summary("EUR"),
        byAccount: [
          { account: "Assets:Bank:Checking", balance: -40 },
          { account: "Assets:Bank:Savings", balance: 40 },
        ],
      });
    });

    it("never labels a truly empty sheet with a strategy name", () => {
      const empty = {
        ...transfer("USD"),
        assets_hierarchy_data: node("Assets", {}),
      };
      expect(summarizeBalanceSheet(empty, "units")).toMatchObject({
        currency: "USD",
        byAccount: [],
      });
      // An explicit currency keeps its existing default.
      expect(summarizeBalanceSheet(empty, "EUR").currency).toBe("EUR");
    });

    it("keeps the aggregate policy whenever an aggregate names a currency", () => {
      // EUR is the aggregates' only currency, so it wins even though the
      // accounts hold more USD — the evidence order is unchanged.
      const withAggregate = {
        ...transfer("USD"),
        net_worth_data: [{ date: "2026-03-31", balance: { EUR: "0.01" } }],
      };
      expect(summarizeBalanceSheet(withAggregate, "units").currency).toBe(
        "EUR",
      );
    });
  });
});

describe("summarizeIncomeStatement", () => {
  const date = "2026-02-28";
  const empty: IncomeStatementDataPublic = {
    net_profit_data: [{ date, balance: {} }],
    income_data: [{ date, balance: {}, account_balances: {} }],
    expenses_data: [{ date, balance: {}, account_balances: {} }],
    income_hierarchy_data: node("Income", {}),
    expenses_hierarchy_data: node("Expenses", {}),
  };

  it.each(["units", "at_cost", "at_value", undefined, "EUR"])(
    "uses the empty currency fallback rather than conversion=%s as a label",
    (conversion) => {
      const currency = conversion === "EUR" ? "EUR" : "USD";
      expect(summarizeIncomeStatement(empty, conversion, "2026-02")).toEqual({
        period: { from: null, to: date, time: "2026-02" },
        currency,
        income: 0,
        expenses: 0,
        net: -0,
        byAccount: [],
      });
      expect(
        summarizeIncomeStatement(
          { ...empty, net_profit_data: [], income_data: [], expenses_data: [] },
          conversion,
        ),
      ).toEqual({
        period: { from: null, to: null, time: null },
        currency,
        income: 0,
        expenses: 0,
        net: -0,
        byAccount: [],
      });
    },
  );

  it.each([
    {
      name: "profit",
      conversion: "units",
      income: "-100.25",
      expenses: "60",
      netBalance: "-40.25",
      net: 40.25,
      byAccount: [
        { account: "Income:Sales", balance: -100.25 },
        { account: "Expenses:Operations", balance: 60 },
      ],
    },
    {
      name: "loss",
      conversion: "at_cost",
      income: "0",
      expenses: "3200",
      netBalance: "3200",
      net: -3200,
      byAccount: [{ account: "Expenses:Operations", balance: 3200 }],
    },
    {
      name: "zero net with nonzero accounts",
      conversion: "at_value",
      income: "-100",
      expenses: "100",
      netBalance: "0",
      net: -0,
      byAccount: [
        { account: "Income:Sales", balance: -100 },
        { account: "Expenses:Operations", balance: 100 },
      ],
    },
  ])("preserves observed MUSD $name amounts and accounts", (entry) => {
    const data: IncomeStatementDataPublic = {
      net_profit_data: [{ date, balance: { MUSD: entry.netBalance } }],
      income_data: [
        {
          date,
          balance: { MUSD: entry.income },
          account_balances: { "Income:Sales": { MUSD: entry.income } },
        },
      ],
      expenses_data: [
        {
          date,
          balance: { MUSD: entry.expenses },
          account_balances: { "Expenses:Operations": { MUSD: entry.expenses } },
        },
      ],
      income_hierarchy_data: node(
        "Income",
        {},
        [node("Income:Sales", { MUSD: entry.income })],
        { MUSD: entry.income },
      ),
      expenses_hierarchy_data: node(
        "Expenses",
        {},
        [node("Expenses:Operations", { MUSD: entry.expenses })],
        { MUSD: entry.expenses },
      ),
    };
    expect(summarizeIncomeStatement(data, entry.conversion)).toEqual({
      period: { from: null, to: date, time: null },
      currency: "MUSD",
      income: Number(entry.income),
      expenses: Number(entry.expenses),
      net: entry.net,
      byAccount: entry.byAccount,
    });
  });

  it("derives profit from beancount's signs rather than subtracting", () => {
    const summary = summarizeIncomeStatement(
      {
        // Chart points are dated by their bucket's inclusive end.
        net_profit_data: [
          { date: "2026-01-31", balance: { USD: "-40" } },
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
      } as any,
      "USD",
      "2026",
    );

    // January 31 ends the first bucket; it is not where 2026's totals start,
    // and the payload names no start, so the summary claims none (w6/005).
    expect(summary.period).toEqual({
      from: null,
      to: "2026-12-31",
      time: "2026",
    });
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
  const date = "2026-02-28";
  const empty: OverviewPublic = {
    net_worth_data: [{ date, balance: {} }],
    assets_data: [{ date, balance: {} }],
    liabilities_data: [{ date, balance: {} }],
    income_data: [{ date, balance: {} }],
    expenses_data: [{ date, balance: {} }],
    income_interval_data: [{ date, balance: {}, account_balances: {} }],
    expenses_interval_data: [{ date, balance: {}, account_balances: {} }],
    assets_hierarchy_data: node("Assets", {}),
    liabilities_hierarchy_data: node("Liabilities", {}),
    income_hierarchy_data: node("Income", {}),
    expenses_hierarchy_data: node("Expenses", {}),
  };

  it.each(["units", "at_cost", "at_value", undefined, "EUR"])(
    "uses the empty currency fallback rather than conversion=%s as a label",
    (conversion) => {
      const currency = conversion === "EUR" ? "EUR" : "USD";
      expect(summarizeOverview(empty, conversion)).toEqual({
        currency,
        netWorth: 0,
        series: [{ date, netWorth: 0 }],
      });
      expect(
        summarizeOverview({ ...empty, net_worth_data: [] }, conversion),
      ).toEqual({ currency, netWorth: 0, series: [] });
    },
  );

  it("keeps observed MUSD and all signed series amounts, including a final zero", () => {
    const data = {
      ...empty,
      net_worth_data: [
        { date: "2026-01-31", balance: { MUSD: "10.50" } },
        { date, balance: { MUSD: "-5.25" } },
        { date: "2026-03-31", balance: { MUSD: "0" } },
      ],
    };
    for (const conversion of ["units", "at_cost", "at_value", undefined]) {
      expect(summarizeOverview(data, conversion)).toEqual({
        currency: "MUSD",
        netWorth: 0,
        series: [
          { date: "2026-01-31", netWorth: 10.5 },
          { date, netWorth: -5.25 },
          { date: "2026-03-31", netWorth: 0 },
        ],
      });
    }
  });

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
      missingPrices: [{ from: "EUR", to: "JPY" }],
      intervals: [expectedMarch],
    });
  });

  it("keeps aggregate zero-valued currency keys ahead of account evidence", () => {
    expect(
      summarizeIntervalTotals([{ ...mixed, balance: { USD: "0" } }], "EUR"),
    ).toEqual({
      currency: "USD",
      missingPrices: [{ from: "USD", to: "EUR" }],
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

/**
 * w23/013. Totals were float sums of the ledger's decimal strings, so
 * `open_ledger/example` reported `netWorth: 906.5799999999999` and
 * `net: 103335.53000000003`.
 */
describe("summary totals are exact decimal sums", () => {
  it("adds assets and liabilities without float noise", () => {
    const summary = summarizeBalanceSheet({
      net_worth_data: [{ date: "2026-02-28", balance: { USD: "906.58" } }],
      assets_data: [],
      liabilities_data: [],
      equity_data: [],
      assets_hierarchy_data: node("Assets", { USD: "0.1" }, [], {
        USD: "3609.77",
      }),
      liabilities_hierarchy_data: node("Liabilities", {}, [], {
        USD: "-2703.29",
      }),
      equity_hierarchy_data: node("Equity", {}),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    // 3609.77 + 0.1 is 3609.8700000000003 as floats.
    expect(summary.assets).toBe(3609.87);
    expect(summary.netWorth).toBe(906.58);
  });

  it("nets income and expenses without float noise", () => {
    const date = "2026-02-28";
    const summary = summarizeIncomeStatement({
      net_profit_data: [{ date, balance: { USD: "-499.9" } }],
      income_data: [],
      expenses_data: [],
      income_hierarchy_data: node("Income", {}, [], { USD: "-1000.10" }),
      expenses_hierarchy_data: node("Expenses", {}, [], { USD: "500.20" }),
    });
    // -(-1000.10 + 500.20) is 499.90000000000003 as floats.
    expect(-(-1000.1 + 500.2)).not.toBe(499.9);
    expect(summary.net).toBe(499.9);
  });
});

// w23/050: holdings in any currency but the stated one were summed as zero,
// so `units` net worth read 715.58 against 117,458 at value, and nothing said
// what was left out.
describe("what the stated currency leaves out", () => {
  const portfolio = {
    net_worth_data: [
      { date: "2026-02-28", balance: { USD: "700", VACHR: "40", ITOT: "10" } },
    ],
    assets_data: [],
    liabilities_data: [],
    equity_data: [],
    assets_hierarchy_data: node(
      "Assets",
      {},
      [
        node("Assets:Cash", { USD: "800" }),
        node("Assets:Broker", { ITOT: "10" }),
        node("Assets:Vacation", { VACHR: "40" }),
      ],
      { USD: "800", ITOT: "10", VACHR: "40" },
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

  it("reports holdings in other commodities beside a units balance sheet", () => {
    expect(summarizeBalanceSheet(portfolio, "units")).toMatchObject({
      currency: "USD",
      valuation: "units",
      netWorth: 700,
      otherCurrencies: { ITOT: 10, VACHR: 40 },
    });
  });

  it("labels a conversion the ledger cannot price as units, with what it left out", () => {
    expect(summarizeBalanceSheet(portfolio, "EUR")).toMatchObject({
      currency: "USD",
      valuation: "units",
      otherCurrencies: { ITOT: 10, VACHR: 40 },
    });
  });

  // w23/m16: an explicit currency conversion that left money elsewhere names
  // the legs that had no price path, beside the amounts otherCurrencies gives.
  it("names the legs a currency conversion could not reach", () => {
    expect(summarizeBalanceSheet(portfolio, "EUR")).toMatchObject({
      missingPrices: [
        { from: "ITOT", to: "EUR" },
        { from: "USD", to: "EUR" },
        { from: "VACHR", to: "EUR" },
      ],
    });
  });

  it("names only the unpriced leg when the requested currency is carried", () => {
    const priced = {
      ...portfolio,
      assets_hierarchy_data: node(
        "Assets",
        {},
        [
          node("Assets:Cash", { EUR: "800" }),
          node("Assets:Vacation", { VACHR: "40" }),
        ],
        { EUR: "800", VACHR: "40" },
      ),
      liabilities_hierarchy_data: node("Liabilities", {}, [], {}),
    };
    expect(summarizeBalanceSheet(priced, "EUR")).toMatchObject({
      currency: "EUR",
      missingPrices: [{ from: "VACHR", to: "EUR" }],
    });
  });

  it.each([undefined, "units", "at_cost", "at_value"])(
    "names no legs under conversion=%s",
    (conversion) => {
      expect(summarizeBalanceSheet(portfolio, conversion)).not.toHaveProperty(
        "missingPrices",
      );
    },
  );

  it("omits the field when the stated currency carries everything", () => {
    const allUsd = {
      ...portfolio,
      assets_hierarchy_data: node("Assets", {}, [node("Assets:Cash", { USD: "800" })], { USD: "800" }),
    };
    expect(summarizeBalanceSheet(allUsd, "units")).not.toHaveProperty("otherCurrencies");
  });

  it("reports the net profit other currencies leave out, signed as `net` is", () => {
    const statement = {
      net_profit_data: [{ date: "2026-02-28", balance: { USD: "50" } }],
      income_hierarchy_data: node("Income", {}, [node("Income:Salary", { USD: "-100" }), node("Income:Vacation", { VACHR: "-8" })], { USD: "-100", VACHR: "-8" }),
      expenses_hierarchy_data: node("Expenses", {}, [node("Expenses:Food", { USD: "50" })], { USD: "50" }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    expect(summarizeIncomeStatement(statement, "units")).toMatchObject({
      net: 50,
      otherCurrencies: { VACHR: 8 },
    });
  });

  it("reports what the latest net worth and each interval leave out", () => {
    expect(summarizeOverview(portfolio as OverviewPublic)).toMatchObject({
      netWorth: 700,
      otherCurrencies: { ITOT: 10, VACHR: 40 },
    });
    const intervals = summarizeIntervalTotals([
      { date: "2026-01-31", balance: { USD: "5" }, account_balances: {} },
      { date: "2026-02-28", balance: { USD: "7", VACHR: "2" }, account_balances: {} },
    ] as DateAndBalanceWithAccountBalancePublic[]);
    expect(intervals.intervals[0]).not.toHaveProperty("otherCurrencies");
    expect(intervals.intervals[1]).toMatchObject({ total: 7, otherCurrencies: { VACHR: 2 } });
  });
});
