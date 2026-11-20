import { BadUserInputError } from "@/shared/errors";
import { DirectiveType } from "@/foundation/fava";
import type { JournalTransactionPublic } from "@/foundation/fava";
import { composeGains, resolveGainsBounds } from "../gains";

const ROOTS = ["Assets", "Liabilities", "Equity", "Income", "Expenses"];

const txn = (
  date: string,
  postings: {
    account: string;
    number: string;
    currency?: string;
    cost?: {
      number: string;
      currency: string;
      date: string;
      label?: string | null;
    } | null;
    price?: { number: string; currency: string } | null;
  }[],
  extra: Partial<JournalTransactionPublic> = {},
): JournalTransactionPublic => ({
  date,
  entry_hash: `h-${date}`,
  directive_type: DirectiveType.Transaction,
  flag: "*",
  postings: postings.map((posting) => ({
    account: posting.account,
    units: { number: posting.number, currency: posting.currency ?? "HOOL" },
    cost: posting.cost === undefined ? null : posting.cost,
    price: posting.price === undefined ? null : posting.price,
  })),
  ...extra,
});

/** A purchase into `Assets:Broker` that opens the lot a later sale closes. */
const buy = (
  units: string,
  cost: { number: string; currency: string; date: string },
) =>
  txn(cost.date === "" ? "2022-01-01" : cost.date, [
    { account: "Assets:Broker", number: units, cost },
  ]);

const base = {
  window: null,
  account: undefined,
  roots: ROOTS,
  start: null as string | null,
  end: null as string | null,
};

describe("resolveGainsBounds", () => {
  it("passes open bounds through", () => {
    expect(resolveGainsBounds(undefined, undefined)).toEqual({
      start: null,
      end: null,
    });
    expect(resolveGainsBounds("2024-01-01", "2024-12-31")).toEqual({
      start: "2024-01-01",
      end: "2024-12-31",
    });
  });

  it.each([["2024-13-01"], ["2024-02-30"], ["2024-1-1"], ["yesterday"]])(
    "refuses a malformed bound %p",
    (value) => {
      expect(() => resolveGainsBounds(value, undefined)).toThrow(
        BadUserInputError,
      );
      expect(() => resolveGainsBounds(undefined, value)).toThrow(
        `Invalid to-date '${value}'. Use YYYY-MM-DD.`,
      );
    },
  );

  it("refuses a from-date after the to-date", () => {
    expect(() => resolveGainsBounds("2024-06-01", "2024-01-01")).toThrow(
      "from-date '2024-06-01' is after to-date '2024-01-01'.",
    );
  });
});

