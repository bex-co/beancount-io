/**
 * Amounts keyed by their currency unit.
 *
 * The ledger's balances are maps like `{ USD: 386.22, VACHR: 25 }`, and the two
 * numbers are not commensurable: no price was supplied, so adding them produces
 * a figure that is neither a dollar total nor a conversion. Every overview
 * chart carries amounts this way and never sums across keys.
 *
 * Charts that add their own parts together — a Sankey into node totals and
 * Savings, a pie into the denominator behind its percentages — can only be
 * truthful in one unit, so they choose one and disclose the rest.
 */
export type UnitAmounts = Map<string, number>;

export function addAmount(
  into: UnitAmounts,
  unit: string,
  amount: number,
): void {
  if (!Number.isFinite(amount) || amount === 0) return;
  into.set(unit, (into.get(unit) ?? 0) + amount);
}

/** Merge one unit map into another, unit by unit. */
export function mergeAmounts(into: UnitAmounts, from: UnitAmounts): void {
  from.forEach((amount, unit) => addAmount(into, unit, amount));
}

/** Read every unit a balance carries, rather than USD-or-whatever-is-first. */
export function readBalance(
  balance: Record<string, unknown> | null | undefined,
  inverse: boolean,
  into: UnitAmounts,
): void {
  if (!balance) return;
  for (const [unit, raw] of Object.entries(balance)) {
    const num = typeof raw === "string" ? parseFloat(raw) : Number(raw);
    if (!Number.isFinite(num)) continue;
    addAmount(into, unit, inverse ? -num : num);
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
 * The unit the most accounts are denominated in is the one that describes the
 * ledger; ties go to the larger total and then to alphabetical order, so the
 * choice is stable across renders rather than dependent on object key order.
 */
export function chooseDisplayUnit(
  entries: Iterable<UnitAmounts>,
): string | null {
  const accounts = new Map<string, number>();
  const magnitude = new Map<string, number>();
  for (const amounts of entries) {
    amounts.forEach((amount, unit) => {
      accounts.set(unit, (accounts.get(unit) ?? 0) + 1);
      magnitude.set(unit, (magnitude.get(unit) ?? 0) + Math.abs(amount));
    });
  }

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
