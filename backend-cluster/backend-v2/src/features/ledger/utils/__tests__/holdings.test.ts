import { BadUserInputError } from "@/shared/errors";
import {
  composeHoldings,
  HOLDINGS_PRICES_QUERY,
  holdingsDetailQuery,
  resolveHoldingsConversion,
  valueHoldingRows,
} from "../holdings";

const COLUMNS = [
  "account",
  "currency",
  "cost_currency",
  "units",
  "book_value",
  "market_value",
  "price",
  "conv_rate",
];

type Cell = string | number | boolean | null | Record<string, unknown>;

const row = (
  account: string,
  currency: string,
  held: string,
  units: Cell,
  book: Cell,
  market: Cell,
  price: Cell,
  rate: Cell = "",
): Cell[] => [account, currency, held, units, book, market, price, rate];

const map = (currency: string, number: string): Record<string, string> => ({
  [currency]: number,
});

const base = {
  columns: COLUMNS,
  groupBy: "account" as const,
  account: undefined,
  roots: ["Assets", "Liabilities", "Equity", "Income", "Expenses"],
  positionRoots: ["Assets", "Liabilities"],
  conversionTarget: null,
  asOf: "2026-10-25",
};

describe("holdingsDetailQuery", () => {
  it("asks the engine for units and cost only, never for a price", () => {
    const query = holdingsDetailQuery();
    expect(query).toContain("units(sum(position)) AS units");
    expect(query).toContain("cost(sum(position)) AS book_value");
    expect(query).toContain("GROUP BY account, currency, cost_currency");
    // The engine's value() and getprice() include prices implied by `@`
    // annotations, which no statement uses (w1/229).
    expect(query).not.toMatch(/value\(|getprice|conv_rate/);
  });

  it("reads the price directives from the prices table", () => {
    expect(HOLDINGS_PRICES_QUERY).toBe(
      "SELECT date, currency, amount FROM prices ORDER BY date",
    );
  });
});

describe("valueHoldingRows", () => {
  const DETAIL = [
    "account",
    "currency",
    "cost_currency",
    "units",
    "book_value",
  ];
  const qax = (units = "6", basis = "74.04"): Cell[] => [
    "Assets:Broker",
    "QAX",
    "USD",
    map("QAX", units),
    map("USD", basis),
  ];
  const value = (
    prices: Cell[][],
    rows: Cell[][] = [qax()],
    conversionTarget: string | null = null,
  ) =>
    valueHoldingRows({
      columns: DETAIL,
      rows,
      prices,
      conversionTarget,
      asOf: "2026-10-25",
    });
  /** The three columns it adds: market value, quote, conversion rate. */
  const added = (valued: ReturnType<typeof value>) =>
    valued.rows[0]!.slice(DETAIL.length);

  it("values at the latest directive on or before the day", () => {
    const valued = value([
      ["2026-09-01", "QAX", map("USD", "15.00")],
      ["2026-10-25", "QAX", map("USD", "16.00")],
      ["2026-11-30", "QAX", map("USD", "99.00")],
    ]);
    expect(valued.columns.slice(DETAIL.length)).toEqual([
      "market_value",
      "price",
      "conv_rate",
    ]);
    expect(added(valued)).toEqual([map("USD", "96"), "16", ""]);
  });

  it("takes the later of two directives on one day", () => {
    const valued = value([
      ["2026-10-01", "QAX", map("USD", "15.00")],
      ["2026-10-01", "QAX", map("USD", "17.00")],
    ]);
    expect(added(valued)).toEqual([map("USD", "102"), "17", ""]);
  });

  it("uses a pair's inverse when only the other direction is quoted", () => {
    const valued = value([["2026-10-01", "USD", map("QAX", "0.0625")]]);
    expect(added(valued)).toEqual([map("USD", "96"), "16", ""]);
  });

  // w1/229: the sale was `-4 QAX {12.34 USD} @ 15.00 USD`. The engine derives a
  // price from it; stock beancount and the statements have none.
  it("values a lot with no directive at cost, with no quote", () => {
    expect(added(value([]))).toEqual([map("USD", "74.04"), "", ""]);
  });

  it("quotes the conversion leg from the held currency to the target", () => {
    const valued = value(
      [
        ["2026-10-01", "QAX", map("USD", "16.00")],
        ["2026-10-01", "USD", map("EUR", "0.92")],
      ],
      [qax()],
      "EUR",
    );
    expect(added(valued)).toEqual([map("USD", "96"), "16", "0.92"]);
  });

  it("asks for no rate when the target is the held currency, or none is set", () => {
    const prices: Cell[][] = [["2026-10-01", "QAX", map("USD", "16.00")]];
    expect(added(value(prices, [qax()], "USD"))[2]).toBe("");
    expect(added(value(prices, [qax()], null))[2]).toBe("");
  });

  it("leaves a row it cannot read for the composer to skip", () => {
    const valued = value([], [["Assets:Broker", "QAX", "USD", "", ""]]);
    expect(added(valued)).toEqual(["", "", ""]);
  });
});

describe("resolveHoldingsConversion", () => {
  it("uses one operating currency, else holds per-group currency", () => {
    expect(resolveHoldingsConversion(undefined, ["USD"])).toBe("USD");
    expect(resolveHoldingsConversion(undefined, [])).toBeNull();
    expect(resolveHoldingsConversion(undefined, ["USD", "EUR"])).toBeNull();
  });

  it("takes an explicit currency and `units` for none", () => {
    expect(resolveHoldingsConversion("EUR", ["USD"])).toBe("EUR");
    expect(resolveHoldingsConversion("units", ["USD"])).toBeNull();
    expect(resolveHoldingsConversion("UNITS", ["USD"])).toBeNull();
  });

  it("refuses a value that cannot be quoted into BQL", () => {
    expect(() => resolveHoldingsConversion('USD" OR 1=1 --', ["USD"])).toThrow(
      BadUserInputError,
    );
    expect(() => resolveHoldingsConversion("at_cost", ["USD"])).toThrow(
      BadUserInputError,
    );
  });
});

describe("composeHoldings", () => {
  const aapl = row(
    "Assets:Broker:AAPL",
    "AAPL",
    "USD",
    map("AAPL", "10"),
    map("USD", "1500.00"),
    map("USD", "1750.00"),
    175,
  );

  it("groups one account's lots with average cost and totals", () => {
    const result = composeHoldings({ ...base, rows: [aapl] });
    expect(result.group_by).toBe("account");
    expect(result.valuation).toBe("complete");
    expect(result.as_of).toBe("2026-10-25");
    expect(result.groups).toEqual([
      {
        account: "Assets:Broker:AAPL",
        commodity: "AAPL",
        units: { number: "10", currency: "AAPL" },
        average_cost: { number: "150", currency: "USD" },
        cost_basis: { number: "1500", currency: "USD" },
        market_value: { number: "1750", currency: "USD" },
        price: { number: "175", currency: "USD" },
      },
    ]);
    expect(result.totals).toEqual({
      cost_basis: { USD: "1500" },
      market_value: { USD: "1750" },
    });
  });

  it("merges accounts under commodity grouping, keeping the account list", () => {
    const other = row(
      "Assets:IRA:AAPL",
      "AAPL",
      "USD",
      map("AAPL", "5"),
      map("USD", "1000.00"),
      map("USD", "875.00"),
      175,
    );
    const result = composeHoldings({
      ...base,
      groupBy: "commodity",
      rows: [aapl, other],
    });
    expect(result.groups).toEqual([
      {
        accounts: ["Assets:Broker:AAPL", "Assets:IRA:AAPL"],
        commodity: "AAPL",
        units: { number: "15", currency: "AAPL" },
        average_cost: { number: "166.66666666666666666667", currency: "USD" },
        cost_basis: { number: "2500", currency: "USD" },
        market_value: { number: "2625", currency: "USD" },
        price: { number: "175", currency: "USD" },
      },
    ]);
  });

  it("leaves out cash, sold lots, and other accounts", () => {
    const cash = row(
      "Assets:Bank:Checking",
      "USD",
      "",
      map("USD", "500"),
      {},
      {},
      "",
    );
    const sold = row(
      "Assets:Broker:ACME",
      "ACME",
      "USD",
      {},
      map("USD", "0"),
      map("USD", "0"),
      10,
    );
    const result = composeHoldings({
      ...base,
      account: "Assets:Broker",
      rows: [aapl, cash, sold],
    });
    expect(result.groups.map((group) => group.account)).toEqual([
      "Assets:Broker:AAPL",
    ]);
  });

  it("anchors an account pattern away from prefix siblings", () => {
    const sibling = row(
      "Assets:Broker2:AAPL",
      "AAPL",
      "USD",
      map("AAPL", "7"),
      map("USD", "700.00"),
      map("USD", "700.00"),
      "",
    );
    const result = composeHoldings({
      ...base,
      account: "Assets:Broker",
      rows: [aapl, sibling],
    });
    expect(result.groups.map((group) => group.account)).toEqual([
      "Assets:Broker:AAPL",
    ]);
  });

  it("values a quoteless group at cost and names the missing leg", () => {
    const unquoted = row(
      "Assets:Broker:PRIVATE",
      "PRIVATE",
      "USD",
      map("PRIVATE", "100"),
      map("USD", "1000.00"),
      map("USD", "1000.00"),
      "",
    );
    const result = composeHoldings({ ...base, rows: [unquoted] });
    expect(result.valuation).toBe("partial");
    expect(result.missing_prices).toEqual([{ from: "PRIVATE", to: "USD" }]);
    expect(result.missing_price_summary).toEqual([
      "PRIVATE has no USD quote at 2026-10-25; valued at cost",
    ]);
    expect(result.groups[0]!.market_value).toEqual({
      number: "1000",
      currency: "USD",
    });
    expect(result.groups[0]!.price).toBeNull();
  });

  it("orders several missing legs by pair, not by first sighting", () => {
    const zebra = row(
      "Assets:Broker:ZEBRA",
      "ZEBRA",
      "USD",
      map("ZEBRA", "5"),
      map("USD", "500.00"),
      map("USD", "500.00"),
      "",
    );
    const aapl = row(
      "Assets:Broker:AAPL",
      "AAPL",
      "USD",
      map("AAPL", "10"),
      map("USD", "1500.00"),
      map("USD", "1500.00"),
      "",
    );
    const result = composeHoldings({ ...base, rows: [zebra, aapl] });
    expect(result.valuation).toBe("partial");
    expect(result.missing_prices).toEqual([
      { from: "AAPL", to: "USD" },
      { from: "ZEBRA", to: "USD" },
    ]);
    expect(result.missing_price_summary).toEqual([
      "AAPL has no USD quote at 2026-10-25; valued at cost",
      "ZEBRA has no USD quote at 2026-10-25; valued at cost",
    ]);
  });

  it("converts money columns through the quoted leg", () => {
    const rated = row(
      "Assets:Broker:AAPL",
      "AAPL",
      "USD",
      map("AAPL", "10"),
      map("USD", "1500.00"),
      map("USD", "1750.00"),
      175,
      0.92,
    );
    const result = composeHoldings({
      ...base,
      conversionTarget: "EUR",
      rows: [rated],
    });
    expect(result.valuation).toBe("complete");
    expect(result.groups[0]).toMatchObject({
      commodity: "AAPL",
      units: { number: "10", currency: "AAPL" },
      average_cost: { number: "138", currency: "EUR" },
      cost_basis: { number: "1380", currency: "EUR" },
      market_value: { number: "1610", currency: "EUR" },
      price: { number: "161", currency: "EUR" },
    });
    expect(result.totals.market_value).toEqual({ EUR: "1610" });
  });

  it("keeps held currency when the conversion leg has no quote", () => {
    const unrated = row(
      "Assets:Broker:AAPL",
      "AAPL",
      "USD",
      map("AAPL", "10"),
      map("USD", "1500.00"),
      map("USD", "1750.00"),
      175,
      "",
    );
    const result = composeHoldings({
      ...base,
      conversionTarget: "EUR",
      rows: [unrated],
    });
    expect(result.valuation).toBe("partial");
    expect(result.missing_prices).toEqual([{ from: "USD", to: "EUR" }]);
    expect(result.groups[0]!.market_value).toEqual({
      number: "1750",
      currency: "USD",
    });
  });

  it("skips a conversion leg to the held currency itself", () => {
    const result = composeHoldings({
      ...base,
      conversionTarget: "USD",
      rows: [aapl],
    });
    expect(result.valuation).toBe("complete");
    expect(result.groups[0]!.cost_basis).toEqual({
      number: "1500",
      currency: "USD",
    });
  });

  // w1/253: the repro ledger's detail rows; uncosted rows have no cost
  // currency and a book value in their own units.
  describe("uncosted positions", () => {
    const fixture: Cell[][] = [
      ["Assets:Bank", "USD", null, map("USD", "8250"), map("USD", "8250")],
      ["Assets:Mixed", "AAPL", null, map("AAPL", "2"), map("AAPL", "2")],
      ["Assets:Mixed", "AAPL", "USD", map("AAPL", "5"), map("USD", "750")],
      ["Assets:Plain", "AAPL", null, map("AAPL", "3"), map("AAPL", "3")],
      [
        "Equity:Opening",
        "USD",
        null,
        map("USD", "-10000"),
        map("USD", "-10000"),
      ],
    ];
    const quotes: Cell[][] = [["2024-03-01", "AAPL", map("USD", "170")]];
    const compose = (
      overrides: Partial<Parameters<typeof composeHoldings>[0]> = {},
      rows: Cell[][] = fixture,
      prices: Cell[][] = quotes,
    ) => {
      const valued = valueHoldingRows({
        columns: COLUMNS.slice(0, 5),
        rows,
        prices,
        conversionTarget: overrides.conversionTarget ?? null,
        asOf: "2026-10-25",
      });
      return composeHoldings({
        ...base,
        ...valued,
        prices,
        priceCurrencies: [[null], ["USD"]],
        operatingCurrencies: ["USD"],
        ...overrides,
      });
    };

    it("keeps priced shares as holdings with an unknown basis", () => {
      const result = compose();
      expect(
        result.groups.map((group) => [
          group.account,
          group.units,
          group.market_value,
          group.cost_basis,
          group.average_cost,
        ]),
      ).toEqual([
        [
          "Assets:Mixed",
          { number: "7", currency: "AAPL" },
          { number: "1190", currency: "USD" },
          null,
          null,
        ],
        [
          "Assets:Plain",
          { number: "3", currency: "AAPL" },
          { number: "510", currency: "USD" },
          null,
          null,
        ],
      ]);
      expect(result.groups[1]!.price).toEqual({
        number: "170",
        currency: "USD",
      });
      expect(result.totals).toEqual({
        cost_basis: {},
        market_value: { USD: "1700" },
      });
      expect(result.cost_basis_complete).toBe(false);
      expect(result.valuation).toBe("complete");
    });

    it("lists an account that holds only priced shares", () => {
      const result = compose({ account: "Assets:Plain" });
      expect(result.groups.map((group) => group.units.number)).toEqual(["3"]);
    });

    it("merges costed and priced units by commodity", () => {
      const result = compose({ groupBy: "commodity" });
      expect(result.groups).toHaveLength(1);
      expect(result.groups[0]).toMatchObject({
        accounts: ["Assets:Mixed", "Assets:Plain"],
        units: { number: "10", currency: "AAPL" },
        market_value: { number: "1700", currency: "USD" },
        cost_basis: null,
      });
    });

    // w1/266: an uncosted position no quote values stays in its units, so
    // its missing leg must not claim a cost-basis value.
    it("says an unquoted uncosted position is shown in units", () => {
      const result = compose(
        {},
        [
          ["Assets:Broker", "AAPL", "USD", map("AAPL", "2"), map("USD", "200")],
          [
            "Assets:Vacation",
            "VACHR",
            null,
            map("VACHR", "10"),
            map("VACHR", "10"),
          ],
        ],
        [],
      );
      expect(result.groups[1]!.market_value).toEqual({
        number: "10",
        currency: "VACHR",
      });
      expect(result.missing_price_summary).toEqual([
        "AAPL has no USD quote at 2026-10-25; valued at cost",
        "VACHR has no USD quote at 2026-10-25; shown in units",
      ]);
    });

    it("names both treatments when one leg covers costed and uncosted units", () => {
      const result = compose({}, fixture, []);
      expect(result.missing_price_summary).toEqual([
        "AAPL has no USD quote at 2026-10-25; costed lots valued at cost, the rest shown in units",
      ]);
    });

    it("leaves uncosted cash in an operating currency out", () => {
      const result = compose(
        { operatingCurrencies: ["USD", "EUR"], priceCurrencies: [] },
        [
          ["Assets:Bank", "USD", null, map("USD", "800"), map("USD", "800")],
          ["Assets:Euro", "EUR", null, map("EUR", "500"), map("EUR", "500")],
          ["Assets:Broker", "HOOL", "USD", map("HOOL", "2"), map("USD", "200")],
        ],
        [["2024-01-31", "HOOL", map("USD", "120")]],
      );
      expect(result.groups.map((group) => group.commodity)).toEqual(["HOOL"]);
      expect(result.cost_basis_complete).toBe(true);
    });

    // w1/255: being quoted in does not make a commodity money. BTC that ETH
    // is priced in, or a posting price is in, stays a holding in a USD
    // ledger; EUR that a lot is costed in stays cash.
    const crypto: Cell[][] = [
      ["Assets:Bank", "USD", null, map("USD", "60000"), map("USD", "60000")],
      ["Assets:Crypto", "BTC", null, map("BTC", "1"), map("BTC", "1")],
      ["Assets:Crypto", "ALT", "USD", map("ALT", "10"), map("USD", "500")],
      ["Assets:Euro", "EUR", null, map("EUR", "300"), map("EUR", "300")],
      ["Assets:Broker", "HOOL", "EUR", map("HOOL", "2"), map("EUR", "200")],
    ];
    const cryptoQuotes: Cell[][] = [
      ["2024-03-01", "BTC", map("USD", "50000")],
      ["2024-03-01", "ETH", map("BTC", "0.05")],
    ];

    it("keeps a currency others are quoted in as a holding", () => {
      const result = compose(
        { priceCurrencies: [["USD"], ["BTC"]] },
        crypto,
        cryptoQuotes,
      );
      expect(result.groups.map((group) => group.commodity)).toEqual([
        "HOOL",
        "ALT",
        "BTC",
      ]);
      const btc = result.groups.find((group) => group.commodity === "BTC");
      expect(btc).toMatchObject({
        account: "Assets:Crypto",
        units: { number: "1", currency: "BTC" },
        market_value: { number: "50000", currency: "USD" },
        cost_basis: null,
      });
      expect(result.cost_basis_complete).toBe(false);
    });

    it("falls back to quote currencies as cash with no operating currency", () => {
      const result = compose(
        { operatingCurrencies: [], priceCurrencies: [["USD"], ["BTC"]] },
        crypto,
        cryptoQuotes,
      );
      expect(result.groups.map((group) => group.commodity)).toEqual([
        "HOOL",
        "ALT",
      ]);
    });

    // w1/256: only balance-sheet accounts hold positions. A priced expense
    // in a foreign currency is a flow; the same EUR in Assets is a holding.
    const flows: Cell[][] = [
      ["Assets:Bank", "USD", null, map("USD", "1830"), map("USD", "1830")],
      ["Assets:Wallet", "EUR", null, map("EUR", "50"), map("EUR", "50")],
      [
        "Liabilities:Loan",
        "BTC",
        null,
        map("BTC", "-0.02"),
        map("BTC", "-0.02"),
      ],
      ["Expenses:Travel", "EUR", null, map("EUR", "100"), map("EUR", "100")],
      ["Income:Refund", "GBP", null, map("GBP", "-20"), map("GBP", "-20")],
      ["Equity:Opening", "USD", null, map("USD", "-1000"), map("USD", "-1000")],
    ];
    const flowQuotes: Cell[][] = [
      ["2024-03-01", "EUR", map("USD", "1.2")],
      ["2024-03-01", "GBP", map("USD", "1.3")],
      ["2024-03-01", "BTC", map("USD", "50000")],
    ];

    it.each(["account", "commodity"] as const)(
      "leaves uncosted flow balances out of %s holdings",
      (groupBy) => {
        const result = compose({ groupBy }, flows, flowQuotes);
        expect(
          result.groups
            .map((group) => [
              group.account ?? group.accounts?.[0],
              group.units.number,
              group.units.currency,
            ])
            .sort(),
        ).toEqual([
          ["Assets:Wallet", "50", "EUR"],
          ["Liabilities:Loan", "-0.02", "BTC"],
        ]);
        expect(result.totals.market_value).toEqual({ USD: "-940" });
      },
    );

    it("lists no holdings under an expense account filter", () => {
      const result = compose({ account: "Expenses:Travel" }, flows, flowQuotes);
      expect(result.groups).toEqual([]);
    });

    it("reads renamed balance-sheet roots", () => {
      const result = compose(
        {
          roots: ["Activos", "Pasivos", "Capital", "Ingresos", "Gastos"],
          positionRoots: ["Activos", "Pasivos"],
        },
        [
          ["Activos:Cartera", "EUR", null, map("EUR", "50"), map("EUR", "50")],
          ["Gastos:Viaje", "EUR", null, map("EUR", "100"), map("EUR", "100")],
        ],
        flowQuotes,
      );
      expect(result.groups.map((group) => group.account)).toEqual([
        "Activos:Cartera",
      ]);
    });

    it("names the missing leg of an unquoted priced lot and keeps its units", () => {
      const result = compose({}, [fixture[3]!], []);
      expect(result.valuation).toBe("partial");
      expect(result.missing_prices).toEqual([{ from: "AAPL", to: "USD" }]);
      expect(result.groups[0]!.market_value).toEqual({
        number: "3",
        currency: "AAPL",
      });
    });

    it("converts a priced lot through the quoted leg", () => {
      const result = compose(
        { conversionTarget: "EUR" },
        [fixture[3]!],
        [...quotes, ["2024-03-01", "USD", map("EUR", "0.5")]],
      );
      expect(result.groups[0]).toMatchObject({
        market_value: { number: "255", currency: "EUR" },
        price: { number: "85", currency: "EUR" },
      });
    });
  });

  // w1/288: 10 VT bought at 100 USD and 10 at 90 EUR. Valued into USD they
  // are one holding, as `bea report holdings` lists them; without a
  // conversion each cost currency keeps its own group.
  describe("lots costed in two currencies", () => {
    const lots = (eurAccount = "Assets:BrokerA"): Cell[][] => {
      const usd = [
        "Assets:BrokerA",
        "VT",
        "USD",
        map("VT", "10"),
        map("USD", "1000"),
      ];
      const eur = [eurAccount, "VT", "EUR", map("VT", "10"), map("EUR", "900")];
      // In the detail query's order: account, currency, cost currency.
      return eurAccount === "Assets:BrokerA" ? [eur, usd] : [usd, eur];
    };
    const consistent: Cell[][] = [
      ["2024-03-01", "VT", map("USD", "110")],
      ["2024-03-01", "VT", map("EUR", "100")],
      ["2024-03-01", "EUR", map("USD", "1.1")],
    ];
    const compose = (
      conversionTarget: string | null,
      groupBy: "account" | "commodity",
      rows: Cell[][],
      prices: Cell[][] = consistent,
    ) =>
      composeHoldings({
        ...base,
        ...valueHoldingRows({
          columns: COLUMNS.slice(0, 5),
          rows,
          prices,
          conversionTarget,
          asOf: "2026-10-25",
        }),
        conversionTarget,
        groupBy,
        prices,
        operatingCurrencies: ["USD"],
      });

    it.each([
      ["account", lots(), { account: "Assets:BrokerA" }],
      [
        "commodity",
        lots("Assets:BrokerB"),
        { accounts: ["Assets:BrokerA", "Assets:BrokerB"] },
      ],
    ] as const)(
      "lists one %s group under a conversion",
      (groupBy, rows, scope) => {
        const result = compose("USD", groupBy, [...rows]);
        expect(result.groups).toEqual([
          {
            ...scope,
            commodity: "VT",
            units: { number: "20", currency: "VT" },
            average_cost: { number: "99.5", currency: "USD" },
            cost_basis: { number: "1990", currency: "USD" },
            market_value: { number: "2200", currency: "USD" },
            price: { number: "110", currency: "USD" },
          },
        ]);
        expect(result.valuation).toBe("complete");
      },
    );

    it("keeps one group per cost currency without a conversion", () => {
      const result = compose(null, "account", lots());
      expect(result.groups.map((group) => group.average_cost)).toEqual([
        { number: "90", currency: "EUR" },
        { number: "100", currency: "USD" },
      ]);
    });

    it("keeps a part's quote when the first part has none", () => {
      // The QA repro: no VT quote in EUR, so that lot is valued at cost
      // through its cost currency; the merged group still carries the USD
      // lot's quote instead of dropping it.
      const result = compose("USD", "account", lots(), [
        ["2024-03-01", "VT", map("USD", "110")],
        ["2024-03-01", "EUR", map("USD", "1.2")],
      ]);
      expect(result.groups).toHaveLength(1);
      expect(result.groups[0]).toMatchObject({
        units: { number: "20", currency: "VT" },
        cost_basis: { number: "2080", currency: "USD" },
        price: { number: "110", currency: "USD" },
      });
    });
  });

  it("answers empty holdings with complete valuation", () => {
    const result = composeHoldings({ ...base, rows: [] });
    expect(result.groups).toEqual([]);
    expect(result.valuation).toBe("complete");
    expect(result.totals).toEqual({ cost_basis: {}, market_value: {} });
  });
});
