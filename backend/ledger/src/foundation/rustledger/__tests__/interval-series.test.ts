import type { DirectiveJson } from "@rustledger/wasm";
import { buildPriceMap } from "../price-map";
import {
  accountBalanceSeries,
  intervalRanges,
  intervalTotals,
  type IntervalKey,
} from "../interval-series";

describe("intervalRanges", () => {
  it("buckets months (with a leap-year February end)", () => {
    const ranges = intervalRanges("2024-01-15", "2024-03-10", "month");
    expect(ranges.map((r) => [r.begin, r.end, r.endInclusive])).toEqual([
      ["2024-01-01", "2024-02-01", "2024-01-31"],
      ["2024-02-01", "2024-03-01", "2024-02-29"],
      ["2024-03-01", "2024-04-01", "2024-03-31"],
    ]);
  });

  it("buckets years", () => {
    const ranges = intervalRanges("2023-06-01", "2024-02-01", "year");
    expect(ranges.map((r) => r.endInclusive)).toEqual([
      "2023-12-31",
      "2024-12-31",
    ]);
  });

  it("buckets quarters", () => {
    const ranges = intervalRanges("2024-02-15", "2024-08-01", "quarter");
    expect(ranges.map((r) => [r.begin, r.endInclusive])).toEqual([
      ["2024-01-01", "2024-03-31"],
      ["2024-04-01", "2024-06-30"],
      ["2024-07-01", "2024-09-30"],
    ]);
  });

  it("preserves years below 100 in day and week arithmetic", () => {
    expect(
      intervalRanges("0099-01-01", "0099-01-03", "day", false).map((range) => [
        range.begin,
        range.end,
        range.endInclusive,
      ]),
    ).toEqual([
      ["0099-01-01", "0099-01-02", "0099-01-01"],
      ["0099-01-02", "0099-01-03", "0099-01-02"],
    ]);
    expect(intervalRanges("0099-01-01", "0099-01-02", "week")[0].begin).toBe(
      "0098-12-29",
    );
  });
});

describe("interval key normalization — every IntervalKey member", () => {
  // One fixed span; each canonical interval yields DISTINCT boundaries over
  // it, so any silent degradation (the old `replace(/ly$/, "")` turned "daily"
  // into "dai" and fell back to month) fails the exact-boundary assertion.
  const SPAN: [string, string] = ["2024-01-10", "2024-01-16"];

  const EXPECTED: Record<
    "year" | "quarter" | "month" | "week" | "day",
    Array<[string, string]>
  > = {
    year: [["2024-01-01", "2025-01-01"]],
    quarter: [["2024-01-01", "2024-04-01"]],
    month: [["2024-01-01", "2024-02-01"]],
    // 2024-01-08 and 2024-01-15 are Mondays.
    week: [
      ["2024-01-08", "2024-01-15"],
      ["2024-01-15", "2024-01-22"],
    ],
    day: [
      ["2024-01-10", "2024-01-11"],
      ["2024-01-11", "2024-01-12"],
      ["2024-01-12", "2024-01-13"],
      ["2024-01-13", "2024-01-14"],
      ["2024-01-14", "2024-01-15"],
      ["2024-01-15", "2024-01-16"],
    ],
  };

  const KEY_TO_CANONICAL: Record<IntervalKey, keyof typeof EXPECTED> = {
    year: "year",
    yearly: "year",
    quarter: "quarter",
    quarterly: "quarter",
    month: "month",
    monthly: "month",
    week: "week",
    weekly: "week",
    day: "day",
    daily: "day",
  };

  for (const [key, canonical] of Object.entries(KEY_TO_CANONICAL) as Array<
    [IntervalKey, keyof typeof EXPECTED]
  >) {
    it(`"${key}" buckets by ${canonical}`, () => {
      const ranges = intervalRanges(SPAN[0], SPAN[1], key);
      expect(ranges.map((r) => [r.begin, r.end])).toEqual(EXPECTED[canonical]);
    });
  }
});

