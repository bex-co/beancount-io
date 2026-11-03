import { describe, expect, it } from "vitest";
import {
  describeLatestNetWorth,
  describeNetWorthValuation,
  isPriceStale,
  priceCadenceDays,
  throughCurrentMonth,
  type PricePair,
} from "../net-worth-valuation";

/** `count` dates ending on `last`, `stepDays` apart, ascending. */
function dates(last: string, count: number, stepDays: number): string[] {
  const end = Date.parse(`${last}T00:00:00Z`);
  return Array.from({ length: count }, (_, i) =>
    new Date(end - (count - 1 - i) * stepDays * 86_400_000)
      .toISOString()
      .slice(0, 10),
  );
}

function pair(base: string, priceDates: string[]): PricePair {
  return { base, quote: "USD", prices: priceDates.map((date) => ({ date })) };
}

// The Beancount example ledger's shape (w4/m26): six funds held at cost and
// priced weekly until 2017-09-08, vacation hours with no cost and no price.
const exampleFunds = ["GLD", "ITOT", "RGAGX", "VBMPX", "VEA", "VHT"];
const example = {
  market: { USD: "117649.48828", VACHR: "-13" },
  cost: { USD: "106826.04944", VACHR: "-13" },
  // `units_by_cost` keys (w4/m58): the funds cost USD, the hours cost nothing.
  units: {
    "USD {}": "906.58",
    "VACHR {}": "-13",
    "GLD {USD}": "17",
    "ITOT {USD}": "104",
    "RGAGX {USD}": "597.748",
    "VBMPX {USD}": "193.442",
    "VEA {USD}": "36",
    "VHT {USD}": "64",
  },
  currency: "USD",
  date: "2017-09-30",
  today: "2026-09-26",
  pricePairs: exampleFunds.map((fund) =>
    pair(fund, dates("2017-09-08", 20, 7)),
  ),
  managedSources: [],
};

describe("priceCadenceDays", () => {
  it("is the median gap of the recent price dates", () => {
    expect(priceCadenceDays(dates("2026-09-26", 12, 1))).toBe(1);
    expect(priceCadenceDays(dates("2026-09-01", 6, 30))).toBe(30);
  });

  it("falls back to a week with fewer than three points", () => {
    expect(priceCadenceDays(["2026-09-01", "2026-09-02"])).toBe(7);
    expect(priceCadenceDays([])).toBe(7);
  });
});

describe("isPriceStale", () => {
  it("flags a daily ledger price that stopped eight days ago", () => {
    const priceDates = dates("2026-09-18", 30, 1);
    expect(
      isPriceStale({ ageDays: 8, managedFreshness: null, priceDates }),
    ).toBe(true);
    expect(
      isPriceStale({ ageDays: 7, managedFreshness: null, priceDates }),
    ).toBe(false);
  });

  it("lets a monthly ledger price reach forty days", () => {
    const priceDates = dates("2026-08-17", 8, 30);
    expect(
      isPriceStale({ ageDays: 40, managedFreshness: null, priceDates }),
    ).toBe(false);
    expect(
      isPriceStale({ ageDays: 91, managedFreshness: null, priceDates }),
    ).toBe(true);
  });

  it("uses a seven-day cadence for a price with too few points", () => {
    const priceDates = ["2026-09-01", "2026-09-02"];
    expect(
      isPriceStale({ ageDays: 21, managedFreshness: null, priceDates }),
    ).toBe(false);
    expect(
      isPriceStale({ ageDays: 22, managedFreshness: null, priceDates }),
    ).toBe(true);
  });

  it("judges a managed feed by days, not its minute-level status", () => {
    const priceDates = dates("2026-09-24", 30, 1);
    expect(
      isPriceStale({ ageDays: 2, managedFreshness: "stale", priceDates }),
    ).toBe(false);
    expect(
      isPriceStale({ ageDays: 4, managedFreshness: "recent", priceDates }),
    ).toBe(true);
  });

  it("flags an unavailable managed feed once a day has passed", () => {
    const priceDates = dates("2026-09-25", 30, 1);
    expect(
      isPriceStale({ ageDays: 1, managedFreshness: "unavailable", priceDates }),
    ).toBe(true);
    expect(
      isPriceStale({ ageDays: 0, managedFreshness: "unavailable", priceDates }),
    ).toBe(false);
  });
});

