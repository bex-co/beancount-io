/**
 * Running-balance and change labels for the account journal. Uses the same
 * recorded-scale treatment as the transactions list (`formatAmount`), not the
 * cents-only `groupThousands` path used for aggregate balances elsewhere.
 *
 * Free of `@/` imports so the jest-lite runner can require it.
 */
import { formatAmount } from "../../../screens/transactions-screen/utils/transaction-display-utils";

export function formatAccountJournalBalance(
  balance: number,
  currency: string,
  scale = 2,
): string {
  const sign = balance < 0 ? "-" : "";
  return `${sign}${formatAmount(balance, currency, scale)}`;
}

export function formatAccountJournalChange(
  change: number,
  currency: string,
  scale = 2,
): string {
  const sign = change > 0 ? "+" : change < 0 ? "-" : "";
  return `${sign}${formatAmount(change, currency, scale)}`;
}
