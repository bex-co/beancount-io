import type { JournalTransaction } from "../../journal-screen/types";
import {
  formatAmount,
  selectTransactionAmount,
} from "../../journal-screen/utils/journal-display-utils";

/** Headline amount for the detail screen, matching the list rows' convention:
 * `+` prefix for cash inflows, unsigned otherwise. */
export type HeroAmount = {
  text: string;
  isPositive: boolean | null;
};

/**
 * The headline amount, from the same selector JournalEntryItem uses for list
 * rows, so the hero number can never disagree with the row the user tapped.
 */
export function selectHeroAmount(txn: JournalTransaction): HeroAmount {
  const amount = selectTransactionAmount(txn);
  if (!amount) {
    return { text: "", isPositive: null };
  }

  const { text, value } = amount;
  return {
    text: value > 0 ? `+${text}` : text,
    isPositive: value > 0 ? true : value < 0 ? false : null,
  };
}

/** One posting shaped for display: signed amount string + sign for coloring. */
export type PostingDisplayRow = {
  account: string;
  amount: string;
  sign: -1 | 0 | 1;
};

export function selectPostingRows(
  txn: JournalTransaction,
): PostingDisplayRow[] {
  return (txn.postings ?? []).map((p) => {
    const value = parseFloat(p.units.number);
    if (!Number.isFinite(value)) {
      return {
        account: p.account,
        amount: `${p.units.number} ${p.units.currency}`,
        sign: 0 as const,
      };
    }
    const formatted = formatAmount(value, p.units.currency);
    return {
      account: p.account,
      amount:
        value > 0 ? `+${formatted}` : value < 0 ? `-${formatted}` : formatted,
      sign: value > 0 ? (1 as const) : value < 0 ? (-1 as const) : (0 as const),
    };
  });
}

export function selectTransactionTitle(txn: JournalTransaction): string {
  return txn.payee || txn.narration || "";
}
