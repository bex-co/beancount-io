/**
 * Resolve a single currency balance from a beancount `balance_children` /
 * `balance` map: prefer the active currency, fall back to USD, coerce string
 * amounts to numbers, and treat missing/invalid values as 0. Shared by the
 * account selectors so the string/number + USD-fallback rules live in one place.
 */
export function resolveCurrencyBalance(
  balanceChildren: Record<string, number | string> | null | undefined,
  currency: string,
): number {
  if (!balanceChildren) {
    return 0;
  }
  const value =
    currency in balanceChildren
      ? balanceChildren[currency]
      : (balanceChildren.USD ?? 0);
  if (typeof value === "string") {
    const parsed = Number(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return typeof value === "number" ? value : 0;
}
