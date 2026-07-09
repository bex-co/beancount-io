import type { JournalTransaction } from "../../journal-screen/types";
import { formatAmount } from "../../journal-screen/utils/journal-display-utils";

/** Headline amount for the detail screen, matching the list rows' convention:
 * `+` prefix for cash inflows, unsigned otherwise. */
export type HeroAmount = {
  text: string;
  isPositive: boolean | null;
};

/**
 * Net the Assets/Liabilities postings to determine cash-flow direction — the
 * same rule JournalEntryItem uses for list rows, so the hero number never
 * disagrees with the row the user just tapped. Falls back to the largest
 * posting when no cash accounts are involved.
 */
export function selectHeroAmount(txn: JournalTransaction): HeroAmount {
  const postings = txn.postings ?? [];
  if (!postings.length) {
    return { text: "", isPositive: null };
  }

  const cashPostings = postings.filter(
    (p) =>
      p.account.startsWith("Assets:") || p.account.startsWith("Liabilities:"),
  );

  let value: number;
  let currency: string;
  if (cashPostings.length > 0) {
    value = cashPostings.reduce(
      (sum, p) => sum + parseFloat(p.units.number),
      0,
    );
    currency = cashPostings[0].units.currency;
  } else {
    let max = postings[0];
    for (const p of postings) {
      if (
        Math.abs(parseFloat(p.units.number)) >
        Math.abs(parseFloat(max.units.number))
      ) {
        max = p;
      }
    }
    value = parseFloat(max.units.number);
    currency = max.units.currency;
  }

  if (!Number.isFinite(value)) {
    return { text: "", isPositive: null };
  }

  const formatted = formatAmount(value, currency);
  return {
    text: value > 0 ? `+${formatted}` : formatted,
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
