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

import { formatSignedMoneyWithCurrency } from "../../../common/number-utils";
import type { MerchantCurrencyTotal } from "./merchant-stats";

export function formatMerchantTotal({
  total,
  currency,
}: MerchantCurrencyTotal): string {
  const shown = Math.abs(total) < 0.005 ? 0 : total;
  return formatSignedMoneyWithCurrency(shown, currency);
}
