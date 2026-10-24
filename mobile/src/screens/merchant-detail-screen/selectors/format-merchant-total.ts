/**
 * Presentation for one merchant-header currency total.
 *
 * The totals query returns the payee's signed net Expenses/Income sum per
 * currency, so the minus is the only thing telling a refund or income-heavy
 * merchant (Broker, an employer) apart from an expense of the same size. The
 * global `formatMoneyWithCurrency` is deliberately unsigned, so the header
 * uses the signed formatter instead — without a "+" on non-negative totals.
 *
 * A total that rounds to zero cents shows unsigned ("$0.00", never "-$0.00").
 *
 * Free of `@/` value imports so the jest-lite runner can require it.
 */

import { getCurrencySymbol } from "../../../common/currency-util";
import {
  formatSignedMoneyWithCode,
  formatSignedMoneyWithCurrency,
} from "../../../common/number-utils";
import type { MerchantCurrencyTotal } from "./merchant-stats";

export function formatMerchantTotal({
  total,
  currency,
}: MerchantCurrencyTotal): string {
  // No clamp here: the formatter rounds to the currency's own digits and drops
  // the sign of a total that shows as zero, so USD dust reads $0.00 and 0.004
  // BTC stays 0.004 BTC (w21/663).
  return formatSignedMoneyWithCurrency(total, currency);
}

/**
 * One amount, by code where its symbol is taken. `$` is the symbol of USD, CAD,
 * AUD and MXN, `¥` of CNY and JPY, `kr` of SEK, NOK and DKK, so a merchant paid
 * in two of them read two identical "$42.50" lines (w21/535). A symbol is taken
 * when the ledger's primary currency or one of `others` shares it: USD read
 * "$120.00" over its own rows' "−60.00 USD" in a CAD ledger, whose "$" Home
 * uses for CAD (w21/719). The primary currency always keeps its symbol, and
 * so does USD: another dollar currency reads by code, as its rows do, so a CAD
 * merchant in a EUR ledger no longer read "$150.00" over "-150.00 CAD" (w21/896).
 */
export function formatMerchantAmount(
  row: MerchantCurrencyTotal,
  primaryCurrency?: string,
  others: readonly string[] = [],
): string {
  const symbol = getCurrencySymbol(row.currency);
  const otherDollar =
    primaryCurrency !== undefined &&
    symbol === "$" &&
    row.currency !== "USD" &&
    row.currency !== primaryCurrency;
  const taken =
    otherDollar ||
    (symbol !== "" &&
      row.currency !== primaryCurrency &&
      [...others, ...(primaryCurrency ? [primaryCurrency] : [])].some(
        (other) =>
          other !== row.currency && getCurrencySymbol(other) === symbol,
      ));
  return taken
    ? formatSignedMoneyWithCode(row.total, row.currency)
    : formatMerchantTotal(row);
}

/** The header's total lines, each read as {@link formatMerchantAmount} reads it. */
export function formatMerchantTotals(
  totals: readonly MerchantCurrencyTotal[],
  primaryCurrency?: string,
): string[] {
  const currencies = totals.map((row) => row.currency);
  return totals.map((row) =>
    formatMerchantAmount(row, primaryCurrency, currencies),
  );
}
