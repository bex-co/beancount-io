import BigNumber from "bignumber.js";
import type { PostingJson } from "@rustledger/wasm";
import type { PriceMap } from "./price-map";
import { perUnitFromTotalCost } from "./total-cost";

/**
 * A cost-lot-aware inventory + Fava's three valuation reducers, ported from
 * `fava/core/conversion.py` (`get_cost` / `get_market_value` / `convert_position`).
 *
 * ## Why this exists
 *
 * The balance accumulators (`interval-series.ts`, `account-tree.ts`) used to sum
 * posting units into a plain `currency -> amount` map, discarding each lot's
 * COST before valuation. That is correct for cash and for `units`, but it makes
 * two Fava valuations impossible:
 *
 *   - **`at_value` (`get_market_value`)** — when a held-at-cost position has NO
 *     market price at the valuation date, Fava falls back to its COST value
 *     (`units × cost`), NOT the raw units. `10 HOOL {10 USD}` with no HOOL price
 *     values to `100 USD`, not `10 HOOL`. Without the lot's cost that fallback is
 *     unreachable.
 *   - **currency conversion (`convert_position`)** — when there is no direct
 *     `units.currency → target` price but the position is held at cost in a THIRD
 *     currency, Fava converts via the cost currency (`units → cost.ccy → target`).
 *     Without the lot's cost currency that two-hop is unreachable.
 *
 * So the accumulators keep positions (units + per-unit cost) and reduce them
 * here, one lot at a time, exactly as Fava's `Inventory.reduce(...)` does.
 */

const Amount = BigNumber.clone({
  DECIMAL_PLACES: 28,
  ROUNDING_MODE: BigNumber.ROUND_HALF_EVEN,
});

/** A held position lot: net units in `currency`, at an optional per-unit cost. */
interface Lot {
  number: BigNumber;
  currency: string;
  costNumber: BigNumber | null;
  costCurrency: string | null;
}

/**
 * How an inventory is valued before display — Fava's conversion keywords. A bare
 * currency code (or comma list) is a `convert_position` target; the three
 * reserved keywords select the cost-aware reducers.
 */
export type Conversion =
  | { kind: "units" }
  | { kind: "at_cost" }
  | { kind: "at_value" }
  | { kind: "currency"; targets: string[] };

/**
 * Parse the legacy `target` string the accumulators receive into a
 * {@link Conversion}. The reserved keywords `units` / `at_cost` / `at_value`
 * select a cost-aware reducer; anything else is a currency code (or `,`-list).
 */
export function parseConversion(target: string): Conversion {
  if (target === "units") return { kind: "units" };
  if (target === "at_cost") return { kind: "at_cost" };
  if (target === "at_value") return { kind: "at_value" };
  return { kind: "currency", targets: target.split(",") };
}

/**
 * The booked per-unit cost of a posting (number + currency), or `null` when the
 * posting is cost-less or the cost is unusable. `total`/`compound` costs are
 * reduced to their effective per-unit so valuation matches beancount's booked
 * per-unit `Cost` — `total / abs(units)` and `per_unit + total/abs(units)`
 * (`compute_cost_number` divides by the ABSOLUTE units: the sign of a
 * reduction lives in the units, so `-10 HOOL {{1000 USD}}` books at per-unit
 * `100` and values to `-1000`, not per-unit `-100` valuing to `+1000`). See
 * {@link perUnitFromTotalCost}.
 */
function bookedCostPerUnit(
  posting: PostingJson,
): { number: BigNumber; currency: string } | null {
  const cost = posting.cost;
  if (!cost || !cost.number || !cost.currency) return null;
  const n = cost.number;
  switch (n.kind) {
    case "per_unit":
      return { number: new Amount(n.value), currency: cost.currency };
    case "per_unit_from_total":
      return { number: new Amount(n.per_unit), currency: cost.currency };
    case "compound": {
      const totalPart = perUnitFromTotalCost(n.total, posting.units?.number);
      if (totalPart === null) {
        return { number: new Amount(n.per_unit), currency: cost.currency };
      }
      return {
        number: new Amount(n.per_unit).plus(totalPart),
        currency: cost.currency,
      };
    }
    case "total": {
      const perUnit = perUnitFromTotalCost(n.value, posting.units?.number);
      if (perUnit === null) return null;
      return { number: perUnit, currency: cost.currency };
    }
    default:
      return null;
  }
}

/** `currency \0 perUnit \0 costCurrency` — beancount's `(units.currency, Cost)` lot key. */
function lotKey(
  currency: string,
  costNumber: BigNumber | null,
  costCurrency: string | null,
): string {
  return `${currency}\0${costNumber ? costNumber.toString() : ""}\0${costCurrency ?? ""}`;
}