describe("composeGains", () => {
  const cost = { number: "100.00", currency: "USD", date: "2023-01-10" };
  const price = { number: "150.00", currency: "USD" };
  const sale = txn("2024-03-15", [
    { account: "Assets:Broker", number: "-10", cost, price },
    { account: "Assets:Checking", number: "1500.00" },
  ]);

  it("closes one lot per reducing posting with cost and price", () => {
    const result = composeGains({
      ...base,
      transactions: [sale, buy("10", cost)],
    });
    expect(result.rows).toEqual([
      {
        account: "Assets:Broker",
        commodity: "HOOL",
        acquired: "2023-01-10",
        sold: "2024-03-15",
        held_days: 430,
        long_held: true,
        quantity: { number: "10", currency: "HOOL" },
        proceeds: { number: "1500", currency: "USD" },
        basis: { number: "1000", currency: "USD" },
        gain: { number: "500", currency: "USD" },
      },
    ]);
    expect(result.totals).toEqual({
      one_year_or_less: {},
      more_than_one_year: { USD: "500" },
      holding_unknown: {},
    });
  });

  it("skips buys, costless lots, and priceless movements", () => {
    const bought = txn("2024-01-01", [
      {
        account: "Assets:Broker",
        number: "10",
        cost: { number: "100.00", currency: "USD", date: "2024-01-01" },
        price: { number: "100.00", currency: "USD" },
      },
    ]);
    const transfer = txn("2024-02-01", [
      {
        account: "Assets:Broker",
        number: "-5",
        cost: { number: "100.00", currency: "USD", date: "2024-01-01" },
      },
      { account: "Assets:IRA", number: "5" },
    ]);
    const cash = txn("2024-03-01", [
      { account: "Assets:Checking", number: "-50.00" },
    ]);
    const result = composeGains({
      ...base,
      transactions: [cash, transfer, bought],
    });
    expect(result.rows).toEqual([]);
    expect(result.totals).toEqual({
      one_year_or_less: {},
      more_than_one_year: {},
      holding_unknown: {},
    });
  });

  it("bounds sales inclusively and filters the posting account", () => {
    const early = txn("2024-01-31", [
      { account: "Assets:Broker", number: "-1", cost, price },
    ]);
    const late = txn("2024-02-01", [
      { account: "Assets:Broker", number: "-1", cost, price },
    ]);
    const bounded = composeGains({
      ...base,
      transactions: [late, early, buy("2", cost)],
      start: "2024-02-01",
      end: "2024-02-01",
    });
    expect(bounded.rows.map((row) => [row.sold, row.quantity.number])).toEqual([
      ["2024-02-01", "1"],
    ]);

    const filtered = composeGains({
      ...base,
      transactions: [sale, buy("10", cost)],
      account: "Assets:IRA",
    });
    expect(filtered.rows).toEqual([]);
  });

  it("buckets short, long, and unknown holdings without crossing currencies", () => {
    const usd = { number: "100.00", currency: "USD", date: "2024-01-01" };
    const eur = { number: "50.00", currency: "EUR", date: "" };
    const shortHeld = txn("2024-06-01", [
      {
        account: "Assets:Broker",
        number: "-1",
        cost: usd,
        price: { number: "90.00", currency: "USD" },
      },
    ]);
    const unknown = txn("2024-07-01", [
      {
        account: "Assets:Broker",
        number: "-2",
        cost: eur,
        price: { number: "60.00", currency: "EUR" },
      },
    ]);
    const result = composeGains({
      ...base,
      transactions: [unknown, shortHeld, buy("1", usd), buy("2", eur)],
    });
    expect(result.rows[0]!.long_held).toBe(false);
    expect(result.rows[1]).toMatchObject({ held_days: null, long_held: null });
    expect(result.totals).toEqual({
      one_year_or_less: { USD: "-10" },
      more_than_one_year: {},
      holding_unknown: { EUR: "20" },
    });
  });

  it("calls a lot long only after a calendar year, across 29 February", () => {
    // Each lot is held exactly one year, or one day past it; the 366-day
    // holdings span a leap day (w1/249).
    const lot = (acquired: string) => ({
      number: "100.00",
      currency: "USD",
      date: acquired,
    });
    const sell = (sold: string, acquired: string) =>
      txn(sold, [
        {
          account: "Assets:Broker",
          number: "-1",
          cost: lot(acquired),
          price: { number: "110.00", currency: "USD" },
        },
      ]);
    const result = composeGains({
      ...base,
      transactions: [
        sell("2025-03-01", "2024-02-29"),
        sell("2025-02-28", "2024-02-29"),
        sell("2024-03-01", "2023-03-01"),
        sell("2023-03-01", "2022-03-01"),
        buy("2", lot("2024-02-29")),
        buy("1", lot("2023-03-01")),
        buy("1", lot("2022-03-01")),
      ],
    });
    expect(result.rows.map((row) => [row.held_days, row.long_held])).toEqual([
      [365, false],
      [366, false],
      [365, false],
      [366, true],
    ]);
    expect(result.totals).toEqual({
      one_year_or_less: { USD: "30" },
      more_than_one_year: { USD: "10" },
      holding_unknown: {},
    });
  });

  it("orders oldest sale first", () => {
    const first = txn("2024-01-01", [
      { account: "Assets:Broker", number: "-1", cost, price },
    ]);
    const second = txn("2024-02-01", [
      { account: "Assets:Broker", number: "-1", cost, price },
    ]);
    const result = composeGains({
      ...base,
      transactions: [second, first, buy("2", cost)],
    });
    expect(result.rows.map((row) => row.sold)).toEqual([
      "2024-01-01",
      "2024-02-01",
    ]);
  });

  describe("reductions in either direction (w1/307)", () => {
    // The journal rows the ledger answers for w1/307's repro: a short
    // opened at 100 USD in a NONE-booked account, one unit covered.
    const lot = { number: "100", currency: "USD", date: "2026-01-02" };
    const openShort = txn("2026-01-02", [
      {
        account: "Assets:Broker",
        number: "-2",
        cost: lot,
        price: { number: "100", currency: "USD" },
      },
      { account: "Assets:Cash", number: "200", currency: "USD" },
    ]);
    const cover = (at: string) =>
      txn("2026-01-05", [
        {
          account: "Assets:Broker",
          number: "1",
          cost: lot,
          price: { number: at, currency: "USD" },
        },
        { account: "Assets:Cash", number: `-${at}`, currency: "USD" },
      ]);

    it.each([
      ["80", "20"],
      ["120", "-20"],
    ])(
      "reports a cover at %s USD as the one sale, gaining %s USD",
      (at, gain) => {
        const result = composeGains({
          ...base,
          transactions: [cover(at), openShort],
        });
        expect(result.rows).toEqual([
          {
            account: "Assets:Broker",
            commodity: "HOOL",
            acquired: "2026-01-02",
            sold: "2026-01-05",
            held_days: 3,
            long_held: false,
            quantity: { number: "1", currency: "HOOL" },
            proceeds: { number: "100", currency: "USD" },
            basis: { number: at, currency: "USD" },
            gain: { number: gain, currency: "USD" },
          },
        ]);
        expect(result.totals.one_year_or_less).toEqual({ USD: gain });
      },
    );

    it("realizes nothing when a short opens", () => {
      const result = composeGains({ ...base, transactions: [openShort] });
      expect(result.rows).toEqual([]);
      expect(result.totals.one_year_or_less).toEqual({});
    });

    it("reports a costed payable's settlements as their exchange loss", () => {
      const payable = { number: "1.20", currency: "USD", date: "2024-01-02" };
      const pay = (date: string, units: string, rate: string) =>
        txn(date, [
          {
            account: "Liabilities:Payable",
            number: units,
            currency: "EUR",
            cost: payable,
            price: { number: rate, currency: "USD" },
          },
        ]);
      const invoice = txn("2024-01-02", [
        {
          account: "Liabilities:Payable",
          number: "-100",
          currency: "EUR",
          cost: payable,
        },
      ]);
      const result = composeGains({
        ...base,
        // `@@ 52 USD` on 40 EUR reaches the journal as 1.3 per unit.
        transactions: [
          pay("2024-01-04", "40", "1.3"),
          pay("2024-01-03", "60", "1.25"),
          invoice,
        ],
      });
      expect(
        result.rows.map((row) => [
          row.quantity.number,
          row.proceeds.number,
          row.basis.number,
          row.gain.number,
        ]),
      ).toEqual([
        ["60", "72", "75", "-3"],
        ["40", "48", "52", "-4"],
      ]);
      expect(result.totals.one_year_or_less).toEqual({ USD: "-7" });
    });

    it("follows lots opened before the window, which narrows only the rows", () => {
      const result = composeGains({
        ...base,
        transactions: [cover("80"), openShort],
        window: new Set([cover("80").entry_hash]),
      });
      expect(result.rows.map((row) => [row.sold, row.gain.number])).toEqual([
        ["2026-01-05", "20"],
      ]);

      const before = composeGains({
        ...base,
        transactions: [cover("80"), openShort],
        window: new Set([openShort.entry_hash]),
      });
      expect(before.rows).toEqual([]);
    });

    it("closes no more than the lot held", () => {
      // A NONE-booked account sums a lot past zero: one unit held, three
      // sold, so one closes and the rest opens a short.
      const result = composeGains({
        ...base,
        transactions: [
          txn("2026-01-09", [
            {
              account: "Assets:Broker",
              number: "-3",
              cost: lot,
              price: { number: "110", currency: "USD" },
            },
          ]),
          buy("1", lot),
        ],
      });
      expect(
        result.rows.map((row) => [row.quantity.number, row.gain.number]),
      ).toEqual([["1", "10"]]);
    });

    it("keys a lot by its cost's value, not its spelling", () => {
      const result = composeGains({
        ...base,
        transactions: [
          txn("2026-01-09", [
            {
              account: "Assets:Broker",
              number: "-1",
              cost: { ...lot, number: "100.00" },
              price: { number: "110", currency: "USD" },
            },
          ]),
          buy("1", lot),
        ],
      });
      expect(result.rows.map((row) => row.gain.number)).toEqual(["10"]);
    });

    it("moves no lot for a transaction the engine could not book", () => {
      const unbooked = txn(
        "2026-01-09",
        [
          {
            account: "Assets:Broker",
            number: "-1",
            cost: lot,
            price: { number: "110", currency: "USD" },
          },
        ],
        { not_booked: true },
      );
      const result = composeGains({
        ...base,
        transactions: [unbooked, buy("1", lot)],
      });
      expect(result.rows).toEqual([]);
    });

    it("reports no sale priced in another currency than its cost", () => {
      const result = composeGains({
        ...base,
        transactions: [
          txn("2026-01-09", [
            {
              account: "Assets:Broker",
              number: "-1",
              cost: lot,
              price: { number: "110", currency: "EUR" },
            },
          ]),
          buy("1", lot),
        ],
      });
      expect(result.rows).toEqual([]);
    });
  });

  describe("reductions without a price (w1/308)", () => {
    const lot = { number: "150.00", currency: "USD", date: "2024-01-10" };
    const leg = (account: string, number: string, currency = "USD") => ({
      account,
      number,
      currency,
    });
    // The note's repro: a buy, an own-account transfer, a priced sale and
    // a sale to cash written without `@`, whose 150 USD gain was booked.
    const repro = [
      txn("2024-03-11", [
        { account: "Assets:Broker", number: "-5", currency: "AAPL", cost: lot },
        leg("Assets:Bank", "900.00"),
        leg("Income:Gains", "-150.00"),
      ]),
      txn("2024-03-10", [
        {
          account: "Assets:Broker",
          number: "-3",
          currency: "AAPL",
          cost: lot,
          price: { number: "170.00", currency: "USD" },
        },
        leg("Assets:Bank", "510.00"),
        leg("Income:Gains", "-60.00"),
      ]),
      txn("2024-02-01", [
        { account: "Assets:Broker", number: "-2", currency: "AAPL", cost: lot },
        { account: "Assets:Broker2", number: "2", currency: "AAPL", cost: lot },
      ]),
      txn("2024-01-10", [
        { account: "Assets:Broker", number: "10", currency: "AAPL", cost: lot },
        leg("Assets:Bank", "-1500.00"),
      ]),
    ];
    const UNPRICED = {
      date: "2024-03-11",
      entry_hash: "h-2024-03-11",
      account: "Assets:Broker",
      commodity: "AAPL",
      acquired: "2024-01-10",
      quantity: { number: "5", currency: "AAPL" },
      cost: { number: "150", currency: "USD" },
    };

    it("lists a sale without a price instead of dropping it, and keeps the priced total", () => {
      const result = composeGains({ ...base, transactions: repro });
      expect(result.rows.map((row) => [row.sold, row.gain])).toEqual([
        ["2024-03-10", { number: "60", currency: "USD" }],
      ]);
      expect(result.totals.one_year_or_less).toEqual({ USD: "60" });
      // The transfer takes AAPL back in within its transaction: not listed.
      expect(result.unpriced_reductions).toEqual([UNPRICED]);
    });

    it("lists it when it is the only reduction, so the report is not just empty", () => {
      const result = composeGains({
        ...base,
        transactions: repro,
        start: "2024-03-11",
      });
      expect(result.rows).toEqual([]);
      expect(result.unpriced_reductions).toEqual([UNPRICED]);
    });

    it("lists no split, which takes the commodity back in at a new cost", () => {
      const old = { number: "100", currency: "USD", date: "2024-01-02" };
      const result = composeGains({
        ...base,
        transactions: [
          txn("2024-02-01", [
            {
              account: "Assets:Broker",
              number: "-5",
              currency: "X",
              cost: old,
            },
            {
              account: "Assets:Broker",
              number: "10",
              currency: "X",
              cost: { number: "50", currency: "USD", date: "2024-01-02" },
            },
          ]),
          txn("2024-01-02", [
            { account: "Assets:Broker", number: "5", currency: "X", cost: old },
            leg("Assets:Bank", "-500"),
          ]),
        ],
      });
      expect(result.rows).toEqual([]);
      expect(result.unpriced_reductions).toEqual([]);
    });

    it("lists a short cover written without a price", () => {
      const short = { number: "60", currency: "USD", date: "2024-03-01" };
      const result = composeGains({
        ...base,
        transactions: [
          txn("2024-03-05", [
            {
              account: "Assets:Short",
              number: "2",
              currency: "X",
              cost: short,
            },
            leg("Assets:Bank", "-100"),
            leg("Income:Gains", "-20"),
          ]),
          txn("2024-03-01", [
            {
              account: "Assets:Short",
              number: "-2",
              currency: "X",
              cost: short,
            },
            leg("Assets:Bank", "120"),
          ]),
        ],
      });
      expect(result.rows).toEqual([]);
      expect(result.unpriced_reductions).toEqual([
        {
          date: "2024-03-05",
          entry_hash: "h-2024-03-05",
          account: "Assets:Short",
          commodity: "X",
          acquired: "2024-03-01",
          quantity: { number: "2", currency: "X" },
          cost: { number: "60", currency: "USD" },
        },
      ]);
    });

    it.each([
      ["a to-date before it", { end: "2024-03-10" }],
      ["a window without it", { window: new Set(["h-2024-03-10"]) }],
      ["another account", { account: "Assets:Broker2" }],
    ])("narrows the list like the rows under %s", (_, narrowing) => {
      const result = composeGains({
        ...base,
        ...narrowing,
        transactions: repro,
      });
      expect(result.unpriced_reductions).toEqual([]);
    });
  });

  describe("a NONE sale that names a cost but no lot date (w1/323)", () => {
    // The note's repro as the ledger's journal answers it: two lots bought
    // into a NONE-booked account, then `-5 ABC {100 USD} @ 200 USD`, whose
    // cost names no lot date (`""`; Beancount's own loader dates it on the
    // sale's day). Neither shape is a held lot's key.
    const lot = (number: string, date: string, label?: string) => ({
      number,
      currency: "USD",
      date,
      ...(label === undefined ? {} : { label }),
    });
    const bought = (number: string, date: string, label?: string) =>
      txn(date, [
        {
          account: "Assets:Broker",
          number: "10",
          currency: "ABC",
          cost: lot(number, date, label),
        },
        { account: "Assets:Cash", number: `-${Number(number) * 10}` },
      ]);
    const sell = (
      date: string,
      quantity: string,
      cost: { number: string; currency: string; date: string },
      price: string | null = "200",
    ) =>
      txn(date, [
        {
          account: "Assets:Broker",
          number: `-${quantity}`,
          currency: "ABC",
          cost,
          price: price === null ? null : { number: price, currency: "USD" },
        },
        { account: "Assets:Cash", number: `${Number(quantity) * 200}` },
        { account: "Income:Gains", number: "0" },
      ]);
    const lots = [bought("150", "2025-03-10"), bought("100", "2025-01-10")];
    const row = (fields: Record<string, unknown>) => ({
      account: "Assets:Broker",
      commodity: "ABC",
      sold: "2026-02-01",
      quantity: { number: "5", currency: "ABC" },
      proceeds: { number: "1000", currency: "USD" },
      ...fields,
    });

    it.each([
      ["no lot date, as the hosted engine answers it", ""],
      ["the sale's own date, as Beancount's loader books it", "2026-02-01"],
      ["the lot's date, the dated control", "2025-01-10"],
    ])("reports the named lot for a cost dated with %s", (_, date) => {
      const result = composeGains({
        ...base,
        transactions: [sell("2026-02-01", "5", lot("100", date)), ...lots],
      });
      expect(result.rows).toEqual([
        row({
          acquired: "2025-01-10",
          held_days: 387,
          long_held: true,
          basis: { number: "500", currency: "USD" },
          gain: { number: "500", currency: "USD" },
        }),
      ]);
      expect(result.totals).toEqual({
        one_year_or_less: {},
        more_than_one_year: { USD: "500" },
        holding_unknown: {},
      });
    });

    it("leaves the holding unknown for a sale at an average cost", () => {
      const result = composeGains({
        ...base,
        transactions: [sell("2026-02-01", "5", lot("125", "")), ...lots],
      });
      expect(result.rows).toEqual([
        row({
          acquired: null,
          held_days: null,
          long_held: null,
          basis: { number: "625", currency: "USD" },
          gain: { number: "375", currency: "USD" },
        }),
      ]);
      expect(result.totals.holding_unknown).toEqual({ USD: "375" });
    });

    it("closes the net holding, and no more, sale by sale", () => {
      // The second same-day sale shares the first's key, a lot on its own
      // side; the third outruns the 10 ABC left; the fourth finds the
      // account already short.
      const result = composeGains({
        ...base,
        transactions: [
          sell("2026-03-02", "5", lot("100", "")),
          sell("2026-03-01", "15", lot("150", "")),
          sell("2026-02-01", "5", lot("100", "")),
          sell("2026-02-01", "5", lot("100", "")),
          ...lots,
        ],
      });
      expect(
        result.rows.map((r) => [
          r.acquired,
          r.sold,
          r.quantity.number,
          r.gain.number,
        ]),
      ).toEqual([
        ["2025-01-10", "2026-02-01", "5", "500"],
        ["2025-01-10", "2026-02-01", "5", "500"],
        ["2025-03-10", "2026-03-01", "10", "500"],
      ]);
    });

    it("covers a short the cover names by cost alone", () => {
      const result = composeGains({
        ...base,
        transactions: [
          txn("2026-01-20", [
            {
              account: "Assets:Broker",
              number: "1",
              cost: lot("100", ""),
              price: { number: "80", currency: "USD" },
            },
          ]),
          txn("2026-01-02", [
            {
              account: "Assets:Broker",
              number: "-2",
              cost: lot("100", "2026-01-02"),
              price: { number: "100", currency: "USD" },
            },
          ]),
        ],
      });
      expect(result.rows).toEqual([
        {
          account: "Assets:Broker",
          commodity: "HOOL",
          acquired: "2026-01-02",
          sold: "2026-01-20",
          held_days: 18,
          long_held: false,
          quantity: { number: "1", currency: "HOOL" },
          proceeds: { number: "100", currency: "USD" },
          basis: { number: "80", currency: "USD" },
          gain: { number: "20", currency: "USD" },
        },
      ]);
    });

    it("names an unpriced sale instead of dropping it", () => {
      const result = composeGains({
        ...base,
        transactions: [sell("2026-02-01", "5", lot("100", ""), null), ...lots],
      });
      expect(result.rows).toEqual([]);
      expect(result.unpriced_reductions).toEqual([
        {
          date: "2026-02-01",
          entry_hash: "h-2026-02-01",
          account: "Assets:Broker",
          commodity: "ABC",
          acquired: "2025-01-10",
          quantity: { number: "5", currency: "ABC" },
          cost: { number: "100", currency: "USD" },
        },
      ]);
    });

    it.each([
      ["names a lot's label", "b", "2025-06-10"],
      ["matches two lots", undefined, null],
    ])("dates a sale whose cost %s", (_, label, acquired) => {
      const labelled = [
        bought("100", "2025-06-10", "b"),
        bought("100", "2025-01-10", "a"),
      ];
      const result = composeGains({
        ...base,
        transactions: [
          sell("2026-01-05", "5", lot("100", "", label)),
          ...labelled,
        ],
      });
      expect(result.rows.map((r) => [r.acquired, r.gain.number])).toEqual([
        [acquired, "500"],
      ]);
    });
  });
});