describe("describeNetWorthValuation", () => {
  it("dates every example fund and flags them stale since their last price", () => {
    const valuation = describeNetWorthValuation(example);

    expect(valuation?.staleSince).toBe("2017-09-08");
    expect(
      valuation?.holdings
        .filter((holding) => holding.stale)
        .map((h) => h.currency),
    ).toEqual(exampleFunds);
    expect(
      valuation?.holdings.find((h) => h.currency === "VACHR"),
    ).toMatchObject({
      basis: "notInTotal",
      priceDate: null,
      stale: false,
      units: -13,
    });
    expect(valuation?.costBasis).toBeCloseTo(106826.04944, 5);
    expect(valuation?.unrealized).toBeCloseTo(10823.43884, 5);
  });

  it("measures age from the figure's own date when it is before today", () => {
    // 2017-09-12 is four days after the last weekly price: not stale.
    const valuation = describeNetWorthValuation({
      ...example,
      date: "2017-09-12",
    });
    expect(valuation?.staleSince).toBeNull();
  });

  it("keeps fresh managed prices quiet beside sparse ledger prices", () => {
    // crypto-example's shape: BTC on a daily managed feed priced today, and a
    // wrapped token hand-priced every ~6 weeks, last 11 days ago.
    const valuation = describeNetWorthValuation({
      market: { USD: "194307.62" },
      cost: { USD: "194405.22" },
      units: {
        "USD {}": "112022.58",
        "BTC {USD}": "0.332",
        "STETH {USD}": "1.04",
      },
      currency: "USD",
      date: "2026-09-30",
      today: "2026-09-26",
      pricePairs: [
        pair("BTC", dates("2026-09-26", 90, 1)),
        pair("STETH", dates("2026-09-15", 5, 42)),
      ],
      managedSources: [{ commodity: "BTC", quote: "USD", freshness: "recent" }],
    });

    expect(valuation?.staleSince).toBeNull();
    expect(valuation?.holdings).toEqual([
      expect.objectContaining({
        currency: "BTC",
        priceDate: "2026-09-26",
        managed: true,
        stale: false,
      }),
      expect.objectContaining({
        currency: "STETH",
        priceDate: "2026-09-15",
        managed: false,
        stale: false,
      }),
    ]);
    expect(valuation?.unrealized).toBeCloseTo(-97.6, 2);
  });

  it("flags a daily ledger price that stopped while others kept going", () => {
    const valuation = describeNetWorthValuation({
      market: { USD: "5000" },
      cost: { USD: "4000" },
      units: { "USD {}": "0", "AAA {USD}": "1", "BBB {USD}": "2" },
      currency: "USD",
      date: "2026-09-26",
      today: "2026-09-26",
      pricePairs: [
        pair("AAA", dates("2026-09-26", 30, 1)),
        pair("BBB", dates("2026-09-17", 30, 1)),
      ],
      managedSources: [],
    });

    expect(valuation?.staleSince).toBe("2026-09-17");
    expect(valuation?.holdings.map((h) => [h.currency, h.stale])).toEqual([
      ["AAA", false],
      ["BBB", true],
    ]);
  });

  it("reads a price in either direction, ignoring prices after the figure", () => {
    const valuation = describeNetWorthValuation({
      market: { USD: "300" },
      cost: { USD: "250" },
      units: { "XYZ {USD}": "3" },
      currency: "USD",
      date: "2026-09-20",
      today: "2026-09-26",
      pricePairs: [
        {
          base: "USD",
          quote: "XYZ",
          prices: [{ date: "2026-09-19" }, { date: "2026-09-25" }],
        },
      ],
      managedSources: [],
    });
    expect(valuation?.holdings[0]).toMatchObject({
      basis: "market",
      priceDate: "2026-09-19",
    });
  });

  it("names a holding at cost when it has no price", () => {
    const valuation = describeNetWorthValuation({
      market: { USD: "1000" },
      cost: { USD: "1000" },
      units: { "STARTUP {USD}": "1000" },
      currency: "USD",
      date: "2026-09-26",
      today: "2026-09-26",
      pricePairs: [],
      managedSources: [],
    });
    expect(valuation?.holdings).toEqual([
      expect.objectContaining({
        currency: "STARTUP",
        basis: "cost",
        priceDate: null,
        stale: false,
      }),
    ]);
    expect(valuation?.unrealized).toBe(0);
  });

  it("says nothing for a cash-only ledger", () => {
    expect(
      describeNetWorthValuation({
        market: { MUSD: "1346.683" },
        cost: { MUSD: "1346.683" },
        units: { "MUSD {}": "1346.683" },
        currency: "MUSD",
        date: "2026-06-30",
        today: "2026-09-26",
        pricePairs: [],
        managedSources: [],
      }),
    ).toBeNull();
  });
});

