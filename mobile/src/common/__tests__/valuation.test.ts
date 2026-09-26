import {
  balanceNotes,
  costBasisLine,
  latestPriceDate,
  selectValuation,
  isPriceStale,
  priceCadenceDays,
  stalePrices,
  valuationNotes,
  valuationStatus,
  valueBasisOf,
  type PricePair,
} from "../valuation";

/** Echoes the key and its params, so a note's wording and inputs are both visible. */
const t = (key: string, params?: Record<string, unknown>) =>
  params ? `${key}(${JSON.stringify(params)})` : key;

const pair = (base: string, quote: string, dates: string[]): PricePair => ({
  base,
  quote,
  prices: dates.map((date) => ({ date })),
});

/** `count` dates `step` days apart, ending on `last`. */
const series = (last: string, count: number, step: number): string[] => {
  const end = Date.parse(`${last}T00:00:00Z`);
  return Array.from({ length: count }, (_, index) =>
    new Date(end - (count - 1 - index) * step * 86400000)
      .toISOString()
      .slice(0, 10),
  );
};

// `open_ledger/example` as the API returned it on 2026-09-26: the latest
// net-worth point at market, at cost and in units, and its weekly price
// history, which stops on 2017-09-08.
const EXAMPLE_PRICES = ["GLD", "ITOT", "RGAGX", "VBMPX", "VEA", "VHT"].map(
  (fund) => pair(fund, "USD", series("2017-09-08", 12, 7)),
);
const EXAMPLE = {
  market: { USD: "117649.48828", VACHR: "-13" },
  cost: { USD: "106826.04944", VACHR: "-13" },
  units: {
    USD: "906.58",
    VACHR: "-13",
    VBMPX: "193.442",
    RGAGX: "597.748",
    VEA: "36",
    ITOT: "104",
    VHT: "64",
    GLD: "17",
  },
  currency: "USD",
  date: "2017-09-30",
  today: "2026-09-26",
  prices: EXAMPLE_PRICES,
};

describe("latestPriceDate", () => {
  const pairs = [
    pair("GLD", "USD", ["2017-09-01", "2017-09-08"]),
    pair("USD", "BTC", ["2026-09-20"]),
    pair("GLD", "EUR", ["2026-01-01"]),
  ];

  it("takes the latest price against the currency asked for", () => {
    expect(latestPriceDate(pairs, "GLD", "USD")).toBe("2017-09-08");
  });

  it("reads a pair quoted the other way round, as the ledger's price map does", () => {
    expect(latestPriceDate(pairs, "BTC", "USD")).toBe("2026-09-20");
  });

  it("ignores prices after the figure's date", () => {
    expect(latestPriceDate(pairs, "GLD", "USD", "2017-09-05")).toBe(
      "2017-09-01",
    );
    expect(latestPriceDate(pairs, "GLD", "USD", "2017-08-31")).toBe(null);
  });

  it("finds nothing for a commodity priced only in another currency", () => {
    expect(latestPriceDate(pairs, "VACHR", "USD")).toBe(null);
    expect(
      latestPriceDate([pair("GLD", "EUR", ["2026-01-01"])], "GLD", "USD"),
    ).toBe(null);
  });
});

describe("valueBasisOf", () => {
  it("reads market for a priced commodity and cost for an unpriced one", () => {
    const basisOf = valueBasisOf(EXAMPLE_PRICES, "USD");
    expect(basisOf("RGAGX")).toBe("market");
    expect(basisOf("STARTUP")).toBe("cost");
  });

  it("knows no basis while the prices are unknown", () => {
    expect(valueBasisOf(undefined, "USD")("RGAGX")).toBe(null);
  });
});

