/**
 * Running-balance label for an account journal row. Uses the signed money
 * formatter so negative asset balances keep their minus (e.g. -$0.02). Do not
 * use the unsigned helper here — it Math.abs's the value.
 *
 * Free of `@/` imports so the jest-lite runner can require it.
 */
import { formatSignedMoneyWithCurrency } from "../../../common/number-utils";

export function formatAccountJournalBalance(
  balance: number,
  currency: string,
): string {
  return formatSignedMoneyWithCurrency(balance, currency);
}
