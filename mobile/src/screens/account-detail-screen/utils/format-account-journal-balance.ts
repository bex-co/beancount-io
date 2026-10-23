/**
 * Running-balance and change labels for the account journal. Uses the same
 * recorded-scale treatment as the transactions list (`formatAmount`), not the
 * cents-only `groupThousands` path used for aggregate balances elsewhere.
 *
 * Free of `@/` imports so the jest-lite runner can require it.
 */
import { formatAmount } from "../../../screens/transactions-screen/utils/transaction-display-utils";

/**
 * `value` as it is shown at `scale`, so its sign is the shown figure's: a
 * change of −0.003 USD read a red "-$0.00" under a "$0.00" day (w21/784).
 * `+ 0` turns a rounded -0 into 0.
 */
function roundedAtScale(value: number, scale: number): number {
  return Number(value.toFixed(Math.min(100, Math.max(0, scale)))) + 0;
}

export function formatAccountJournalBalance(
  balance: number,
  currency: string,
  scale = 2,
): string {
  const sign = roundedAtScale(balance, scale) < 0 ? "-" : "";
  return `${sign}${formatAmount(balance, currency, scale)}`;
}

export function formatAccountJournalChange(
  change: number,
  currency: string,
  scale = 2,
): string {
  const shown = roundedAtScale(change, scale);
  const sign = shown > 0 ? "+" : shown < 0 ? "-" : "";
  return `${sign}${formatAmount(change, currency, scale)}`;
}
