import type { PostingJson } from "@rustledger/wasm";
import {
  LotInventory,
  MissingPriceLegs,
  parseConversion,
} from "../lot-inventory";
import { buildPriceMap, type PriceMap } from "../price-map";

/**
 * w23/m16: a currency conversion that finds no price path leaves the amount in
 * its own currency; the opt-in collector names that `from → to` leg without
 * touching a value.
 */
const posting = (number: string, currency: string): PostingJson =>
  ({
    account: "Assets:Bank",
    units: { number, currency },
  }) as unknown as PostingJson;

function inventory(...postings: PostingJson[]): LotInventory {
  const lots = new LotInventory();
  postings.forEach((p) => lots.addPosting(p));
  return lots;
}

function priceMapOf(prices: [string, string, string][]): PriceMap {
  return buildPriceMap(
    prices.map(([currency, number, quote]) => ({
      type: "price",
      date: "2024-01-01",
      currency,
      amount: { number, currency: quote },
    })) as never,
  );
}

describe("MissingPriceLegs", () => {
  it("names the leg that had no price path and leaves values alone", () => {
    const lots = inventory(posting("10", "USD"), posting("5", "GBP"));
    const priceMap = priceMapOf([["USD", "0.9", "EUR"]]);
    const missing = new MissingPriceLegs();
    const withCollector = lots.reduceScaled(
      parseConversion("EUR"),
      priceMap,
      "2024-02-01",
      missing,
    );
    const without = lots.reduceScaled(
      parseConversion("EUR"),
      priceMap,
      "2024-02-01",
    );
    expect(missing.toArray()).toEqual([{ from: "GBP", to: "EUR" }]);
    expect(
      [...withCollector.entries()].map(([k, v]) => [k, v.value.toFixed()]),
    ).toEqual([...without.entries()].map(([k, v]) => [k, v.value.toFixed()]));
  });

  it("reports nothing when every currency converts or already is the target", () => {
    const lots = inventory(posting("10", "USD"), posting("3", "EUR"));
    const missing = new MissingPriceLegs();
    lots.reduceScaled(
      parseConversion("EUR"),
      priceMapOf([["USD", "0.9", "EUR"]]),
      "2024-02-01",
      missing,
    );
    expect(missing.toArray()).toEqual([]);
  });

  it("does not disclose a net-zero amount, nor a keyword conversion", () => {
    const flat = inventory(posting("5", "GBP"), posting("-5", "GBP"));
    const missing = new MissingPriceLegs();
    flat.reduceScaled(
      parseConversion("EUR"),
      priceMapOf([]),
      "2024-02-01",
      missing,
    );
    inventory(posting("5", "GBP")).reduceScaled(
      parseConversion("units"),
      priceMapOf([]),
      "2024-02-01",
      missing,
    );
    expect(missing.toArray()).toEqual([]);
  });

  it("names the whole target list for a multi-target conversion and sorts legs", () => {
    const lots = inventory(posting("1", "JPY"), posting("2", "GBP"));
    const missing = new MissingPriceLegs();
    lots.reduceScaled(
      parseConversion("USD,EUR"),
      priceMapOf([]),
      undefined,
      missing,
    );
    expect(missing.toArray()).toEqual([
      { from: "GBP", to: "USD,EUR" },
      { from: "JPY", to: "USD,EUR" },
    ]);
  });
});
