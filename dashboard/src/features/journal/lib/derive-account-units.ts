import {
  type JournalDirectiveType,
  isJournalTransaction,
} from "@/common/types/journal";
import { sumDecimalNumbers } from "@/common/lib/beancount/decimal-number";

/** Whether a posting account belongs to the journal's selected account. */
export function accountMatchesJournalSelection(
  postingAccount: string,
  accountName: string,
  withChildren: boolean,
): boolean {
  if (postingAccount === accountName) return true;
  if (!withChildren) return false;
  return postingAccount.startsWith(`${accountName}:`);
}

/**
 * Sum posting units for the displayed account from the entry payload.
 * Non-transactions and entries with no matching postings return `undefined`
 * so the Units cell stays empty rather than inventing a value.
 */
export function deriveAccountUnits(
  directive: JournalDirectiveType,
  accountName: string,
  withChildren = true,
): Record<string, string> | undefined {
  if (!accountName || !isJournalTransaction(directive)) {
    return undefined;
  }

  const amountsByCurrency = new Map<string, string[]>();
  for (const posting of directive.postings ?? []) {
    if (
      !accountMatchesJournalSelection(
        posting.account,
        accountName,
        withChildren,
      )
    ) {
      continue;
    }
    if (!posting.units?.currency || posting.units.number == null) {
      continue;
    }
    const amounts = amountsByCurrency.get(posting.units.currency) ?? [];
    amounts.push(String(posting.units.number));
    amountsByCurrency.set(posting.units.currency, amounts);
  }

  if (amountsByCurrency.size === 0) {
    return undefined;
  }

  const units: Record<string, string> = {};
  for (const [currency, amounts] of amountsByCurrency) {
    units[currency] = sumDecimalNumbers(amounts);
  }
  return units;
}