/** Value one lot under `conversion`, returning `[currency, amount]`. */
function valueLot(
  lot: Lot,
  conversion: Conversion,
  priceMap: PriceMap,
  date: string | undefined,
): [string, BigNumber] {
  switch (conversion.kind) {
    case "units":
      return [lot.currency, lot.number];
    case "at_cost":
      // get_cost: units × per-unit cost, in the cost currency (else raw units).
      if (lot.costNumber && lot.costCurrency) {
        return [lot.costCurrency, lot.number.times(lot.costNumber)];
      }
      return [lot.currency, lot.number];
    case "at_value": {
      // get_market_value: price(units→cost.ccy) × units, else the COST value —
      // in the cost currency; a cost-less lot stays in its units currency.
      if (lot.costNumber && lot.costCurrency) {
        const rate = priceMap.getRate(lot.currency, lot.costCurrency, date);
        if (rate) return [lot.costCurrency, lot.number.times(rate)];
        return [lot.costCurrency, lot.number.times(lot.costNumber)];
      }
      return [lot.currency, lot.number];
    }
    case "currency": {
      // convert_position to the first target: direct price, else a cost-currency
      // two-hop (units → cost.ccy → target), else the raw units.
      const target = conversion.targets[0];
      const direct = priceMap.getRate(lot.currency, target, date);
      if (direct) return [target, lot.number.times(direct)];
      if (lot.costCurrency && lot.costCurrency !== target) {
        const r1 = priceMap.getRate(lot.currency, lot.costCurrency, date);
        if (r1) {
          const r2 = priceMap.getRate(lot.costCurrency, target, date);
          if (r2) return [target, lot.number.times(r1).times(r2)];
        }
      }
      return [lot.currency, lot.number];
    }
  }
}

/**
 * A `(units.currency, cost)`-keyed inventory mirroring beancount's `Inventory`:
 * postings net into their matching lot, and {@link reduce} values every lot under
 * a {@link Conversion}.
 */
export class LotInventory {
  private readonly lots = new Map<string, Lot>();

  /** Net a posting's units into its `(currency, cost)` lot. */
  addPosting(posting: PostingJson): void {
    if (!posting.units) return;
    const perUnit = bookedCostPerUnit(posting);
    const costNumber = perUnit?.number ?? null;
    const costCurrency = perUnit?.currency ?? null;
    const key = lotKey(posting.units.currency, costNumber, costCurrency);
    const incoming = new Amount(posting.units.number);
    const existing = this.lots.get(key);
    if (existing) {
      existing.number = existing.number.plus(incoming);
      return;
    }
    this.lots.set(key, {
      number: incoming,
      currency: posting.units.currency,
      costNumber,
      costCurrency,
    });
  }

  /** A deep copy (for the running-inventory snapshots the line charts take). */
  clone(): LotInventory {
    const copy = new LotInventory();
    this.lots.forEach((lot, key) => copy.lots.set(key, { ...lot }));
    return copy;
  }

  /** Net another inventory's lots into this one (account-tree ancestor roll-up). */
  merge(other: LotInventory): void {
    other.lots.forEach((lot, key) => {
      const existing = this.lots.get(key);
      if (existing) existing.number = existing.number.plus(lot.number);
      else this.lots.set(key, { ...lot });
    });
  }

  /** Reduce every lot to a `currency -> amount` map under `conversion`. */
  reduce(
    conversion: Conversion,
    priceMap: PriceMap,
    date: string | undefined,
  ): Map<string, BigNumber> {
    let out = new Map<string, BigNumber>();
    // First pass — value each lot (cost-aware) into targets[0] (or the sole
    // target for non-currency conversions).
    this.lots.forEach((lot) => {
      const [currency, value] = valueLot(lot, conversion, priceMap, date);
      addInto(out, currency, value);
    });

    // Multi-currency conversion (`convert_position` chained, fava
    // `_CurrencyConversion.apply`): a currency that failed targets[0] gets a
    // shot at targets[1], then targets[2], … The result after the first pass is
    // COST-LESS, so each subsequent hop is a plain price lookup (or passthrough
    // when still unconvertible). Without this, a GBP position with only a
    // GBP→EUR price under `"USD,EUR"` wrongly stays GBP instead of becoming EUR.
    if (conversion.kind === "currency") {
      for (let i = 1; i < conversion.targets.length; i += 1) {
        const target = conversion.targets[i];
        const next = new Map<string, BigNumber>();
        out.forEach((amount, currency) => {
          const rate = priceMap.getRate(currency, target, date);
          if (rate) addInto(next, target, amount.times(rate));
          else addInto(next, currency, amount);
        });
        out = next;
      }
    }
    return out;
  }
}

/** Net `value` into `map[currency]`. */
function addInto(
  map: Map<string, BigNumber>,
  currency: string,
  value: BigNumber,
): void {
  const existing = map.get(currency);
  map.set(currency, existing ? existing.plus(value) : value);
}