const LEDGER: DirectiveJson[] = [
  {
    type: "transaction",
    date: "2024-01-15",
    flag: "*",
    narration: "jan",
    tags: [],
    links: [],
    postings: [
      { account: "Assets:Cash", units: { number: "1000", currency: "USD" } },
      { account: "Income:Salary", units: { number: "-1000", currency: "USD" } },
    ],
  },
  {
    type: "transaction",
    date: "2024-02-20",
    flag: "*",
    narration: "feb",
    tags: [],
    links: [],
    postings: [
      { account: "Assets:Cash", units: { number: "2000", currency: "USD" } },
      { account: "Income:Salary", units: { number: "-2000", currency: "USD" } },
    ],
  },
];

const usdMap = buildPriceMap([]);

describe("intervalTotals (periodic flows)", () => {
  it("sums per-interval postings for the prefix with an account breakdown", () => {
    const rows = intervalTotals(LEDGER, "month", ["Income"], "USD", usdMap);
    expect(rows).toEqual([
      {
        date: "2024-01-31",
        balance: { USD: "-1000" },
        account_balances: { "Income:Salary": { USD: "-1000" } },
      },
      {
        date: "2024-02-29",
        balance: { USD: "-2000" },
        account_balances: { "Income:Salary": { USD: "-2000" } },
      },
    ]);
  });
});

describe("accountBalanceSeries (cumulative stock)", () => {
  it("accumulates end-of-interval balances", () => {
    const rows = accountBalanceSeries(
      LEDGER,
      "month",
      ["Assets"],
      "USD",
      usdMap,
    );
    expect(rows).toEqual([
      { date: "2024-01-31", balance: { USD: "1000" } },
      { date: "2024-02-29", balance: { USD: "3000" } },
    ]);
  });

  // Fava's account_balance/net_worth exclude FLAG_UNREALIZED ("U") transactions
  // (the `unrealized` plugin books unrealized gains this way). The reviewer's
  // repro: a ledger whose only transaction is U-flagged must value to zero.
  const unrealizedOnly: DirectiveJson[] = [
    {
      type: "transaction",
      date: "2024-01-15",
      flag: "U",
      narration: "unrealized gain",
      tags: [],
      links: [],
      postings: [
        {
          account: "Assets:Investments",
          units: { number: "10", currency: "USD" },
        },
        {
          account: "Income:PnL:Unrealized",
          units: { number: "-10", currency: "USD" },
        },
      ],
    },
  ];

  it("excludes U-flagged transactions from the cumulative balance (returns empty, not 10 USD)", () => {
    const rows = accountBalanceSeries(
      unrealizedOnly,
      "month",
      ["Assets"],
      "USD",
      usdMap,
    );
    // Only a U-flagged txn exists -> the Assets balance is zero at every point,
    // and a zero balance is emitted as an empty record (no USD key).
    expect(rows.every((r) => Object.keys(r.balance).length === 0)).toBe(true);
  });

  it("still counts a realized txn while excluding a same-interval U-flagged one", () => {
    const mixed: DirectiveJson[] = [...unrealizedOnly, ...LEDGER];
    const rows = accountBalanceSeries(
      mixed,
      "month",
      ["Assets"],
      "USD",
      usdMap,
    );
    // The +10 from the U txn is dropped; only the realized 1000/3000 remain.
    expect(rows).toEqual([
      { date: "2024-01-31", balance: { USD: "1000" } },
      { date: "2024-02-29", balance: { USD: "3000" } },
    ]);
  });
});

