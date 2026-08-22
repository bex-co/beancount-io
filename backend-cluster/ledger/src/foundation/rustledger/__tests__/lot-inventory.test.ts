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
