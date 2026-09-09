export type TransactionPostingDraft = {
  account: string;
  amount: string;
  currency: string;
};

export type AutoBalanceEntry = { amount: number; currency: string };

export type AutoBalanceResult = {
  /** Inferred amount for a single empty eligible posting index. */
  balances: Map<number, AutoBalanceEntry>;
  /**
   * True when any currency group among eligible postings has more than one
   * empty amount, or a lone empty amount with no finite filled amounts.
   */
  incomplete: boolean;
};

function parseFiniteAmount(amount: string): number | null {
  const trimmed = amount.trim();
  if (!trimmed) return null;
  const num = Number.parseFloat(trimmed);
  return Number.isFinite(num) ? num : null;
}

export function isEligiblePosting(posting: TransactionPostingDraft): boolean {
  return posting.account.trim() !== "";
}

/** Display text for an inferred amount — same precision as submission. */
export function formatInferredAmount(amount: number): string {
  if (Object.is(amount, -0) || amount === 0) return "0";
  return amount.toString();
}

/**
 * Infer at most one missing amount per currency among postings that will be
 * written (non-empty account). Unused trailing/blank-account rows are ignored.
 */
export function computeAutoBalance(
  postings: TransactionPostingDraft[],
  primaryCurrency: string,
): AutoBalanceResult {
  const currencyGroups = new Map<
    string,
    { filled: number[]; emptyIndexes: number[] }
  >();

  postings.forEach((posting, index) => {
    if (!isEligiblePosting(posting)) return;

    const currency = posting.currency.trim() || primaryCurrency;
    let group = currencyGroups.get(currency);
    if (!group) {
      group = { filled: [], emptyIndexes: [] };
      currencyGroups.set(currency, group);
    }

    const parsed = parseFiniteAmount(posting.amount);
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
      const sum = group.filled.reduce((acc, val) => acc + val, 0);
      balances.set(group.emptyIndexes[0], { amount: -sum, currency });
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
        amount: formatInferredAmount(autoBalance.amount),
      };
    }
    return posting;
  });
}

/** Eligible postings after inference must all have finite amounts. */
export function findUnresolvedEligibleAmount(
  postings: TransactionPostingDraft[],
): number | null {
  for (let index = 0; index < postings.length; index++) {
    const posting = postings[index];
    if (!isEligiblePosting(posting)) continue;
    if (parseFiniteAmount(posting.amount) === null) return index;
  }
  return null;
}