describe("selectValuation", () => {
  it("discloses the example ledger's net worth at market", () => {
    const valuation = selectValuation(EXAMPLE);
    expect(valuation.market).toBe(117649.48828);
    expect(valuation.cost).toBe(106826.04944);
    expect(valuation.unrealized?.toFixed(5)).toBe("10823.43884");
    expect(valuation.priced.map((holding) => holding.currency)).toEqual([
      "VBMPX",
      "RGAGX",
      "VEA",
      "ITOT",
      "VHT",
      "GLD",
    ]);
    expect(valuation.priced[0]).toEqual({
      currency: "VBMPX",
      number: 193.442,
      scale: 3,
      priceDate: "2017-09-08",
      // 22 days behind its own 2017-09-30 figure: more than three weekly gaps.
      stale: true,
      managed: false,
    });
    expect(valuation.atCostNoPrice).toEqual([]);
    expect(stalePrices(valuation).length).toBe(6);
    expect(valuation.notInTotal).toEqual([
      { currency: "VACHR", number: -13, scale: 0 },
    ]);
    expect(valuation.valuesHoldings).toBe(true);
  });

  it("names a holding with a cost but no price as valued at cost", () => {
    const valuation = selectValuation({
      ...EXAMPLE,
      market: { USD: "1010" },
      cost: { USD: "1010" },
      units: { USD: "10", STARTUP: "1000" },
    });
    expect(valuation.priced).toEqual([]);
    expect(valuation.atCostNoPrice).toEqual([
      { currency: "STARTUP", number: 1000, scale: 0 },
    ]);
    expect(stalePrices(valuation)).toEqual([]);
    expect(valuation.valuesHoldings).toBe(true);
  });

  it("leaves a holding with no cost out of the total, not valued", () => {
    const valuation = selectValuation({
      ...EXAMPLE,
      market: { USD: "5", VACHR: "-13" },
      cost: { USD: "5", VACHR: "-13" },
      units: { USD: "5", VACHR: "-13" },
    });
    expect(valuation.priced).toEqual([]);
    expect(valuation.atCostNoPrice).toEqual([]);
    expect(valuation.notInTotal).toEqual([
      { currency: "VACHR", number: -13, scale: 0 },
    ]);
    expect(valuation.valuesHoldings).toBe(false);
  });

  it("values nothing on a cash-only ledger", () => {
    const valuation = selectValuation({
      ...EXAMPLE,
      market: { USD: "100" },
      cost: { USD: "100" },
      units: { USD: "100" },
    });
    expect(valuation.valuesHoldings).toBe(false);
    expect(valuation.unrealized).toBe(0);
    expect(valuationNotes(valuation, t, "en")).toEqual([]);
    expect(costBasisLine(valuation, "USD", t)).toBe(null);
  });

  it("judges each holding by its own price date, not the oldest", () => {
    // crypto-example's shape: a daily managed BTC fresh at 9/26, and
    // hand-priced tokens last priced 9/15 on a roughly six-week cadence.
    const sparse = ["2026-06-23", "2026-08-04", "2026-09-15"];
    const valuation = selectValuation({
      market: { USD: "200" },
      cost: { USD: "210" },
      units: { BTC: "0.332", STETH: "1.04", WETH: "0.5" },
      currency: "USD",
      date: "2026-09-30",
      today: "2026-09-26",
      prices: [
        pair("BTC", "USD", series("2026-09-26", 30, 1)),
        pair("STETH", "USD", sparse),
        pair("WETH", "USD", sparse),
      ],
      managed: [{ commodity: "BTC", quote: "USD", freshness: "recent" }],
    });
    expect(
      valuation.priced.map(({ currency, priceDate, stale, managed }) => [
        currency,
        priceDate,
        stale,
        managed,
      ]),
    ).toEqual([
      ["BTC", "2026-09-26", false, true],
      ["STETH", "2026-09-15", false, false],
      ["WETH", "2026-09-15", false, false],
    ]);
    expect(valuationStatus(valuation, t, "en")).toBe("atMarketValue");
  });

  it("flags a daily-priced holding that stopped over a week ago", () => {
    const valuation = selectValuation({
      market: { USD: "300" },
      cost: { USD: "250" },
      units: { BTC: "0.001", SPY: "0.1", QQQ: "0.1" },
      currency: "USD",
      date: "2026-09-30",
      today: "2026-09-26",
      prices: [
        pair("BTC", "USD", series("2026-09-26", 20, 1)),
        pair("SPY", "USD", series("2026-09-18", 20, 1)),
        pair("QQQ", "USD", series("2026-09-10", 20, 1)),
      ],
    });
    expect(stalePrices(valuation).map((holding) => holding.currency)).toEqual([
      "QQQ",
      "SPY",
    ]);
    expect(valuationStatus(valuation, t, "en")).toBe(
      'atMarketValue · pricesNotUpdatedSince({"count":2,"date":"Sep 10, 2026"})',
    );
  });

  it("prices a holding quoted the other way round", () => {
    const valuation = selectValuation({
      market: { USD: "60" },
      cost: { USD: "50" },
      units: { BTC: "0.001" },
      currency: "USD",
      date: "2026-09-30",
      today: "2026-09-26",
      prices: [pair("USD", "BTC", ["2026-09-25"])],
    });
    expect(valuation.priced.map((holding) => holding.currency)).toEqual([
      "BTC",
    ]);
    expect(stalePrices(valuation)).toEqual([]);
  });

  it("values at cost a holding whose only price is after the figure", () => {
    const later = {
      market: { USD: "50" },
      cost: { USD: "50" },
      units: { BTC: "0.001" },
      currency: "USD",
      today: "2026-09-26",
      prices: [pair("BTC", "USD", ["2017-10-05"])],
    };
    expect(
      selectValuation({ ...later, date: "2017-09-30" }).atCostNoPrice.length,
    ).toBe(1);
    // The account tree values at the latest price, whatever its date.
    expect(selectValuation(later).priced.length).toBe(1);
  });

  it("states the basis without a date while the prices are unknown", () => {
    const valuation = selectValuation({ ...EXAMPLE, prices: undefined });
    expect(valuation.priced).toEqual([]);
    expect(valuation.atCostNoPrice).toEqual([]);
    expect(valuation.valuesHoldings).toBe(true);
    expect(valuationStatus(valuation, t, "en")).toBe(
      'atMarketValue · notInTotalCount({"count":1})',
    );
  });

  it("claims no basis while the units read is unavailable", () => {
    const valuation = selectValuation({ ...EXAMPLE, units: undefined });
    expect(valuation.valuesHoldings).toBe(false);
    expect(valuation.priced).toEqual([]);
  });

  it("knows no cost basis while the cost read is unavailable", () => {
    const valuation = selectValuation({ ...EXAMPLE, cost: undefined });
    expect(valuation.cost).toBe(null);
    expect(valuation.unrealized).toBe(null);
    expect(costBasisLine(valuation, "USD", t)).toBe(null);
  });
});

