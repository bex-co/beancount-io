/**
 * How every balance query should value commodity holdings.
 *
 * This is a **fava conversion keyword** ("at_cost", "at_value", "units"), not a
 * currency code — a trap, because the schema defaults most of these queries to
 * the string `"USD"`, which fava doesn't recognize as a conversion and therefore
 * treats as `units`. The balances then come back as raw share counts
 * (`{USD: 2677.28, ITOT: 113, GLD: 11, …}`), so reading `.USD` off them yields
 * only the cash: a ledger worth $96,156.71 reported $2,677.28.
 *
 * `at_cost` values each holding at what was paid for it and is what the web
 * dashboard shows; it's also the default the account-journal input already uses,
 * which is why journal running balances were right while the charts beside them
 * were not. Commodities with no cost in the ledger's currency (vacation hours,
 * placeholder IRA units) stay unconverted under their own key and are ignored by
 * `resolveCurrencyBalance` — matching the dashboard.
 */
export const BALANCE_CONVERSION = "at_cost";

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
