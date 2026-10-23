import {
  negateDecimalNumber,
  parseDecimalNumber,
  sumDecimalNumbers,
} from "@/common/lib/beancount/decimal-number";

/**
 * Amounts keyed by their currency unit.
 *
 * `{ USD: "386.22", VACHR: "25" }` holds two numbers that are not
 * commensurable: no price was supplied, so adding them yields neither a dollar
 * total nor a conversion. Charts that sum their own parts — a Sankey into node
 * totals and Savings, a pie into the denominator behind its percentages — can
 * therefore be truthful in only one unit, so they choose one and disclose the
 * rest.
 *
 * Each amount is the ledger's decimal, summed exactly, so chart text can show
 * it as recorded; geometry takes `Number(amount)`. A double would read
 * 9007199254740993 as …992 and 4.00995 as 4.01 before any label saw it
 * (w4/m53).
 */
export type UnitAmounts = Map<string, string>;

function addAmount(into: UnitAmounts, unit: string, amount: string): void {
  if (Number(amount) === 0) return;
  const existing = into.get(unit);
  into.set(
    unit,
    existing === undefined ? amount : sumDecimalNumbers([existing, amount]),
  );
}

/** Merge one unit map into another, unit by unit. */
export function mergeAmounts(into: UnitAmounts, from: UnitAmounts): void {
  from.forEach((amount, unit) => addAmount(into, unit, amount));
}

/**
 * One rule for turning an API amount into a number: `Number`, so a malformed
 * value becomes NaN and is skipped rather than silently truncated the way
 * `parseFloat("12abc")` would.
 */
export function toFiniteAmount(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

/**
 * The same rule, keeping the API amount as the ledger's decimal: `null` for
 * anything `toFiniteAmount` rejects or that is not a plain decimal.
 */
export function toExactAmount(value: unknown): string | null {
  return toFiniteAmount(value) === null
    ? null
    : parseDecimalNumber(String(value));
}

/** Read every unit a balance carries, rather than USD-or-whatever-is-first. */
export function readBalance(
  balance: Record<string, unknown> | null | undefined,
  inverse: boolean,
  into: UnitAmounts,
): void {
  if (!balance) return;
  for (const [unit, raw] of Object.entries(balance)) {
    const exact = toExactAmount(raw);
    if (exact === null) continue;
    addAmount(into, unit, inverse ? negateDecimalNumber(exact) : exact);
  }
}

export function balanceToAmounts(
  balance: Record<string, unknown> | null | undefined,
  inverse = false,
): UnitAmounts {
  const amounts: UnitAmounts = new Map();
  readBalance(balance, inverse, amounts);
  return amounts;
}

/**
 * Choose the one unit a chart speaks in.
 *
 * The ledger's declared operating currency wins when the accounts actually
 * hold it — it is the same signal the net-worth and account cards already
 * show, so the diagram agrees with the rest of the page. Otherwise the unit
 * the most accounts are denominated in is the one that describes the ledger;
 * ties go to the larger total and then to alphabetical order, so the choice is
 * stable across renders rather than dependent on object key order.
 *
 * The fallback matters on thin ledgers: with one account on each side the
 * count tier ties, and magnitude alone would draw the whole diagram in a large
 * retirement account's unit.
 */
export function chooseDisplayUnit(
  entries: Iterable<UnitAmounts>,
  preferred?: string | null,
): string | null {
  const accounts = new Map<string, number>();
  const magnitude = new Map<string, number>();
  for (const amounts of entries) {
    amounts.forEach((amount, unit) => {
      accounts.set(unit, (accounts.get(unit) ?? 0) + 1);
      magnitude.set(
        unit,
        (magnitude.get(unit) ?? 0) + Math.abs(Number(amount)),
      );
    });
  }

  if (preferred && accounts.has(preferred)) return preferred;

  let best: string | null = null;
  for (const unit of accounts.keys()) {
    if (best === null) {
      best = unit;
      continue;
    }
    const byAccounts = (accounts.get(unit) ?? 0) - (accounts.get(best) ?? 0);
    const byMagnitude = (magnitude.get(unit) ?? 0) - (magnitude.get(best) ?? 0);
    if (byAccounts > 0 || (byAccounts === 0 && byMagnitude > 0)) best = unit;
    else if (byAccounts === 0 && byMagnitude === 0 && unit < best) best = unit;
  }
  return best;
}

/** Every unit present, sorted, so a chart can disclose what it leaves out. */
export function collectUnits(entries: Iterable<UnitAmounts>): string[] {
  const units = new Set<string>();
  for (const amounts of entries) {
    amounts.forEach((_, unit) => units.add(unit));
  }
  return [...units].sort();
}

/** The units a chart drawn in `unit` is not showing. */
export function omittedUnits(units: string[], unit: string | null): string[] {
  return units.filter((candidate) => candidate !== unit);
}
