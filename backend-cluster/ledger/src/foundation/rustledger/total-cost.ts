import BigNumber from "bignumber.js";
import { divideWithPythonDecimalContext } from "./decimal-context";

/**
 * Shared resolution of a TOTAL cost component (`{{1000 USD}}`) to its per-unit
 * cost, following beancount's CostSpec booking
 * (`beancount/parser/booking_full.py::compute_cost_number`, verified against
 * beancount 3.2.0):
 *
 * ```python
 * cost_total = number_total
 * units_number = abs(units.number)      # <- ABS, not the signed number
 * if number_per is not None:
 *     cost_total += number_per * units_number
 * unit_cost = cost_total / units_number
 * ```
 *
 * The divisor is `abs(units.number)`: a cost is a (sign-free) per-unit basis —
 * the sign of a reduction lives in the UNITS. So `-10 HOOL {{1000 USD}}` books
 * at per-unit `100` and values to `-1000 USD` total; dividing by the signed
 * units would book per-unit `-100` and flip the valuation to `+1000 USD`.
 *
 * Used by every site that maps a rustledger `total` cost kind to a per-unit
 * cost — `lot-inventory.ts`, `journal-running-balance.ts`, `time-clamp.ts` —
 * so the three agree on the abs() semantics.
 */

/**
 * `total / abs(units)` — the booked per-unit cost of a total-cost component.
 * Returns `null` when the units are missing or zero: a bare total is not
 * resolvable to a per-unit without a usable unit count.
 */
export function perUnitFromTotalCost(
  totalNumber: string,
  unitsNumber: string | undefined,
): BigNumber | null {
  if (unitsNumber === undefined) return null;
  const units = new BigNumber(unitsNumber);
  if (units.isZero()) return null;
  return divideWithPythonDecimalContext(totalNumber, units.abs());
}

function scaleOf(source: string): number {
  const dot = source.indexOf(".");
  if (dot === -1) return 0;
  const exponent = source.search(/[eE]/u);
  return (exponent === -1 ? source.length : exponent) - dot - 1;
}

/** Resolve total cost while preserving Python Decimal's exact-result scale. */
export function perUnitFromTotalCostString(
  totalNumber: string,
  unitsNumber: string | undefined,
): string | null {
  const perUnit = perUnitFromTotalCost(totalNumber, unitsNumber);
  if (perUnit === null) return null;
  const idealScale = Math.max(
    scaleOf(totalNumber) - scaleOf(unitsNumber ?? ""),
    0,
  );
  return perUnit.toFixed(Math.max(perUnit.decimalPlaces() ?? 0, idealScale));
}