describe("describeLatestNetWorth", () => {
  it("reads the cost and units series at the market point's date", () => {
    const valuation = describeLatestNetWorth({
      market: [
        { date: "2017-08-31", balance: { USD: "1" } },
        { date: "2017-09-30", balance: example.market },
      ],
      cost: [
        { date: "2017-08-31", balance: { USD: "1" } },
        { date: "2017-09-30", balance: example.cost },
      ],
      units: [{ date: "2017-09-30", balance: example.units }],
      currency: "USD",
      today: example.today,
      pricePairs: example.pricePairs,
      managedSources: [],
    });
    expect(valuation?.costBasis).toBeCloseTo(106826.04944, 5);
    expect(valuation?.staleSince).toBe("2017-09-08");
  });

  it("returns null without a market point", () => {
    expect(
      describeLatestNetWorth({
        market: [],
        cost: [],
        units: [],
        currency: "USD",
        today: "2026-09-26",
        pricePairs: [],
        managedSources: [],
      }),
    ).toBeNull();
  });
});

/**
 * Price ages keep a date's own year (w4/1032). `Date.UTC` reads years 0–99
 * as 1900–1999, so a 0099-12-30 quote was 693,928 days in the future of
 * 0100-01-31 and read as fresh beside its own January date.
 */
describe("early-century price dates", () => {
  const priced = (date: string, priceDates: string[]) =>
    describeNetWorthValuation({
      market: { USD: "20.00" },
      cost: { USD: "10.00" },
      units: { "QA0099DATE {USD}": "1" },
      currency: "USD",
      date,
      today: "2026-10-23",
      pricePairs: [pair("QA0099DATE", priceDates)],
      managedSources: [],
    });
  const december = ["0099-12-28", "0099-12-29", "0099-12-30"];

  it("ages a 0099-12-30 quote 32 days by 0100-01-31 and flags it stale", () => {
    const valuation = priced("0100-01-31", december);
    expect(valuation?.staleSince).toBe("0099-12-30");
    expect(valuation?.holdings[0]).toMatchObject({
      currency: "QA0099DATE",
      priceDate: "0099-12-30",
      stale: true,
    });
  });

  it("keeps the same quote fresh the next day, as in modern years", () => {
    expect(priced("0099-12-31", december)?.staleSince).toBeNull();
    expect(
      priced("2000-01-31", ["1999-12-28", "1999-12-29", "1999-12-30"])
        ?.staleSince,
    ).toBe("1999-12-30");
  });

  it("measures cadence across the 0099 → 0100 boundary and early leap days", () => {
    expect(priceCadenceDays(["0099-12-31", "0100-01-01", "0100-01-02"])).toBe(
      1,
    );
    expect(priceCadenceDays(["0096-02-28", "0096-02-29", "0096-03-01"])).toBe(
      1,
    );
  });

  it("ages a managed early-century quote by calendar days", () => {
    expect(
      isPriceStale({
        ageDays: 32,
        managedFreshness: "recent",
        priceDates: december,
      }),
    ).toBe(true);
  });
});

