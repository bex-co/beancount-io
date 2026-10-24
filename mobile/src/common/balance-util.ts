/**
 * How flows and history value commodity holdings: the Reports income
 * statement, and every journal and running balance.
 *
 * This is a **fava conversion keyword** ("at_cost", "at_value", "units"), not a
 * currency code — a trap, because the schema defaults most of these queries to
 * the string `"USD"`, which fava doesn't recognize as a conversion and therefore
 * treats as `units`. The balances then come back as raw share counts
 * (`{USD: 2677.28, ITOT: 113, GLD: 11, …}`), so reading `.USD` off them yields
 * only the cash: a ledger worth $96,156.71 reported $2,677.28.
 *
 * `at_cost` values each holding at what was paid for it, which is what a
 * posting recorded and what the web dashboard's reports default to.
 * Commodities with no cost in the ledger's currency (vacation hours, placeholder
 * IRA units) stay unconverted under their own key and are ignored by
 * `resolveCurrencyBalance` — matching the dashboard.
 */
import { decimalOf, parseDecimal } from "./decimal-number";

export const BALANCE_CONVERSION = "at_cost";

/**
 * How balances value commodity holdings: Home, the Accounts tab, and account
 * detail's header and chart (w4/m26).
 *
 * `at_value` values a holding at the latest price on or before the figure's
 * date, in its cost currency, and at its cost when the ledger has no such
 * price; a holding with no cost stays in its units, exactly as under
 * `at_cost`. A cash-only ledger therefore reads the same either way. What each
 * figure then says about its basis — price date, holdings still at cost — is
 * `valuation.ts`.
 */
export const VALUATION_CONVERSION = "at_value";

/**
 * Resolve a single currency balance from a beancount `balance_children` /
 * `balance` map in the active currency, coercing string amounts to numbers and
 * treating missing/invalid values as 0. Shared by the account selectors so the
 * string/number rules live in one place.
 *
 * A map without the active currency reads 0: it used to read its USD entry,
 * which callers then printed with the active currency's symbol, so a EUR
 * ledger showed its dollar accounts as euros (w21/058). Its other holdings are
 * what `notInTotalOf` discloses.
 */
export function resolveCurrencyBalance(
  balanceChildren: Record<string, number | string> | null | undefined,
  currency: string,
): number {
  if (!balanceChildren) {
    return 0;
  }
  const value = balanceChildren[currency] ?? 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return typeof value === "number" ? value : 0;
}

/**
 * `resolveCurrencyBalance` as the ledger's exact decimal: a double turns its
 * 9007199254740993 into …992, which a budget then judged as on target
 * (w4/1039).
 */
export function resolveCurrencyBalanceExact(
  balanceChildren: Record<string, number | string> | null | undefined,
  currency: string,
): string {
  const value = balanceChildren?.[currency];
  if (typeof value === "string") return parseDecimal(value) ?? "0";
  return typeof value === "number" ? decimalOf(value) : "0";
}
