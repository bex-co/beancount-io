import type { DirectiveJson, PostingJson } from "@rustledger/wasm";
import { LotInventory, parseConversion } from "../lot-inventory";
import { buildPriceMap, type PriceMap } from "../price-map";

/** Stringify a reduce() result for readable assertions. */
function str(
  m: Map<string, ReturnType<PriceMap["getRate"]>> | Map<string, unknown>,
) {
  return Object.fromEntries(
    [...(m as Map<string, { toString(): string }>)].map(([k, v]) => [
      k,
      v.toString(),
    ]),
  );
}

function priceDir(base: string, number: string, quote: string): DirectiveJson {
  return {
    type: "price",
    date: "2024-01-01",
    currency: base,
    amount: { number, currency: quote },
  } as DirectiveJson;
}

/** 10 HOOL held at a per-unit cost in `costCurrency`. */
function heldAtCost(costNumber: string, costCurrency: string): PostingJson {
  return {
    account: "Assets:Investments",
    units: { number: "10", currency: "HOOL" },
    cost: {
      number: { kind: "per_unit", value: costNumber },
      currency: costCurrency,
    },
  } as PostingJson;
}

const NO_PRICES = buildPriceMap([]);

describe("LotInventory valuation (fava conversion.py parity)", () => {
  describe("at_value (get_market_value)", () => {
    it("falls back to COST when no market price exists (the reviewer's repro)", () => {
      // 10 HOOL {10 USD}, no HOOL price -> 100 USD (cost), NOT 10 HOOL.
      const inv = new LotInventory();
      inv.addPosting(heldAtCost("10", "USD"));
      const out = inv.reduce(
        parseConversion("at_value"),
        NO_PRICES,
        "2024-06-01",
      );
      expect(str(out)).toEqual({ USD: "100" });
    });

    it("uses the market price when one exists", () => {
      const prices = buildPriceMap([priceDir("HOOL", "12", "USD")]);
      const inv = new LotInventory();
      inv.addPosting(heldAtCost("10", "USD"));
      const out = inv.reduce(parseConversion("at_value"), prices, "2024-06-01");
      expect(str(out)).toEqual({ USD: "120" }); // 10 × 12
    });

    it("leaves a cost-less position in its own units", () => {
      const inv = new LotInventory();
      inv.addPosting({
        account: "Assets:Cash",
        units: { number: "50", currency: "USD" },
      } as PostingJson);
      expect(
        str(inv.reduce(parseConversion("at_value"), NO_PRICES, undefined)),
      ).toEqual({
        USD: "50",
      });
    });
  });

  describe("currency conversion (convert_position)", () => {
    it("returns raw units when the cost currency IS the target and no price exists", () => {
      // Fava's convert_position: cost.ccy == target -> no two-hop -> units.
      const inv = new LotInventory();
      inv.addPosting(heldAtCost("10", "USD"));
      expect(
        str(inv.reduce(parseConversion("USD"), NO_PRICES, undefined)),
      ).toEqual({
        HOOL: "10",
      });
    });

    it("converts via the cost currency (two-hop) when the target differs", () => {
      // 10 HOOL {10 EUR} -> USD: no HOOL→USD, so HOOL→EUR (9) × EUR→USD (1.1).
      const prices = buildPriceMap([
        priceDir("HOOL", "9", "EUR"),
        priceDir("EUR", "1.1", "USD"),
      ]);
      const inv = new LotInventory();
      inv.addPosting(heldAtCost("10", "EUR"));
      const out = inv.reduce(parseConversion("USD"), prices, undefined);
      expect(str(out)).toEqual({ USD: "99" }); // 10 × 9 × 1.1
    });

    it("prefers a direct price over the two-hop", () => {
      const prices = buildPriceMap([priceDir("HOOL", "15", "USD")]);
      const inv = new LotInventory();
      inv.addPosting(heldAtCost("10", "EUR"));
      expect(
        str(inv.reduce(parseConversion("USD"), prices, undefined)),
      ).toEqual({
        USD: "150",
      });
    });
  });

  describe("multi-currency conversion chaining (issue #4)", () => {
    it("falls through to the SECOND target when the first fails (the reviewer's repro)", () => {
      // Hold GBP cash; only a GBP→EUR price exists. "USD,EUR" must end up EUR
      // (USD fails, then EUR converts) — NOT stay GBP.
      const prices = buildPriceMap([priceDir("GBP", "1.2", "EUR")]);
      const inv = new LotInventory();
      inv.addPosting({
        account: "Assets:Cash",
        units: { number: "10", currency: "GBP" },
      } as PostingJson);
      expect(
        str(inv.reduce(parseConversion("USD,EUR"), prices, undefined)),
      ).toEqual({
        EUR: "12", // 10 × 1.2
      });
    });

    it("stops at the first target that succeeds", () => {
      const prices = buildPriceMap([
        priceDir("GBP", "1.3", "USD"),
        priceDir("GBP", "1.2", "EUR"),
      ]);
      const inv = new LotInventory();
      inv.addPosting({
        account: "Assets:Cash",
        units: { number: "10", currency: "GBP" },
      } as PostingJson);
      // USD price exists → converts on the first target; EUR pass is a no-op.
      expect(
        str(inv.reduce(parseConversion("USD,EUR"), prices, undefined)),
      ).toEqual({
        USD: "13",
      });
    });

    it("keeps a currency that no target can reach", () => {
      const inv = new LotInventory();
      inv.addPosting({
        account: "Assets:Cash",
        units: { number: "10", currency: "GBP" },
      } as PostingJson);
      expect(
        str(inv.reduce(parseConversion("USD,EUR"), NO_PRICES, undefined)),
      ).toEqual({
        GBP: "10", // no price to either target → stays GBP
      });
    });
  });

  describe("at_cost (get_cost) and units", () => {
    it("values at total cost basis in the cost currency", () => {
      const inv = new LotInventory();
      inv.addPosting(heldAtCost("10", "USD"));
      expect(
        str(inv.reduce(parseConversion("at_cost"), NO_PRICES, undefined)),
      ).toEqual({
        USD: "100",
      });
    });

    it("keeps raw units under `units`", () => {
      const inv = new LotInventory();
      inv.addPosting(heldAtCost("10", "USD"));
      expect(
        str(inv.reduce(parseConversion("units"), NO_PRICES, undefined)),
      ).toEqual({
        HOOL: "10",
      });
    });
  });

  describe("units_by_cost (w4/m58)", () => {
    it("keys raw units by cost currency, `{}` when held without a cost", () => {
      const inv = new LotInventory();
      inv.addPosting(heldAtCost("10", "EUR"));
      inv.addPosting(heldAtCost("12", "USD"));
      inv.addPosting({
        account: "Assets:Investments",
        units: { number: "500.00", currency: "EUR" },
      } as PostingJson);
      const prices = buildPriceMap([priceDir("HOOL", "99", "EUR")]);
      const out = inv.reduceScaled(
        parseConversion("units_by_cost"),
        prices,
        "2024-06-01",
      );
      expect(
        Object.fromEntries(
          [...out].map(([k, { value, scale }]) => [k, value.toFixed(scale)]),
        ),
      ).toEqual({ "HOOL {EUR}": "10", "HOOL {USD}": "10", "EUR {}": "500.00" });
    });

    it("nets two lots in one cost currency at different costs into one key", () => {
      const inv = new LotInventory();
      inv.addPosting(heldAtCost("10", "EUR"));
      inv.addPosting(heldAtCost("11", "EUR"));
      expect(
        str(inv.reduce(parseConversion("units_by_cost"), NO_PRICES, undefined)),
      ).toEqual({ "HOOL {EUR}": "20" });
    });
  });

  describe("lot netting + cost kinds", () => {
    it("nets same-cost lots (buy 10, sell 4 -> 6 at cost)", () => {
      const inv = new LotInventory();
      inv.addPosting(heldAtCost("10", "USD"));
      inv.addPosting({
        account: "Assets:Investments",
        units: { number: "-4", currency: "HOOL" },
        cost: { number: { kind: "per_unit", value: "10" }, currency: "USD" },
      } as PostingJson);
      expect(
        str(inv.reduce(parseConversion("at_cost"), NO_PRICES, undefined)),
      ).toEqual({
        USD: "60", // 6 × 10
      });
    });

    it("resolves a total cost `{{1000 USD}}` to per-unit for the fallback", () => {
      const inv = new LotInventory();
      inv.addPosting({
        account: "Assets:Investments",
        units: { number: "10", currency: "HOOL" },
        cost: { number: { kind: "total", value: "1000" }, currency: "USD" },
      } as PostingJson);
      // per-unit = 1000/10 = 100; at_value fallback = 10 × 100 = 1000 USD.
      expect(
        str(inv.reduce(parseConversion("at_value"), NO_PRICES, undefined)),
      ).toEqual({
        USD: "1000",
      });
    });

    it("divides a NEGATIVE-unit total cost `{{1000 USD}}` by abs(units) (beancount CostSpec)", () => {
      // -10 HOOL {{1000 USD}}: beancount books per-unit = total / abs(units)
      // = 100 (booking_full.compute_cost_number), so the reduction values to
      // -10 × 100 = -1000 USD. Dividing by SIGNED units would book per-unit
      // -100 and flip the valuation to +1000.
      const inv = new LotInventory();
      inv.addPosting({
        account: "Assets:Investments",
        units: { number: "-10", currency: "HOOL" },
        cost: { number: { kind: "total", value: "1000" }, currency: "USD" },
      } as PostingJson);
      expect(
        str(inv.reduce(parseConversion("at_cost"), NO_PRICES, undefined)),
      ).toEqual({
        USD: "-1000",
      });
      // The at_value COST fallback uses the same booked per-unit.
      expect(
        str(inv.reduce(parseConversion("at_value"), NO_PRICES, undefined)),
      ).toEqual({
        USD: "-1000",
      });
    });

    it("nets a negative-unit total-cost reduction against the per-unit acquisition lot", () => {
      // Buy 10 HOOL {100 USD}, sell all of it as -10 HOOL {{1000 USD}}: both
      // resolve to the SAME (HOOL, 100, USD) lot key, so the position is flat.
      const inv = new LotInventory();
      inv.addPosting(heldAtCost("100", "USD"));
      inv.addPosting({
        account: "Assets:Investments",
        units: { number: "-10", currency: "HOOL" },
        cost: { number: { kind: "total", value: "1000" }, currency: "USD" },
      } as PostingJson);
      expect(
        str(inv.reduce(parseConversion("at_cost"), NO_PRICES, undefined)),
      ).toEqual({
        USD: "0",
      });
    });

    it("divides a negative-unit COMPOUND cost's total component by abs(units)", () => {
      // -10 HOOL {5 # 50 USD}: per-unit = 5 + 50/abs(-10) = 10 → -100 USD.
      const inv = new LotInventory();
      inv.addPosting({
        account: "Assets:Investments",
        units: { number: "-10", currency: "HOOL" },
        cost: {
          number: { kind: "compound", per_unit: "5", total: "50" },
          currency: "USD",
        },
      } as PostingJson);
      expect(
        str(inv.reduce(parseConversion("at_cost"), NO_PRICES, undefined)),
      ).toEqual({
        USD: "-100",
      });
    });
  });
});

