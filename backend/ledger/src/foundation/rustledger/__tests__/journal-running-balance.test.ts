import type { DirectiveJson } from "@rustledger/wasm";
import {
  accountJournalItems,
  buildScaledPriceMap,
  type JournalConversion,
} from "../journal-running-balance";

/**
 * Golden validation for `accountJournalItems`.
 *
 * `DIRECTIVES` below is the *verbatim* `getDirectives()` JSON that the real
 * `@rustledger/wasm` engine produces for the sample ledger in `SAMPLE_SRC`
 * (captured via the `withLedger(files, entry, l => l.getDirectives())` pattern
 * from `scripts/verify-rustledger.ts`). `GOLDEN` is the change/balance output of
 * the *real* Python fava-slim `FavaLedger.account_journal` on the SAME source
 * (run through `beancount-ledger/.venv/bin/python`, formatted exactly like
 * `get_account_journal` in `server/app/api/journal.py`). Both sides therefore
 * describe the identical ledger, and we assert byte-equal change/balance maps.
 *
 *   SAMPLE_SRC:
 *     option "operating_currency" "USD"
 *     2024-01-01 open Assets:Checking USD
 *     2024-01-01 open Assets:Broker
 *     2024-01-01 open Income:Salary USD
 *     2024-01-01 open Expenses:Food USD
 *     2024-01-01 open Equity:Opening
 *     2024-01-05 * "Employer" "Salary"
 *       Assets:Checking   3000.00 USD
 *       Income:Salary    -3000.00 USD
 *     2024-01-10 * "Store" "Groceries"
 *       Assets:Checking    -50.00 USD
 *       Expenses:Food       50.00 USD
 *     2024-01-15 * "Broker" "Buy stock"
 *       Assets:Broker       10 HOOL {100.00 USD}
 *       Assets:Checking  -1000.00 USD
 *     2024-01-20 * "Broker" "Buy more"
 *       Assets:Broker        5 HOOL {110.00 USD}
 *       Assets:Checking   -550.00 USD
 *     2024-01-25 balance Assets:Checking 1400.00 USD
 */
const DIRECTIVES: DirectiveJson[] = [
  {
    type: "open",
    date: "2024-01-01",
    account: "Assets:Checking",
    currencies: ["USD"],
  },
  {
    type: "open",
    date: "2024-01-01",
    account: "Assets:Broker",
    currencies: [],
  },
  {
    type: "open",
    date: "2024-01-01",
    account: "Income:Salary",
    currencies: ["USD"],
  },
  {
    type: "open",
    date: "2024-01-01",
    account: "Expenses:Food",
    currencies: ["USD"],
  },
  {
    type: "open",
    date: "2024-01-01",
    account: "Equity:Opening",
    currencies: [],
  },
  {
    type: "transaction",
    date: "2024-01-05",
    flag: "*",
    payee: "Employer",
    narration: "Salary",
    tags: [],
    links: [],
    postings: [
      {
        account: "Assets:Checking",
        units: { number: "3000.00", currency: "USD" },
      },
      {
        account: "Income:Salary",
        units: { number: "-3000.00", currency: "USD" },
      },
    ],
  },
  {
    type: "transaction",
    date: "2024-01-10",
    flag: "*",
    payee: "Store",
    narration: "Groceries",
    tags: [],
    links: [],
    postings: [
      {
        account: "Assets:Checking",
        units: { number: "-50.00", currency: "USD" },
      },
      { account: "Expenses:Food", units: { number: "50.00", currency: "USD" } },
    ],
  },
  {
    type: "transaction",
    date: "2024-01-15",
    flag: "*",
    payee: "Broker",
    narration: "Buy stock",
    tags: [],
    links: [],
    postings: [
      {
        account: "Assets:Broker",
        units: { number: "10", currency: "HOOL" },
        cost: {
          number: { kind: "per_unit", value: "100.00" },
          currency: "USD",
          date: "2024-01-15",
        },
      },
      {
        account: "Assets:Checking",
        units: { number: "-1000.00", currency: "USD" },
      },
    ],
  },
  {
    type: "transaction",
    date: "2024-01-20",
    flag: "*",
    payee: "Broker",
    narration: "Buy more",
    tags: [],
    links: [],
    postings: [
      {
        account: "Assets:Broker",
        units: { number: "5", currency: "HOOL" },
        cost: {
          number: { kind: "per_unit", value: "110.00" },
          currency: "USD",
          date: "2024-01-20",
        },
      },
      {
        account: "Assets:Checking",
        units: { number: "-550.00", currency: "USD" },
      },
    ],
  },
  {
    type: "balance",
    date: "2024-01-25",
    account: "Assets:Checking",
    amount: { number: "1400.00", currency: "USD" },
  },
];

