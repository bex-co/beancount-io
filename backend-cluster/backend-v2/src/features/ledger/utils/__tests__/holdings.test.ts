import { BadUserInputError } from "@/shared/errors";
import {
  composeHoldings,
  holdingsDetailQuery,
  matchesHoldingsAccount,
  resolveHoldingsConversion,
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
  conversionTarget: null,
  asOf: "2026-10-25",
};

describe("holdingsDetailQuery", () => {
  it("selects the seven detail columns without a conversion leg", () => {
    const query = holdingsDetailQuery(null);
    expect(query).toContain("units(sum(position)) AS units");
    expect(query).toContain("cost(sum(position)) AS book_value");
    expect(query).toContain("value(sum(position), today()) AS market_value");
    expect(query).toContain(
      "first(getprice(currency, cost_currency, today())) AS price",
    );
    expect(query).not.toContain("conv_rate");
    expect(query).toContain("GROUP BY account, currency, cost_currency");
  });

  it("adds a quoted conversion leg for a validated target", () => {
    const query = holdingsDetailQuery("EUR");
    expect(query).toContain(
      'first(getprice(cost_currency, "EUR", today())) AS conv_rate',
    );
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

describe("matchesHoldingsAccount", () => {
  it("matches a parent account and its children only", () => {
    expect(matchesHoldingsAccount("Assets", "Assets:Broker:AAPL")).toBe(true);
    expect(matchesHoldingsAccount("Assets:Broker", "Assets:Broker:AAPL")).toBe(
      true,
    );
    expect(matchesHoldingsAccount("Assets:Broker", "Assets:Bank:Checking")).toBe(
      false,
    );
    // Not a parent, but the pattern is also tried as a regex — and matches.
    expect(matchesHoldingsAccount("Assets:Bro", "Assets:Broker:AAPL")).toBe(
      true,
    );
    expect(matchesHoldingsAccount("Assets:Bro$", "Assets:Broker:AAPL")).toBe(
      false,
    );
  });

  it("matches a case-insensitive regex", () => {
    expect(matchesHoldingsAccount("broker", "Assets:Broker:AAPL")).toBe(true);
    expect(matchesHoldingsAccount("Expenses:(Dining|Groceries)", "Expenses:Dining")).toBe(
      true,
    );
  });

  it("refuses an invalid regex as bad input", () => {
    expect(() => matchesHoldingsAccount("([", "Assets:Broker")).toThrow(
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
      currency: "USD" },
    );
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
