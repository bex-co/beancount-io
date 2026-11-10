import BigNumber from "bignumber.js";
import type { PostingJson } from "@rustledger/wasm";
import type { PriceMap } from "./price-map";
import { perUnitFromTotalCost, perUnitFromTotalCostString } from "./total-cost";
import { writtenScale } from "./decimal-context";

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
  /** Decimal places the lot's units were written with, at their widest. */
  scale: number;
  currency: string;
  costNumber: BigNumber | null;
  /** Decimal places the per-unit cost was written with, at their widest. */
  costScale: number;
  costCurrency: string | null;
}

/** An amount, its currency, and the decimal places Python's `Decimal` keeps. */
type ValuedAmount = [currency: string, value: BigNumber, scale: number];

/**
 * How an inventory is valued before display — Fava's conversion keywords. A bare
 * currency code (or comma list) is a `convert_position` target; the reserved
 * keywords select the cost-aware reducers. `units_by_cost` is ours, not
 * Fava's: raw units keyed by {@link unitsByCostKey}, so a client can tell
 * which units are held at a cost, in which currency, and which without one
 * (w4/m58).
 */
export type Conversion =
  | { kind: "units" }
  | { kind: "at_cost" }
  | { kind: "at_value" }
  | { kind: "units_by_cost" }
  | { kind: "currency"; targets: string[] };

/**
 * The `units_by_cost` key for units of `currency` held at a cost in
 * `costCurrency` — beancount's own `10 VTI {EUR}` notation — or `VTI {}`
 * for units held without a cost.
 */
function unitsByCostKey(currency: string, costCurrency: string | null): string {
  return `${currency} {${costCurrency ?? ""}}`;
}

/**
 * Parse the legacy `target` string the accumulators receive into a
 * {@link Conversion}. The reserved keywords `units` / `at_cost` / `at_value`
 * select a cost-aware reducer; anything else is a currency code (or `,`-list).
 */