describe("valuationStatus", () => {
  it("states the basis, then counts stale prices and what the total leaves out", () => {
    expect(valuationStatus(selectValuation(EXAMPLE), t, "en")).toBe(
      'atMarketValue · pricesNotUpdatedSince({"count":6,"date":"Sep 8, 2017"}) · notInTotalCount({"count":1})',
    );
  });

  it("says only the basis when every price is current", () => {
    const valuation = selectValuation({
      ...EXAMPLE,
      date: "2017-09-08",
      today: "2017-09-10",
    });
    expect(valuationStatus(valuation, t, "en")).toBe(
      'atMarketValue · notInTotalCount({"count":1})',
    );
  });

  it("counts holdings valued at cost for lack of a price", () => {
    const valuation = selectValuation({
      ...EXAMPLE,
      market: { USD: "1010" },
      cost: { USD: "1010" },
      units: { USD: "10", STARTUP: "1000" },
    });
    expect(valuationStatus(valuation, t, "en")).toBe(
      'atMarketValue · atCostNoPriceCount({"count":1})',
    );
  });

  it("has no line for a cash-only total, and the notes list mirrors it", () => {
    const cash = selectValuation({
      ...EXAMPLE,
      market: { USD: "100" },
      cost: { USD: "100" },
      units: { USD: "100" },
    });
    expect(valuationStatus(cash, t, "en")).toBe(null);
    expect(valuationNotes(cash, t, "en")).toEqual([]);
    expect(valuationNotes(selectValuation(EXAMPLE), t, "en")).toEqual([
      valuationStatus(selectValuation(EXAMPLE), t, "en"),
    ]);
  });
});