// w21/995: a future-dated entry puts next month at the end of the series.
describe("throughCurrentMonth", () => {
  const series = [
    { date: "2026-09-30", balance: { USD: "1000" } },
    { date: "2026-10-31", balance: { USD: "1200" } },
    { date: "2026-11-30", balance: { USD: "700" } },
  ];

  it("drops the months after today's", () => {
    expect(
      throughCurrentMonth(series, "2026-10-24").map((point) => point.date),
    ).toEqual(["2026-09-30", "2026-10-31"]);
  });

  it("describes the current month's point, not the future one", () => {
    const at = (date: string, usd: string) => ({
      date,
      balance: { USD: usd, GLD: "2" },
    });
    const market = [at("2026-10-31", "1200"), at("2026-11-30", "700")];
    const cost = [at("2026-10-31", "1100"), at("2026-11-30", "900")];
    const valuation = describeLatestNetWorth({
      market,
      cost,
      units: [
        { date: "2026-10-31", balance: { "GLD {USD}": "2" } },
        { date: "2026-11-30", balance: { "GLD {USD}": "2" } },
      ],
      currency: "USD",
      today: "2026-10-24",
      pricePairs: [],
      managedSources: [],
    });
    expect(valuation?.costBasis).toBe(1100);
  });
});

/**
 * w4/1031: `at_value` prices a lot only in its cost currency, else values it
 * at cost, and leaves a lot with no cost in its own units. The holdings come
 * from `units_by_cost` (w4/m58), so each says which quote valued it.
 */
