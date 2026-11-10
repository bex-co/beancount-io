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

  it("answers empty holdings with complete valuation", () => {
    const result = composeHoldings({ ...base, rows: [] });
    expect(result.groups).toEqual([]);
    expect(result.valuation).toBe("complete");
    expect(result.totals).toEqual({ cost_basis: {}, market_value: {} });
  });
});