interface GoldenRow {
  type: string;
  date: string;
  change: Record<string, string>;
  balance: Record<string, string>;
}

/** Captured from the real Python fava-slim `account_journal` (see header). */
const GOLDEN: Record<string, GoldenRow[]> = {
  checking_units: [
    { type: "Open", date: "2024-01-01", change: {}, balance: {} },
    {
      type: "Transaction",
      date: "2024-01-05",
      change: { USD: "3000.00" },
      balance: { USD: "3000.00" },
    },
    {
      type: "Transaction",
      date: "2024-01-10",
      change: { USD: "-50.00" },
      balance: { USD: "2950.00" },
    },
    {
      type: "Transaction",
      date: "2024-01-15",
      change: { USD: "-1000.00" },
      balance: { USD: "1950.00" },
    },
    {
      type: "Transaction",
      date: "2024-01-20",
      change: { USD: "-550.00" },
      balance: { USD: "1400.00" },
    },
    {
      type: "Balance",
      date: "2024-01-25",
      change: {},
      balance: { USD: "1400.00" },
    },
  ],
  checking_at_cost: [
    { type: "Open", date: "2024-01-01", change: {}, balance: {} },
    {
      type: "Transaction",
      date: "2024-01-05",
      change: { USD: "3000.00" },
      balance: { USD: "3000.00" },
    },
    {
      type: "Transaction",
      date: "2024-01-10",
      change: { USD: "-50.00" },
      balance: { USD: "2950.00" },
    },
    {
      type: "Transaction",
      date: "2024-01-15",
      change: { USD: "-1000.00" },
      balance: { USD: "1950.00" },
    },
    {
      type: "Transaction",
      date: "2024-01-20",
      change: { USD: "-550.00" },
      balance: { USD: "1400.00" },
    },
    {
      type: "Balance",
      date: "2024-01-25",
      change: {},
      balance: { USD: "1400.00" },
    },
  ],
  broker_units: [
    { type: "Open", date: "2024-01-01", change: {}, balance: {} },
    {
      type: "Transaction",
      date: "2024-01-15",
      change: { HOOL: "10" },
      balance: { HOOL: "10" },
    },
    {
      type: "Transaction",
      date: "2024-01-20",
      change: { HOOL: "5" },
      balance: { HOOL: "15" },
    },
  ],
  broker_at_cost: [
    { type: "Open", date: "2024-01-01", change: {}, balance: {} },
    {
      type: "Transaction",
      date: "2024-01-15",
      change: { USD: "1000.00" },
      balance: { USD: "1000.00" },
    },
    {
      type: "Transaction",
      date: "2024-01-20",
      change: { USD: "550.00" },
      balance: { USD: "1550.00" },
    },
  ],
  assets_units_with_children: [
    { type: "Open", date: "2024-01-01", change: {}, balance: {} },
    { type: "Open", date: "2024-01-01", change: {}, balance: {} },
    {
      type: "Transaction",
      date: "2024-01-05",
      change: { USD: "3000.00" },
      balance: { USD: "3000.00" },
    },
    {
      type: "Transaction",
      date: "2024-01-10",
      change: { USD: "-50.00" },
      balance: { USD: "2950.00" },
    },
    {
      type: "Transaction",
      date: "2024-01-15",
      change: { HOOL: "10", USD: "-1000.00" },
      balance: { USD: "1950.00", HOOL: "10" },
    },
    {
      type: "Transaction",
      date: "2024-01-20",
      change: { HOOL: "5", USD: "-550.00" },
      balance: { USD: "1400.00", HOOL: "15" },
    },
    {
      type: "Balance",
      date: "2024-01-25",
      change: {},
      balance: { USD: "1400.00", HOOL: "15" },
    },
  ],
  assets_at_cost_with_children: [
    { type: "Open", date: "2024-01-01", change: {}, balance: {} },
    { type: "Open", date: "2024-01-01", change: {}, balance: {} },
    {
      type: "Transaction",
      date: "2024-01-05",
      change: { USD: "3000.00" },
      balance: { USD: "3000.00" },
    },
    {
      type: "Transaction",
      date: "2024-01-10",
      change: { USD: "-50.00" },
      balance: { USD: "2950.00" },
    },
    {
      type: "Transaction",
      date: "2024-01-15",
      change: {},
      balance: { USD: "2950.00" },
    },
    {
      type: "Transaction",
      date: "2024-01-20",
      change: {},
      balance: { USD: "2950.00" },
    },
    {
      type: "Balance",
      date: "2024-01-25",
      change: {},
      balance: { USD: "2950.00" },
    },
  ],
  assets_no_children: [],
};