describe("cost-currency quotes (w4/1031)", () => {
  const prices = (base: string, quote: string, on: string[]): PricePair => ({
    base,
    quote,
    prices: on.map((date) => ({ date })),
  });
  // 1 QACUTOFF {10.00 EUR}, quoted 2026-07-15, 2026-08-20 and 2026-12-31.
  const quoteDates = ["2026-07-15", "2026-08-20", "2026-12-31"];
  const cutoff = (date: string, quote: string) =>
    describeNetWorthValuation({
      market: { EUR: quote === "EUR" ? "20.00" : "10.00" },
      cost: { EUR: "10.00" },
      units: { "QACUTOFF {EUR}": "1" },
      currency: "USD",
      date,
      today: "2026-09-26",
      pricePairs: [prices("QACUTOFF", quote, quoteDates)],
      managedSources: [],
    })?.holdings;

  it("prices a EUR-cost lot by its EUR quote as of each month", () => {
    expect(cutoff("2026-07-31", "EUR")).toEqual([
      expect.objectContaining({
        currency: "QACUTOFF",
        costCurrency: "EUR",
        basis: "market",
        priceDate: "2026-07-15",
      }),
    ]);
    expect(cutoff("2026-08-31", "EUR")?.[0]).toMatchObject({
      basis: "market",
      priceDate: "2026-08-20",
    });
  });

  it("values the same lot at cost when its only quotes are in USD", () => {
    for (const date of ["2026-07-31", "2026-08-31"]) {
      expect(cutoff(date, "USD")).toEqual([
        expect.objectContaining({
          costCurrency: "EUR",
          basis: "cost",
          priceDate: null,
          stale: false,
        }),
      ]);
    }
  });

  it("splits one commodity bought in two currencies into two holdings", () => {
    const holdings = describeNetWorthValuation({
      market: { EUR: "1000.00", USD: "850.00" },
      cost: { EUR: "920.00", USD: "800.00" },
      units: { "VTI {EUR}": "5", "VTI {USD}": "4", "EUR {}": "50.00" },
      currency: "USD",
      date: "2026-09-30",
      today: "2026-09-30",
      pricePairs: [prices("VTI", "EUR", ["2026-09-29"])],
      managedSources: [],
    })?.holdings;
    expect(
      holdings?.map((h) => [h.currency, h.costCurrency, h.basis, h.priceDate]),
    ).toEqual([
      ["EUR", null, "notInTotal", null],
      ["VTI", "EUR", "market", "2026-09-29"],
      ["VTI", "USD", "cost", null],
    ]);
  });

  it("tells cash in a currency from a lot that cost that currency (w21/556)", () => {
    // Operating currency EUR: 500 EUR cash and 10 VTI {180.00 EUR}. VTI's only
    // price is in USD, which `at_value` never hops through.
    const usdOnly = describeNetWorthValuation({
      market: { EUR: "2300.00" },
      cost: { EUR: "2300.00" },
      units: { "EUR {}": "500.00", "VTI {EUR}": "10" },
      currency: "EUR",
      date: "2026-10-31",
      today: "2026-10-31",
      pricePairs: [prices("VTI", "USD", ["2026-10-21"])],
      managedSources: [],
    });
    expect(usdOnly?.holdings).toEqual([
      expect.objectContaining({
        currency: "VTI",
        basis: "cost",
        priceDate: null,
      }),
    ]);
    // With a EUR price the same lot is at market, and the cash is still cash.
    const eurPriced = describeNetWorthValuation({
      market: { EUR: "2600.00" },
      cost: { EUR: "2300.00" },
      units: { "EUR {}": "500.00", "VTI {EUR}": "10" },
      currency: "EUR",
      date: "2026-10-31",
      today: "2026-10-31",
      pricePairs: [prices("VTI", "EUR", ["2026-10-30"])],
      managedSources: [],
    });
    expect(eurPriced?.holdings).toEqual([
      expect.objectContaining({ basis: "market", priceDate: "2026-10-30" }),
    ]);
  });

  it("dates a lot that cost another commodity by that pair (w21/554)", () => {
    // 1 BTC {30000.00 USD} and 40 ETH {0.05 BTC}; BTC priced in August only.
    const valuation = describeNetWorthValuation({
      market: { USD: "60000.00", BTC: "2.00" },
      cost: { USD: "30000.00", BTC: "2.00" },
      units: { "BTC {USD}": "1", "ETH {BTC}": "40" },
      currency: "USD",
      date: "2026-10-31",
      today: "2026-10-31",
      pricePairs: [
        prices("BTC", "USD", ["2026-08-01"]),
        prices("ETH", "BTC", ["2026-10-21"]),
      ],
      managedSources: [],
    });
    expect(
      valuation?.holdings.map((h) => [h.currency, h.priceDate, h.stale]),
    ).toEqual([
      ["BTC", "2026-08-01", true],
      ["ETH", "2026-10-21", false],
    ]);
    expect(valuation?.staleSince).toBe("2026-08-01");
  });

  it("binds a managed feed to the quote that values the lot", () => {
    const managed = (quote: string) =>
      describeNetWorthValuation({
        market: { EUR: "2000.00" },
        cost: { EUR: "1800.00" },
        units: { "VTI {EUR}": "10" },
        currency: "USD",
        date: "2026-10-31",
        today: "2026-10-31",
        pricePairs: [prices("VTI", "EUR", ["2026-10-31"])],
        managedSources: [{ commodity: "VTI", quote, freshness: "recent" }],
      })?.holdings[0]?.managed;
    expect(managed("EUR")).toBe(true);
    expect(managed("USD")).toBe(false);
  });

  it("reads a key without a cost suffix as units held without a cost", () => {
    expect(
      describeNetWorthValuation({
        market: { USD: "10", VACHR: "-13" },
        cost: { USD: "10", VACHR: "-13" },
        units: { VACHR: "-13" },
        currency: "USD",
        date: "2026-10-31",
        today: "2026-10-31",
        pricePairs: [prices("VACHR", "USD", ["2026-10-30"])],
        managedSources: [],
      })?.holdings,
    ).toEqual([
      expect.objectContaining({
        currency: "VACHR",
        costCurrency: null,
        basis: "notInTotal",
        priceDate: null,
      }),
    ]);
  });
});