export function parseConversion(target: string): Conversion {
  if (target === "units") return { kind: "units" };
  if (target === "at_cost") return { kind: "at_cost" };
  if (target === "at_value") return { kind: "at_value" };
  if (target === "units_by_cost") return { kind: "units_by_cost" };
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
): { number: BigNumber; currency: string; scale: number } | null {
  const cost = posting.cost;
  if (!cost || !cost.number || !cost.currency) return null;
  const n = cost.number;
  const unitsNumber = posting.units?.number;
  // The places a per-unit cost carries into a valued amount, as Python's
  // `Decimal` keeps them: as written, and for a total divided by the units the
  // exact quotient's ideal places (`1000.00 / 10` is `100.00`, w22/016).
  const resolvedScale = (total: string, perUnit: BigNumber): number =>
    Math.max(
      perUnit.decimalPlaces() ?? 0,
      writtenScale(perUnitFromTotalCostString(total, unitsNumber) ?? ""),
    );
  switch (n.kind) {
    case "per_unit":
      return {
        number: new Amount(n.value),
        currency: cost.currency,
        scale: writtenScale(n.value),
      };
    case "per_unit_from_total":
      return {
        number: new Amount(n.per_unit),
        currency: cost.currency,
        scale: writtenScale(n.per_unit),
      };
    case "compound": {
      const totalPart = perUnitFromTotalCost(n.total, unitsNumber);
      if (totalPart === null) {
        return {
          number: new Amount(n.per_unit),
          currency: cost.currency,
          scale: writtenScale(n.per_unit),
        };
      }
      return {
        number: new Amount(n.per_unit).plus(totalPart),
        currency: cost.currency,
        // A sum keeps the wider operand's places.
        scale: Math.max(
          writtenScale(n.per_unit),
          resolvedScale(n.total, totalPart),
        ),
      };
    }
    case "total": {
      const perUnit = perUnitFromTotalCost(n.value, unitsNumber);
      if (perUnit === null) return null;
      return {
        number: perUnit,
        currency: cost.currency,
        scale: resolvedScale(n.value, perUnit),
      };
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

/**
 * Value one lot under `conversion`, returning `[currency, amount, scale]`. The
 * scale is Python's `Decimal` rule: a product's places are the sum of its
 * operands' (`10 × 180.00` is `1800.00`), where the `BigNumber` product alone
 * would say `1800` (w22/016).
 */
function valueLot(
  lot: Lot,
  conversion: Conversion,
  priceMap: PriceMap,
  date: string | undefined,
): ValuedAmount {
  switch (conversion.kind) {
    case "units":
      return [lot.currency, lot.number, lot.scale];
    case "units_by_cost":
      return [
        unitsByCostKey(lot.currency, lot.costCurrency),
        lot.number,
        lot.scale,
      ];
    case "at_cost":
      // get_cost: units × per-unit cost, in the cost currency (else raw units).
      if (lot.costNumber && lot.costCurrency) {
        return [
          lot.costCurrency,
          lot.number.times(lot.costNumber),
          lot.scale + lot.costScale,
        ];
      }
      return [lot.currency, lot.number, lot.scale];
    case "at_value": {
      // get_market_value: price(units→cost.ccy) × units, else the COST value —
      // in the cost currency; a cost-less lot stays in its units currency.
      if (lot.costNumber && lot.costCurrency) {
        const rate = priceMap.getScaledRate(lot.currency, lot.costCurrency, date);
        if (rate) {
          return [
            lot.costCurrency,
            lot.number.times(rate.value),
            lot.scale + rate.scale,
          ];
        }
        return [
          lot.costCurrency,
          lot.number.times(lot.costNumber),
          lot.scale + lot.costScale,
        ];
      }
      return [lot.currency, lot.number, lot.scale];
    }
    case "currency": {
      // convert_position to the first target: direct price, else a cost-currency
      // two-hop (units → cost.ccy → target), else the raw units.
      const target = conversion.targets[0];
      const direct = priceMap.getScaledRate(lot.currency, target, date);
      if (direct) {
        return [
          target,
          lot.number.times(direct.value),
          lot.scale + direct.scale,
        ];
      }
      if (lot.costCurrency && lot.costCurrency !== target) {
        const r1 = priceMap.getScaledRate(lot.currency, lot.costCurrency, date);
        if (r1) {
          const r2 = priceMap.getScaledRate(lot.costCurrency, target, date);
          if (r2) {
            return [
              target,
              lot.number.times(r1.value).times(r2.value),
              lot.scale + r1.scale + r2.scale,
            ];
          }
        }
      }
      return [lot.currency, lot.number, lot.scale];
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
    const costScale = perUnit?.scale ?? 0;
    const costCurrency = perUnit?.currency ?? null;
    const key = lotKey(posting.units.currency, costNumber, costCurrency);
    const incoming = new Amount(posting.units.number);
    const scale = writtenScale(posting.units.number);
    const existing = this.lots.get(key);
    if (existing) {
      existing.number = existing.number.plus(incoming);
      existing.scale = Math.max(existing.scale, scale);
      existing.costScale = Math.max(existing.costScale, costScale);
      return;
    }
    this.lots.set(key, {
      number: incoming,
      scale,
      currency: posting.units.currency,
      costNumber,
      costScale,
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
      if (existing) {
        existing.number = existing.number.plus(lot.number);
        existing.scale = Math.max(existing.scale, lot.scale);
        existing.costScale = Math.max(existing.costScale, lot.costScale);
      } else this.lots.set(key, { ...lot });
    });
  }

  /** Reduce every lot to a `currency -> amount` map under `conversion`. */
  reduce(
    conversion: Conversion,
    priceMap: PriceMap,
    date: string | undefined,
  ): Map<string, BigNumber> {
    const out = new Map<string, BigNumber>();
    this.reduceScaled(conversion, priceMap, date).forEach(
      ({ value }, currency) => out.set(currency, value),
    );
    return out;
  }

  /**
   * {@link reduce}, keeping each amount's decimal places: the units' written
   * scale where they pass through unconverted (`1250.50 EUR` stays two
   * places), the units' plus the cost's or price's written places where they
   * are valued (`10 × 180.00` is `1800.00`, as Python's `Decimal` multiplies),
   * the widest across a sum.
   * Serialised with `toString()`, `0.00000050` went out as `5e-7` and
   * `1250.50` as `1250.5`, and clients read the display scale from that
   * string (w21/125).
   */
  reduceScaled(
    conversion: Conversion,
    priceMap: PriceMap,
    date: string | undefined,
  ): Map<string, { value: BigNumber; scale: number }> {
    let out = new Map<string, { value: BigNumber; scale: number }>();
    // First pass — value each lot (cost-aware) into targets[0] (or the sole
    // target for non-currency conversions).
    this.lots.forEach((lot) => {
      const [currency, value, scale] = valueLot(
        lot,
        conversion,
        priceMap,
        date,
      );
      addScaledInto(out, currency, value, scale);
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
        const next = new Map<string, { value: BigNumber; scale: number }>();
        out.forEach(({ value, scale }, currency) => {
          const rate = priceMap.getScaledRate(currency, target, date);
          if (rate) {
            addScaledInto(
              next,
              target,
              value.times(rate.value),
              scale + rate.scale,
            );
          } else addScaledInto(next, currency, value, scale);
        });
        out = next;
      }
    }
    return out;
  }
}

/** Net `value` into `map[currency]`, keeping the widest scale. */
function addScaledInto(
  map: Map<string, { value: BigNumber; scale: number }>,
  currency: string,
  value: BigNumber,
  scale: number,
): void {
  const existing = map.get(currency);
  map.set(
    currency,
    existing
      ? {
          value: existing.value.plus(value),
          scale: Math.max(existing.scale, scale),
        }
      : { value, scale },
  );
}