interface Case {
  golden: keyof typeof GOLDEN;
  account: string;
  conversion: JournalConversion;
  withChildren: boolean;
}

const CASES: Case[] = [
  {
    golden: "checking_units",
    account: "Assets:Checking",
    conversion: "units",
    withChildren: false,
  },
  {
    golden: "checking_at_cost",
    account: "Assets:Checking",
    conversion: "at_cost",
    withChildren: false,
  },
  {
    golden: "broker_units",
    account: "Assets:Broker",
    conversion: "units",
    withChildren: false,
  },
  {
    golden: "broker_at_cost",
    account: "Assets:Broker",
    conversion: "at_cost",
    withChildren: false,
  },
  {
    golden: "assets_units_with_children",
    account: "Assets",
    conversion: "units",
    withChildren: true,
  },
  {
    golden: "assets_at_cost_with_children",
    account: "Assets",
    conversion: "at_cost",
    withChildren: true,
  },
  {
    golden: "assets_no_children",
    account: "Assets",
    conversion: "units",
    withChildren: false,
  },
];

describe("accountJournalItems — Fava parity for getAccountJournal", () => {
  CASES.forEach(({ golden, account, conversion, withChildren }) => {
    describe(`${golden} (account=${account}, conversion=${conversion}, withChildren=${withChildren})`, () => {
      const items = accountJournalItems(DIRECTIVES, account, {
        withChildren,
        conversion,
      });
      const expected = GOLDEN[golden];

      it("matches the Python golden change/balance maps", () => {
        expect(
          items.map((item) => ({ change: item.change, balance: item.balance })),
        ).toEqual(
          expected.map((row) => ({ change: row.change, balance: row.balance })),
        );
      });

      it("selects the same entries in the same (chronological) order", () => {
        expect(items.map((item) => item.entry.date)).toEqual(
          expected.map((row) => row.date),
        );
      });

      it("returns the raw DirectiveJson entry for downstream serialization", () => {
        items.forEach((item, index) => {
          expect(item.entry).toBe(DIRECTIVES.find((d) => d === item.entry));
          expect(item.entry.date).toBe(expected[index].date);
        });
      });
    });
  });

  it("defaults to at_cost + with_children (the endpoint defaults)", () => {
    const withDefaults = accountJournalItems(DIRECTIVES, "Assets");
    const explicit = accountJournalItems(DIRECTIVES, "Assets", {
      conversion: "at_cost",
      withChildren: true,
    });
    expect(withDefaults).toEqual(explicit);
  });

  it("drops net-zero currencies from a running balance (inventory pop semantics)", () => {
    // Buy then fully sell the same HOOL lot: the running units balance must
    // return to empty (no `HOOL: "0"` key), matching fava's `add` popping ZERO.
    const roundTrip: DirectiveJson[] = [
      {
        type: "transaction",
        date: "2024-02-01",
        flag: "*",
        narration: "buy",
        tags: [],
        links: [],
        postings: [
          {
            account: "Assets:Broker",
            units: { number: "10", currency: "HOOL" },
            cost: {
              number: { kind: "per_unit", value: "100.00" },
              currency: "USD",
              date: "2024-02-01",
            },
          },
        ],
      },
      {
        type: "transaction",
        date: "2024-02-02",
        flag: "*",
        narration: "sell",
        tags: [],
        links: [],
        postings: [
          {
            account: "Assets:Broker",
            units: { number: "-10", currency: "HOOL" },
            cost: {
              number: { kind: "per_unit", value: "100.00" },
              currency: "USD",
              date: "2024-02-01",
            },
          },
        ],
      },
    ];
    const items = accountJournalItems(roundTrip, "Assets:Broker", {
      conversion: "units",
      withChildren: false,
    });
    expect(items[1].balance).toEqual({});
    expect(items[1].change).toEqual({ HOOL: "-10" });
  });

  it("values a NEGATIVE-unit raw total cost by abs(units) (beancount CostSpec)", () => {
    // -10 HOOL {{1000.00 USD}}: beancount books per-unit = total / abs(units)
    // = Decimal('1000.00')/Decimal('10') = Decimal('100.00'), so at_cost values
    // the sale to -10 × 100.00 = -1000.00 USD — NOT +1000 (signed division).
    const sale: DirectiveJson[] = [
      {
        type: "transaction",
        date: "2024-02-01",
        flag: "*",
        narration: "short sale",
        tags: [],
        links: [],
        postings: [
          {
            account: "Assets:Broker",
            units: { number: "-10", currency: "HOOL" },
            cost: {
              number: { kind: "total", value: "1000.00" },
              currency: "USD",
            },
          },
          {
            account: "Assets:Checking",
            units: { number: "1000.00", currency: "USD" },
          },
        ],
      },
    ];
    const items = accountJournalItems(sale, "Assets:Broker", {
      conversion: "at_cost",
      withChildren: false,
    });
    expect(items).toHaveLength(1);
    // Scale mirrors Python Decimal: -10 × Decimal('100.00') == Decimal('-1000.00').
    expect(items[0].change).toEqual({ USD: "-1000.00" });
    expect(items[0].balance).toEqual({ USD: "-1000.00" });
  });

  it("keeps raw total and per-unit lots distinct by effective per-unit cost", () => {
    const directives: DirectiveJson[] = [
      {
        type: "transaction",
        date: "2024-01-01",
        flag: "*",
        narration: "per-unit lot",
        tags: [],
        links: [],
        postings: [
          {
            account: "Assets:Broker",
            units: { number: "10", currency: "HOOL" },
            cost: {
              number: { kind: "per_unit", value: "100" },
              currency: "USD",
            },
          },
        ],
      },
      {
        type: "transaction",
        date: "2024-01-02",
        flag: "*",
        narration: "total-cost lot",
        tags: [],
        links: [],
        postings: [
          {
            account: "Assets:Broker",
            units: { number: "10", currency: "HOOL" },
            cost: {
              number: { kind: "total", value: "100" },
              currency: "USD",
            },
          },
        ],
      },
    ];

    const items = accountJournalItems(directives, "Assets:Broker", {
      conversion: "at_cost",
      withChildren: false,
    });
    expect(items[1].change).toEqual({ USD: "100" });
    expect(items[1].balance).toEqual({ USD: "1100" });
  });

  it("does not add forty trailing zeroes for an exact inverse price", () => {
    const directives: DirectiveJson[] = [
      {
        type: "price",
        date: "2024-02-01",
        currency: "USD",
        amount: { number: "0.5", currency: "HOOL" },
      },
      {
        type: "transaction",
        date: "2024-02-01",
        flag: "*",
        narration: "inverse value",
        tags: [],
        links: [],
        postings: [
          {
            account: "Assets:Broker",
            units: { number: "10", currency: "HOOL" },
            cost: {
              number: { kind: "per_unit", value: "1" },
              currency: "USD",
              date: "2024-02-01",
            },
          },
        ],
      },
    ];
    const items = accountJournalItems(directives, "Assets:Broker", {
      conversion: "at_value",
      withChildren: false,
      prices: buildScaledPriceMap(directives),
    });
    expect(items[0].change).toEqual({ USD: "20" });
  });

  it("rounds inverse prices to Python Decimal's 28 significant digits", () => {
    const prices = buildScaledPriceMap([
      {
        type: "price",
        date: "2024-02-01",
        currency: "EUR",
        amount: { number: "30", currency: "USD" },
      },
    ]);
    expect(prices.getRate("USD", "EUR", "2024-02-01")?.value.toString()).toBe(
      "0.03333333333333333333333333333",
    );
  });

  it("converts an account journal to an explicit currency target", () => {
    const directives: DirectiveJson[] = [
      {
        type: "price",
        date: "2024-02-01",
        currency: "HOOL",
        amount: { number: "150.00", currency: "USD" },
      },
      {
        type: "transaction",
        date: "2024-02-01",
        flag: "*",
        narration: "buy",
        tags: [],
        links: [],
        postings: [
          {
            account: "Assets:Broker",
            units: { number: "2", currency: "HOOL" },
            cost: {
              number: { kind: "per_unit", value: "100.00" },
              currency: "USD",
            },
          },
        ],
      },
    ];
    const items = accountJournalItems(directives, "Assets:Broker", {
      conversion: "USD",
      withChildren: false,
      prices: buildScaledPriceMap(directives),
    });
    expect(items[0].change).toEqual({ USD: "300.00" });
    expect(items[0].balance).toEqual({ USD: "300.00" });
  });

  it("keeps raw units when a currency target has no market-price path", () => {
    const directives: DirectiveJson[] = [
      {
        type: "transaction",
        date: "2024-02-01",
        flag: "*",
        narration: "unpriced",
        tags: [],
        links: [],
        postings: [
          {
            account: "Assets:Broker",
            units: { number: "2", currency: "HOOL" },
            cost: {
              number: { kind: "per_unit", value: "100.00" },
              currency: "USD",
            },
          },
        ],
      },
    ];
    const items = accountJournalItems(directives, "Assets:Broker", {
      conversion: "USD",
      withChildren: false,
      prices: buildScaledPriceMap(directives),
    });
    expect(items[0].change).toEqual({ HOOL: "2" });
  });

  it("tries later currency targets only for amounts left unconverted", () => {
    const directives: DirectiveJson[] = [
      {
        type: "price",
        date: "2024-02-01",
        currency: "HOOL",
        amount: { number: "0.5", currency: "EUR" },
      },
      {
        type: "transaction",
        date: "2024-02-01",
        flag: "*",
        narration: "fallback target",
        tags: [],
        links: [],
        postings: [
          {
            account: "Assets:Broker",
            units: { number: "2", currency: "HOOL" },
          },
        ],
      },
    ];
    const items = accountJournalItems(directives, "Assets:Broker", {
      conversion: "USD,EUR",
      withChildren: false,
      prices: buildScaledPriceMap(directives),
    });
    expect(items[0].change).toEqual({ EUR: "1.0" });
  });

  it("drops a net-zero currency after a chained conversion", () => {
    const directives: DirectiveJson[] = [
      {
        type: "price",
        date: "2024-02-01",
        currency: "AAA",
        amount: { number: "1", currency: "EUR" },
      },
      {
        type: "price",
        date: "2024-02-01",
        currency: "BBB",
        amount: { number: "1", currency: "EUR" },
      },
      {
        type: "transaction",
        date: "2024-02-01",
        flag: "*",
        narration: "net zero after fallback",
        tags: [],
        links: [],
        postings: [
          {
            account: "Assets:Broker",
            units: { number: "1.00", currency: "AAA" },
          },
          {
            account: "Assets:Broker",
            units: { number: "-1.00", currency: "BBB" },
          },
        ],
      },
    ];
    const items = accountJournalItems(directives, "Assets:Broker", {
      conversion: "USD,EUR",
      withChildren: false,
      prices: buildScaledPriceMap(directives),
    });
    expect(items[0].change).toEqual({});
    expect(items[0].balance).toEqual({});
  });

  it("marks pad and its source account relevant with an empty change", () => {
    const withPad: DirectiveJson[] = [
      {
        type: "pad",
        date: "2024-03-01",
        account: "Assets:Cash",
        source_account: "Equity:Opening",
      },
    ];
    const forSource = accountJournalItems(withPad, "Equity:Opening", {
      withChildren: false,
    });
    expect(forSource).toHaveLength(1);
    expect(forSource[0].change).toEqual({});
    expect(forSource[0].balance).toEqual({});
  });
});