describe("isPriceStale", () => {
  const daily = series("2026-09-18", 20, 1);
  const monthly = series("2026-08-01", 10, 30);
  const managed = { commodity: "BTC", quote: "USD", freshness: "recent" };

  it("flags a daily price stopped 8 days ago", () => {
    expect(isPriceStale({ age: 8, managed: null, dates: daily })).toBe(true);
    expect(isPriceStale({ age: 7, managed: null, dates: daily })).toBe(false);
  });

  it("leaves a monthly price alone at 40 days, flags it past three gaps", () => {
    expect(isPriceStale({ age: 40, managed: null, dates: monthly })).toBe(
      false,
    );
    expect(isPriceStale({ age: 91, managed: null, dates: monthly })).toBe(true);
  });

  it("judges a managed feed by its own terms", () => {
    expect(isPriceStale({ age: 2, managed, dates: daily })).toBe(false);
    expect(isPriceStale({ age: 3, managed, dates: daily })).toBe(false);
    expect(isPriceStale({ age: 4, managed, dates: daily })).toBe(true);
    const down = { ...managed, freshness: "unavailable" };
    expect(isPriceStale({ age: 1, managed: down, dates: daily })).toBe(true);
    expect(isPriceStale({ age: 0, managed: down, dates: daily })).toBe(false);
  });

  it("assumes a weekly cadence with fewer than three points", () => {
    const two = ["2026-01-01", "2026-06-01"];
    expect(priceCadenceDays(two)).toBe(7);
    expect(isPriceStale({ age: 21, managed: null, dates: two })).toBe(false);
    expect(isPriceStale({ age: 22, managed: null, dates: two })).toBe(true);
  });

  it("measures the cadence over the last ten prices", () => {
    const history = [
      ...series("2025-01-01", 5, 90),
      ...series("2026-09-01", 10, 1),
    ];
    expect(priceCadenceDays(history)).toBe(1);
  });
});

describe("costBasisLine", () => {
  it("shows the cost and the signed unrealized difference", () => {
    expect(costBasisLine(selectValuation(EXAMPLE), "USD", t)).toBe(
      'costBasisLine({"cost":"$106,826.05","gain":"+$10,823.44"})',
    );
  });

  it("signs a loss", () => {
    const valuation = selectValuation({
      ...EXAMPLE,
      market: { USD: "900" },
      cost: { USD: "1000" },
    });
    expect(costBasisLine(valuation, "USD", t)).toBe(
      'costBasisLine({"cost":"$1,000.00","gain":"-$100.00"})',
    );
  });

  it("says nothing when market and cost agree to the cent", () => {
    const valuation = selectValuation({
      ...EXAMPLE,
      market: { USD: "1000.004" },
      cost: { USD: "1000" },
    });
    expect(costBasisLine(valuation, "USD", t)).toBe(null);
  });
});

describe("balanceNotes", () => {
  const rgagx = { currency: "RGAGX", number: 597.748, scale: 3 };

  it("states a units figure's value and the basis it was read at", () => {
    expect(
      balanceNotes(
        {
          kind: "units",
          units: rgagx,
          value: { amount: 48471.38532, basis: "market" },
        },
        "USD",
        t,
        "en",
      ),
    ).toEqual(['atMarket({"amount":"$48,471.39"})']);
    expect(
      balanceNotes(
        {
          kind: "units",
          units: rgagx,
          value: { amount: 49049.66613, basis: "cost" },
        },
        "USD",
        t,
        "en",
      ),
    ).toEqual(['atCost({"amount":"$49,049.67"})']);
  });

  it("claims no basis it does not know, and adds nothing to a figure with no value", () => {
    expect(
      balanceNotes(
        {
          kind: "units",
          units: rgagx,
          value: { amount: 48471.38532, basis: null },
        },
        "USD",
        t,
        "en",
      ),
    ).toEqual([]);
    expect(
      balanceNotes(
        {
          kind: "units",
          units: { currency: "VACHR", number: -13, scale: 0 },
          value: null,
        },
        "USD",
        t,
        "en",
      ),
    ).toEqual([]);
  });

  it("carries a total's valuation when it has one, else what it leaves out", () => {
    const valuation = selectValuation(EXAMPLE);
    expect(
      balanceNotes(
        {
          kind: "money",
          value: valuation.market,
          notInTotal: valuation.notInTotal,
          valuation,
        },
        "USD",
        t,
        "en",
      ),
    ).toEqual(valuationNotes(valuation, t, "en"));
    expect(
      balanceNotes(
        {
          kind: "money",
          value: 1,
          notInTotal: [
            { currency: "VACHR", number: -13, scale: 0 },
            { currency: "IRAUSD", number: 18000, scale: 0 },
          ],
        },
        "USD",
        t,
        "en",
      ),
    ).toEqual(['notInTotal({"amounts":"-13 VACHR, 18,000 IRAUSD"})']);
    expect(
      balanceNotes({ kind: "money", value: 1, notInTotal: [] }, "USD", t, "en"),
    ).toEqual([]);
  });
});