// w22/016: a lot valued at its cost or a price lost the decimal places it was
// written with. BigNumber has no trailing zeros, so `10 x 180.00` was `1800`
// where the account journal and Python's Decimal say `1800.00`, and clients
// read the display scale from the string. A product's places are the sum of
// its operands'; a sum keeps the widest.
describe("valued amounts keep Decimal's decimal places (w22/016)", () => {
  /** reduceScaled as the strings the API serialises (`toFixed(scale)`). */
  const scaled = (
    inventory: LotInventory,
    conversion: string,
    prices: PriceMap = NO_PRICES,
  ) =>
    Object.fromEntries(
      [
        ...inventory.reduceScaled(
          parseConversion(conversion),
          prices,
          "2024-06-01",
        ),
      ].map(([currency, { value, scale }]) => [currency, value.toFixed(scale)]),
    );

  const buy = (
    number: string,
    cost: string,
    currency = "EUR",
    units = "VTI",
  ): PostingJson =>
    ({
      account: "Assets:Broker",
      units: { number, currency: units },
      cost: { number: { kind: "per_unit", value: cost }, currency },
    }) as PostingJson;
  const cash = (number: string, currency = "EUR"): PostingJson =>
    ({
      account: "Assets:Broker",
      units: { number, currency },
    }) as PostingJson;
  const held = (...postings: PostingJson[]) => {
    const inventory = new LotInventory();
    postings.forEach((posting) => inventory.addPosting(posting));
    return inventory;
  };

  it("keeps the cost's places when an unpriced lot is valued at its cost", () => {
    // The QA ledger: 10 VTI {180.00 EUR}, no VTI price.
    expect(scaled(held(buy("10", "180.00")), "at_value")).toEqual({
      EUR: "1800.00",
    });
    expect(scaled(held(buy("10", "180.00")), "at_cost")).toEqual({
      EUR: "1800.00",
    });
  });

  it("adds the units' places to the cost's", () => {
    expect(scaled(held(buy("2.500", "84.60")), "at_cost")).toEqual({
      EUR: "211.50000",
    });
    expect(scaled(held(buy("0.5", "1.25")), "at_cost")).toEqual({
      EUR: "0.625",
    });
  });

  it("keeps the price's places when a lot is valued at a price", () => {
    const prices = buildPriceMap([priceDir("VTI", "200.00", "EUR")]);
    expect(scaled(held(buy("10", "180.00")), "at_value", prices)).toEqual({
      EUR: "2000.00",
    });
    // And on a conversion to the price's currency.
    expect(scaled(held(buy("10", "180.00", "USD")), "EUR", prices)).toEqual({
      EUR: "2000.00",
    });
  });

  it("adds both rates' places across a two-hop conversion", () => {
    const prices = buildPriceMap([
      priceDir("VTI", "2.0", "USD"),
      priceDir("USD", "0.90", "EUR"),
    ]);
    // 10 x 2.0 x 0.90 = 18.000: 0 + 1 + 2 places.
    expect(scaled(held(buy("10", "180.00", "USD")), "EUR", prices)).toEqual({
      EUR: "18.000",
    });
  });

  it("leaves an amount written without places without any", () => {
    expect(scaled(held(buy("10", "10", "USD", "HOOL")), "at_value")).toEqual({
      USD: "100",
    });
    expect(scaled(held(buy("10", "180", "EUR")), "at_cost")).toEqual({
      EUR: "1800",
    });
  });

  it("keeps a passed-through amount's own places beside a valued one", () => {
    // BrokerEur: the same purchase plus 500.00 of cash read 2300.00 and the
    // lone purchase 1800 — one amount, two spellings.
    expect(
      scaled(held(buy("10", "180.00"), cash("500.00")), "at_value"),
    ).toEqual({ EUR: "2300.00" });
    expect(scaled(held(cash("500.00")), "at_value")).toEqual({ EUR: "500.00" });
  });

  it("takes the widest places across lots valued together", () => {
    expect(
      scaled(held(buy("10", "180"), buy("5", "190.50")), "at_cost"),
    ).toEqual({ EUR: "2752.50" });
  });

  it("gives a total cost the places of its per-unit quotient", () => {
    // {{1800.00 EUR}} over 10 units is 180.00 a unit, so 10 units value to
    // 1800.00 (Decimal('1800.00') / Decimal('10') is Decimal('180.00')).
    const total = {
      account: "Assets:Broker",
      units: { number: "10", currency: "VTI" },
      cost: { number: { kind: "total", value: "1800.00" }, currency: "EUR" },
    } as PostingJson;
    expect(scaled(held(total), "at_cost")).toEqual({ EUR: "1800.00" });
  });

  it("keeps a value's places through a unit sale that nets the lot", () => {
    expect(
      scaled(held(buy("10", "180.00"), buy("-4", "180.00")), "at_cost"),
    ).toEqual({ EUR: "1080.00" });
  });

  it("still reads raw units under `units` and `units_by_cost` as written", () => {
    expect(scaled(held(buy("10", "180.00")), "units")).toEqual({ VTI: "10" });
    expect(scaled(held(buy("10.50", "180.00")), "units")).toEqual({
      VTI: "10.50",
    });
  });
});
