import {
  isJournalTransaction,
  JournalDirectiveType,
} from "../../transactions-screen/types";

/**
 * Signed display amount for a transaction, computed honestly from its postings
 * (no fabricated numbers): the net change to the user's Assets/Liabilities in
 * the active currency — negative means money left the account (spending),
 * positive means money came in. Falls back to the negated Expenses/Income
 * total when a transaction has no asset/liability legs.
 *
 * Returns null when there is nothing to display (not a transaction, or no
 * postings in the active currency).
 */
export function getSignedTransactionAmount(
  entry: JournalDirectiveType,
  currency: string,
): number | null {
  if (!isJournalTransaction(entry)) {
    return null;
  }

  const postings = entry.postings ?? [];
  let assetLiabilityTotal = 0;
  let hasAssetLiability = false;
  let expenseIncomeTotal = 0;
  let matched = false;

  for (const posting of postings) {
    const units = posting.units;
    if (!units || units.currency !== currency) {
      continue;
    }
    const amount = Number(units.number);
    if (isNaN(amount)) {
      continue;
    }
    matched = true;
    if (
      posting.account.startsWith("Assets") ||
      posting.account.startsWith("Liabilities")
    ) {
      assetLiabilityTotal += amount;
      hasAssetLiability = true;
    } else if (
      posting.account.startsWith("Expenses") ||
      posting.account.startsWith("Income")
    ) {
      expenseIncomeTotal += amount;
    }
  }

  if (!matched) {
    return null;
  }
  return hasAssetLiability ? assetLiabilityTotal : -expenseIncomeTotal;
}

/** Format a signed amount with an explicit +/- sign and currency symbol. */
export function formatSignedAmount(
  amount: number,
  currencySymbol: string,
): string {
  const sign = amount < 0 ? "-" : amount > 0 ? "+" : "";
  return `${sign}${currencySymbol}${Math.abs(amount).toFixed(2)}`;
}