describe("cost-lot valuation flows through the series (issue #5)", () => {
  // Buy 10 HOOL {10 USD}; no HOOL market price exists.
  const heldAtCost: DirectiveJson[] = [
    {
      type: "transaction",
      date: "2024-01-10",
      flag: "*",
      narration: "buy HOOL",
      tags: [],
      links: [],
      postings: [
        {
          account: "Assets:Investments",
          units: { number: "10", currency: "HOOL" },
          cost: { number: { kind: "per_unit", value: "10" }, currency: "USD" },
        },
        { account: "Assets:Cash", units: { number: "-100", currency: "USD" } },
      ],
    },
  ];

  it("net worth under at_value falls back to cost (100 USD, not 10 HOOL)", () => {
    const rows = accountBalanceSeries(
      heldAtCost,
      "month",
      ["Assets:Investments"],
      "at_value",
      usdMap,
    );
    // Was returning { HOOL: "10" }; now the cost fallback -> { USD: "100" }.
    expect(rows.at(-1)?.balance).toEqual({ USD: "100" });
  });

  it("under a plain currency conversion with a USD cost, the lot stays in units", () => {
    // convert_position: cost currency USD == target USD, no HOOL price -> units.
    const rows = accountBalanceSeries(
      heldAtCost,
      "month",
      ["Assets:Investments"],
      "USD",
      usdMap,
    );
    expect(rows.at(-1)?.balance).toEqual({ HOOL: "10" });
  });
});

describe("intervalTotals does NOT exclude U-flagged flows (Fava parity)", () => {
  it("includes a U-flagged transaction in the per-interval flow total", () => {
    const uTxn: DirectiveJson[] = [
      {
        type: "transaction",
        date: "2024-01-15",
        flag: "U",
        narration: "unrealized",
        tags: [],
        links: [],
        postings: [
          {
            account: "Income:PnL:Unrealized",
            units: { number: "-10", currency: "USD" },
          },
          {
            account: "Assets:Investments",
            units: { number: "10", currency: "USD" },
          },
        ],
      },
    ];
    const rows = intervalTotals(uTxn, "month", ["Income"], "USD", usdMap);
    // interval_totals (flow) keeps U-flagged postings — unlike account_balance.
    expect(rows).toEqual([
      {
        date: "2024-01-31",
        balance: { USD: "-10" },
        account_balances: { "Income:PnL:Unrealized": { USD: "-10" } },
      },
    ]);
  });
});

describe("chart span parity (Fava _date_first / _date_last)", () => {
  it("ignores commodity/open/price directives dated before the first transaction", () => {
    // Fava's FilteredLedger derives date_first from the first *Transaction* only —
    // a `2009-05-01 commodity RGAGX` (or a 1980 open, or an old seed price) must
    // NOT drag the axis back and generate ~15 years of empty buckets.
    const withOldSeed: DirectiveJson[] = [
      {
        type: "commodity",
        date: "2009-05-01",
        currency: "RGAGX",
      } as DirectiveJson,
      {
        type: "open",
        date: "1980-05-12",
        account: "Assets:Cash",
        currencies: [],
      } as DirectiveJson,
      {
        type: "price",
        date: "2005-01-01",
        currency: "HOOL",
        amount: { number: "1", currency: "USD" },
      } as DirectiveJson,
      ...LEDGER,
    ];
    const rows = accountBalanceSeries(
      withOldSeed,
      "month",
      ["Assets"],
      "USD",
      usdMap,
    );
    // Exactly the two transaction months — the same as the bare LEDGER.
    expect(rows.map((r) => r.date)).toEqual(["2024-01-31", "2024-02-29"]);
  });

  it("extends the last date to include a trailing Price (Transaction|Price + 1 day)", () => {
    const withTrailingPrice: DirectiveJson[] = [
      ...LEDGER,
      {
        type: "price",
        date: "2024-03-10",
        currency: "HOOL",
        amount: { number: "5", currency: "USD" },
      } as DirectiveJson,
    ];
    const rows = accountBalanceSeries(
      withTrailingPrice,
      "month",
      ["Assets"],
      "USD",
      usdMap,
    );
    expect(rows.map((r) => r.date)).toEqual([
      "2024-01-31",
      "2024-02-29",
      "2024-03-31",
    ]);
  });
});
