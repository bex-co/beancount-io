import { describe, expect, it } from "vitest";
import {
  describeLatestNetWorth,
  describeNetWorthValuation,
  isPriceStale,
  priceCadenceDays,
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
  units: {
    USD: "906.58",
    VACHR: "-13",
    GLD: "17",
    ITOT: "104",
    RGAGX: "597.748",
    VBMPX: "193.442",
    VEA: "36",
    VHT: "64",
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
      units: { USD: "112022.58", BTC: "0.332", STETH: "1.04" },
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
      units: { USD: "0", AAA: "1", BBB: "2" },
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
      units: { XYZ: "3" },
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
      units: { STARTUP: "1000" },
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
        units: { MUSD: "1346.683" },
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
