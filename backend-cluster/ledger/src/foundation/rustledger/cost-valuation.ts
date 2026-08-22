import type { DirectiveJson } from "@rustledger/wasm";

/**
 * Resolve a Fava report "conversion" keyword/currency (`fava/core/conversion.py`)
 * into the `(directives, target)` pair the balance accumulators consume. The
 * accumulators keep cost-lot inventories ({@link "./lot-inventory".LotInventory})
 * and value them under a {@link "./lot-inventory".Conversion} derived from
 * `target` — so `target` carries the conversion, and the directive stream is
 * passed through UNCHANGED (no book-value rewrite):
 *
 * - `at_cost`  → `"at_cost"` — each lot at `units × cost`, in the cost currency.
 * - `at_value` → `"at_value"` — Fava `get_market_value`: price at the valuation
 *   date, else the COST value (NOT the raw units); in the cost currency.
 * - `units`    → `"units"` — raw units, no conversion.
 * - `undefined` / `""` → the operating currency (Fava's default report
 *   conversion is the operating currency, e.g. `"USD"`).
 * - any other string → that currency code, a `convert_position` target.
 */

/** A resolved report valuation: the directive stream to sum + the value target. */
export interface ReportValuation {
  directives: DirectiveJson[];
  /** A currency code, or a reserved keyword (`units`/`at_cost`/`at_value`). */
  target: string;
}

export function resolveConversion(
  conversion: string | undefined,
  directives: DirectiveJson[],
  operatingCurrency: string,
): ReportValuation {
  switch (conversion) {
    case "at_cost":
      return { directives, target: "at_cost" };
    case "units":
      return { directives, target: "units" };
    case "at_value":
      return { directives, target: "at_value" };
    case undefined:
    case "":
      return { directives, target: operatingCurrency };
    default:
      return { directives, target: conversion };
  }
}
