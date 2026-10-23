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

  // w21/888: a U-flagged transaction counts in the series, as it does in the
  // Accounts tab's tree (Fava leaves it out for its `unrealized` plugin).
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

  it("counts a U-flagged transaction in the cumulative balance", () => {
    const rows = accountBalanceSeries(
      unrealizedOnly,
      "month",
      ["Assets"],
      "USD",
      usdMap,
    );
    expect(rows.at(-1)?.balance).toEqual({ USD: "10" });
  });

  it("adds a same-interval U-flagged transaction to the realized ones", () => {
    const mixed: DirectiveJson[] = [...unrealizedOnly, ...LEDGER];
    const rows = accountBalanceSeries(
      mixed,
      "month",
      ["Assets"],
      "USD",
      usdMap,
    );
    expect(rows).toEqual([
      { date: "2024-01-31", balance: { USD: "1010" } },
      { date: "2024-02-29", balance: { USD: "3010" } },
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

describe("complete report intervals", () => {
  it.each([
    ["day", "2026-01-01", "2026-04-10", "2026-04-09", 99],
    ["day", "2026-01-01", "2026-04-11", "2026-04-10", 100],
    ["day", "2026-01-01", "2026-04-12", "2026-04-11", 101],
    ["daily", "2026-01-01", "2027-01-01", "2026-12-31", 365],
    ["month", "2016-01-01", "2027-01-01", "2026-12-31", 132],
  ] as const)(
    "returns every %s interval from %s to %s",
    (key, begin, end, last, count) => {
      const directives: DirectiveJson[] = [
        [begin, "100"],
        [last, "200"],
      ].map(([date, amount]) => ({
        type: "transaction",
        date,
        flag: "*",
        narration: "Income",
        tags: [],
        links: [],
        postings: [
          {
            account: "Assets:Checking",
            units: { number: amount, currency: "USD" },
          },
          {
            account: "Income:Salary",
            units: { number: `-${amount}`, currency: "USD" },
          },
        ],
      }));
      const rows = intervalTotals(directives, key, ["Income"], "USD", usdMap, {
        begin,
        end,
      });
      expect(rows).toHaveLength(count);
      expect(rows[0].date).toBe(key === "month" ? "2016-01-31" : begin);
      expect(rows.at(-1)?.date).toBe(last);
      expect(rows[0].balance).toEqual({ USD: "-100" });
      expect(
        rows.reduce((sum, row) => sum + Number(row.balance.USD ?? 0), 0),
      ).toBe(-300);
    },
  );
});

/**
 * w6/011. The quarter floor compared `m > boundary`, so a report whose first
 * activity fell in April, July, or October began a quarter early with an
 * empty bucket. Fava floors to the quarter containing the date.
 */
describe("quarter floor", () => {
  const quarterStart = (month: number) =>
    [1, 1, 1, 4, 4, 4, 7, 7, 7, 10, 10, 10][month - 1];
  const days = (month: number) =>
    [1, 15, new Date(Date.UTC(2024, month, 0)).getUTCDate()].map(
      (day) =>
        `2024-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    );

  it.each(["quarter", "quarterly"] as const)(
    "opens the %s containing every day of every month",
    (key) => {
      for (let month = 1; month <= 12; month += 1) {
        for (const date of days(month)) {
          // The chart span's end is exclusive: the last activity plus a day.
          const next = new Date(`${date}T00:00:00Z`);
          next.setUTCDate(next.getUTCDate() + 1);
          const [first] = intervalRanges(
            date,
            next.toISOString().slice(0, 10),
            key,
          );
          expect({ date, begin: first.begin }).toEqual({
            date,
            begin: `2024-${String(quarterStart(month)).padStart(2, "0")}-01`,
          });
        }
      }
    },
  );

  const rent = (date: string): DirectiveJson => ({
    type: "transaction",
    date,
    flag: "*",
    narration: "Rent",
    tags: [],
    links: [],
    postings: [
      { account: "Assets:Bank", units: { number: "2400", currency: "USD" } },
      {
        account: "Income:RealEstate:Rent",
        units: { number: "-2400", currency: "USD" },
      },
    ],
  });

  it("starts a default report in the quarter of its first activity", () => {
    const rows = intervalTotals(
      [rent("2024-04-01")],
      "quarter",
      ["Income"],
      "USD",
      usdMap,
    );
    expect(rows).toEqual([
      {
        date: "2024-06-30",
        balance: { USD: "-2400" },
        account_balances: { "Income:RealEstate:Rent": { USD: "-2400" } },
      },
    ]);
  });

  it("keeps an empty quarter inside the activity span", () => {
    const rows = intervalTotals(
      [rent("2024-04-01"), rent("2024-10-01")],
      "quarterly",
      ["Income"],
      "USD",
      usdMap,
    );
    expect(rows.map((row) => [row.date, row.balance])).toEqual([
      ["2024-06-30", { USD: "-2400" }],
      ["2024-09-30", {}],
      ["2024-12-31", { USD: "-2400" }],
    ]);
  });

  it("leaves an explicit window's boundaries alone", () => {
    const rows = intervalTotals(
      [rent("2024-04-01")],
      "quarter",
      ["Income"],
      "USD",
      usdMap,
      { begin: "2024-04-01", end: "2025-10-01" },
    );
    expect(rows[0].date).toBe("2024-06-30");
    expect(rows).toHaveLength(6);
  });

  it("starts the cumulative series in the same quarter", () => {
    const rows = accountBalanceSeries(
      [rent("2024-07-01")],
      "quarter",
      ["Assets"],
      "USD",
      usdMap,
    );
    expect(rows).toEqual([{ date: "2024-09-30", balance: { USD: "2400" } }]);
  });
});

/**
 * w6/012. Interval names were matched case-sensitively, so a capitalised
 * `Daily` or `Weekly` fell through to the monthly fallback and a month's 31
 * daily points came back as one aggregate. Fava lowercases the name first.
 */
describe("interval name case", () => {
  const ends = (key: string) =>
    intervalRanges("2024-02-10", "2025-03-05", key as IntervalKey).map(
      (range) => range.endInclusive,
    );
  const spellings = (name: string) => [
    name,
    name[0].toUpperCase() + name.slice(1),
    name.toUpperCase(),
    name
      .split("")
      .map((c, i) => (i % 2 ? c.toUpperCase() : c))
      .join(""),
  ];

  it.each([
    "year",
    "yearly",
    "quarter",
    "quarterly",
    "month",
    "monthly",
    "week",
    "weekly",
    "day",
    "daily",
  ])("groups %s the same in every letter case", (name) => {
    const expected = ends(name);
    for (const spelling of spellings(name))
      expect({ spelling, ends: ends(spelling) }).toEqual({
        spelling,
        ends: expected,
      });
  });

  it("still tells the five groupings apart", () => {
    expect(
      ["Yearly", "Quarterly", "Monthly", "Weekly", "Daily"].map(
        (key) => ends(key).length,
      ),
    ).toEqual([2, 5, 14, 57, 389]);
  });

  it.each(["fortnightly", "constructor", "toString", "__proto__"])(
    "falls back to monthly for the unknown name %s",
    (name) => {
      expect(ends(name)).toEqual(ends("month"));
    },
  );

  const spend = (date: string, amount: string): DirectiveJson => ({
    type: "transaction",
    date,
    flag: "*",
    narration: "Spend",
    tags: [],
    links: [],
    postings: [
      { account: "Expenses:Food", units: { number: amount, currency: "USD" } },
      {
        account: "Assets:Checking",
        units: { number: `-${amount}`, currency: "USD" },
      },
    ],
  });
  const may = [
    spend("2017-05-03", "10"),
    spend("2017-05-17", "20"),
    spend("2017-05-31", "30"),
  ];
  const window = { begin: "2017-05-01", end: "2017-06-01" };

  it.each([
    ["daily", "Daily", 31],
    ["weekly", "Weekly", 5],
  ] as const)(
    "reports %s and %s over May identically",
    (lower, title, count) => {
      const read = (key: string) =>
        intervalTotals(
          may,
          key as IntervalKey,
          ["Expenses"],
          "USD",
          usdMap,
          window,
        );
      const rows = read(lower);
      expect(rows).toHaveLength(count);
      expect(read(title)).toEqual(rows);
      expect(
        rows.reduce((sum, row) => sum + Number(row.balance.USD ?? 0), 0),
      ).toBe(60);
    },
  );
});
