import type { DirectiveJson } from "@rustledger/wasm";
import { BadUserInputError } from "@/shared/errors";

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
 * - a currency the ledger knows → that code, a `convert_position` target.
 * - anything else → `BadUserInputError` (w23/156): an unknown code used to
 *   pass through and degrade to units figures downstream without surfacing
 *   anything, so `?conversion=BOGUS` read as an honest USD report.
 *
 * The known set must come from the FULL snapshot, never the report's
 * filtered/clamped stream: a `time`/`account` filter that hides a
 * commodity must not make a convertible target refuse. Unknown-to-ledger
 * is a necessary condition for unresolvable, so the check never refuses
 * a working conversion; known-but-unpriced targets still degrade
 * silently (the disclosure half, still open).
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
  knownCommodities: ReadonlySet<string>,
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
    default: {
      // The operating currency always passes: it is the default target,
      // which cannot refuse, so the explicit spelling must agree with it.
      if (conversion === operatingCurrency || knownCommodities.has(conversion)) {
        return { directives, target: conversion };
      }
      const known = [...knownCommodities].sort();
      const shown =
        known.length === 0
          ? ""
          : ` (${known.slice(0, 10).join(", ")}${known.length > 10 ? ", …" : ""})`;
      throw new BadUserInputError(
        `Unsupported conversion "${conversion}": pass "units", "at_cost", "at_value", or a currency in this ledger${shown}.`,
      );
    }
  }
}

/**
 * Every currency/commodity code named anywhere in the directives —
 * posting units, costs, and price annotations; balances; opens;
 * commodity and price directives; custom currency/amount values.
 *
 * Conservative by construction: a missed source would refuse a working
 * conversion, while an extra code only preserves the old pass-through
 * for a target that degrades downstream (the disclosure half).
 */
export function collectLedgerCommodities(
  directives: DirectiveJson[],
): Set<string> {
  const found = new Set<string>();
  for (const directive of directives) {
    switch (directive.type) {
      case "transaction":
        for (const posting of directive.postings) {
          if (posting.units?.currency) found.add(posting.units.currency);
          if (posting.cost?.currency) found.add(posting.cost.currency);
          if (posting.price?.currency) found.add(posting.price.currency);
        }
        break;
      case "balance":
        found.add(directive.amount.currency);
        break;
      case "open":
        for (const currency of directive.currencies) found.add(currency);
        break;
      case "commodity":
        found.add(directive.currency);
        break;
      case "price":
        found.add(directive.currency);
        found.add(directive.amount.currency);
        break;
      case "custom":
        for (const value of directive.values ?? []) {
          if (value.type === "currency") found.add(value.value);
          else if (value.type === "amount") found.add(value.value.currency);
        }
        break;
      default:
        break;
    }
  }
  return found;
}
