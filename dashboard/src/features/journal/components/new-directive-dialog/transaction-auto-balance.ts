import {
  negateDecimalNumber,
  parseDecimalNumber,
  sumDecimalNumbers,
} from "@/common/lib/beancount/decimal-number";

export type TransactionPostingDraft = {
  account: string;
  amount: string;
  currency: string;
};

/** An inferred balancing amount, as the plain decimal that is submitted. */
export type AutoBalanceEntry = { amount: string; currency: string };

export type AutoBalanceResult = {
  /** Inferred amount for a single empty eligible posting index. */
  balances: Map<number, AutoBalanceEntry>;
  /**
   * True when any currency group among eligible postings has more than one
   * empty amount, or a lone empty amount with no valid filled amounts.
   */
  incomplete: boolean;
};

export function isEligiblePosting(posting: TransactionPostingDraft): boolean {
  return posting.account.trim() !== "";
}

/**
 * Infer at most one missing amount per currency among postings that will be
 * written (non-empty account). Unused trailing/blank-account rows are ignored.
 * The residual is summed in decimal, so `0.1` and `0.2` balance to `-0.3`
 * rather than a double's `-0.30000000000000004`.
 */
export function computeAutoBalance(
  postings: TransactionPostingDraft[],
  primaryCurrency: string,
): AutoBalanceResult {
  const currencyGroups = new Map<
    string,
    { filled: string[]; emptyIndexes: number[] }
  >();

  postings.forEach((posting, index) => {
    if (!isEligiblePosting(posting)) return;

    const currency = posting.currency.trim() || primaryCurrency;
    let group = currencyGroups.get(currency);
    if (!group) {
      group = { filled: [], emptyIndexes: [] };
      currencyGroups.set(currency, group);
    }

    const parsed = parseDecimalNumber(posting.amount);
    if (parsed !== null) {
      group.filled.push(parsed);
    } else if (posting.amount.trim() === "") {
      group.emptyIndexes.push(index);
    }
  });

  const balances = new Map<number, AutoBalanceEntry>();
  let incomplete = false;

  currencyGroups.forEach((group, currency) => {
    if (group.emptyIndexes.length === 0) return;

    if (group.emptyIndexes.length === 1 && group.filled.length > 0) {
      balances.set(group.emptyIndexes[0], {
        amount: negateDecimalNumber(sumDecimalNumbers(group.filled)),
        currency,
      });
      return;
    }

    incomplete = true;
  });

  return { balances, incomplete };
}

export function applyAutoBalanceToPostings(
  postings: TransactionPostingDraft[],
  balances: Map<number, AutoBalanceEntry>,
): TransactionPostingDraft[] {
  return postings.map((posting, index) => {
    const autoBalance = balances.get(index);
    if (
      autoBalance &&
      isEligiblePosting(posting) &&
      posting.amount.trim() === ""
    ) {
      return {
        ...posting,
        amount: autoBalance.amount,
      };
    }
    return posting;
  });
}

/** Eligible postings after inference must all have valid decimal amounts. */
export function findUnresolvedEligibleAmount(
  postings: TransactionPostingDraft[],
): number | null {
  for (let index = 0; index < postings.length; index++) {
    const posting = postings[index];
    if (!isEligiblePosting(posting)) continue;
    if (parseDecimalNumber(posting.amount) === null) return index;
  }
  return null;
}
