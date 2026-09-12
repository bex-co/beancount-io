let _postingIdCounter = 0;
const nextId = () => `posting-${++_postingIdCounter}`;

export type Posting = {
  id: string;
  account: string;
  amountInput: string;
  amountCents: number;
  isAuto: boolean;
};

export type ValidationError = "unbalanced" | "missingAccount" | "zeroAmount";

function parseCents(input: string): number {
  const trimmed = input.trim();
  if (!trimmed) return 0;
  const n = parseFloat(trimmed);
  if (isNaN(n)) return 0;
  return Math.round(n * 100);
}

function centsToInput(cents: number): string {
  const abs = Math.abs(cents);
  const sign = cents < 0 ? "-" : "";
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

function applyAutoFill(postings: Posting[]): Posting[] {
  const lastIdx = postings.length - 1;
  if (lastIdx < 1) return postings;
  const last = postings[lastIdx];
  if (!last.isAuto) return postings;
  const sumOfOthers = postings
    .slice(0, lastIdx)
    .reduce((s, p) => s + p.amountCents, 0);
  const autoCents = sumOfOthers !== 0 ? -sumOfOthers : 0;
  return postings.map((p, i) =>
    i === lastIdx
      ? { ...p, amountCents: autoCents, amountInput: centsToInput(autoCents) }
      : p,
  );
}

export function makePosting(partial?: Partial<Posting>): Posting {
  return {
    id: nextId(),
    account: "",
    amountInput: "0.00",
    amountCents: 0,
    isAuto: false,
    ...partial,
  };
}

export function createInitialPostings(
  firstAsset: string,
  firstExpense: string,
): Posting[] {
  return applyAutoFill([
    makePosting({ account: firstAsset, isAuto: false }),
    makePosting({ account: firstExpense, isAuto: true }),
  ]);
}

/**
 * Seed the two legs of a scanned receipt.
 *
 * The receipt parser labels `sourceAccount` as "where money comes FROM" (the
 * payment method) and `targetAccount` as the expense, which is the same shape
 * `createInitialPostings` produces. Putting the negative amount on the source
 * leg lets `applyAutoFill` derive the expense leg, so the form opens balanced.
 *
 * `amountInput` is the raw total as a string (it arrives as a route param).
 */
export function createPrefilledPostings(
  sourceAccount: string,
  targetAccount: string,
  amountInput: string,
): Posting[] {
  // Guard the negation: -0 is a valid JS number and would otherwise leak into
  // posting state for an unparseable total.
  const cents = parseCents(amountInput);
  const paid = cents === 0 ? 0 : -cents;
  return applyAutoFill([
    makePosting({
      account: sourceAccount,
      amountCents: paid,
      amountInput: centsToInput(paid),
      isAuto: false,
    }),
    makePosting({ account: targetAccount, isAuto: true }),
  ]);
}

/**
 * Spoken identity of one posting's amount field.
 *
 * The field shows only the magnitude — the sign lives in a separate toggle
 * button — so a screen reader landing on the input would otherwise hear neither
 * which account it belongs to nor whether the amount is a debit or a credit.
 * The label names the account (or the row's position, for a posting whose
 * account is not picked yet) and the value speaks the signed amount with its
 * currency.
 *
 * Pure so it can be unit-tested: `t` is injected rather than hooked.
 */
export function postingAmountAccessibility({
  account,
  amountInput,
  index,
  currency,
  t,
}: {
  account: string;
  amountInput: string;
  index: number;
  currency: string;
  t: (key: string, params?: Record<string, unknown>) => string;
}): { label: string; value: string } {
  const isNegative = amountInput.trim().startsWith("-");
  const magnitude =
    (isNegative ? amountInput.trim().slice(1) : amountInput.trim()) || "0.00";
  return {
    // A 1-based position, because "Posting 0" reads as a bug to anyone hearing it.
    label: t("postingAmountLabel", {
      account: account || t("postingNumber", { number: index + 1 }),
    }),
    value: `${isNegative ? "-" : ""}${magnitude} ${currency}`,
  };
}

export function remainder(postings: Posting[]): number {
  return postings.reduce((s, p) => s + p.amountCents, 0);
}

export function updatePostingAccount(
  postings: Posting[],
  index: number,
  account: string,
): Posting[] {
  return postings.map((p, i) => (i === index ? { ...p, account } : p));
}

export function updatePostingAmount(
  postings: Posting[],
  index: number,
  input: string,
): Posting[] {
  const cents = parseCents(input);
  const isLast = index === postings.length - 1;
  const updated = postings.map((p, i) =>
    i === index
      ? {
          ...p,
          amountInput: input,
          amountCents: cents,
          isAuto: isLast ? false : p.isAuto,
        }
      : p,
  );
  return applyAutoFill(updated);
}

export function toggleLastPostingAuto(postings: Posting[]): Posting[] {
  const lastIdx = postings.length - 1;
  const updated = postings.map((p, i) =>
    i === lastIdx ? { ...p, isAuto: !p.isAuto } : p,
  );
  return applyAutoFill(updated);
}

export function addPosting(postings: Posting[]): Posting[] {
  const withNoAuto = postings.map((p, i) =>
    i === postings.length - 1 ? { ...p, isAuto: false } : p,
  );
  return applyAutoFill([...withNoAuto, makePosting({ isAuto: true })]);
}

export function removePosting(postings: Posting[], index: number): Posting[] {
  if (postings.length <= 2) return postings;
  const newPostings = postings.filter((_, i) => i !== index);
  if (index >= newPostings.length) {
    const withAuto = newPostings.map((p, i) =>
      i === newPostings.length - 1 ? { ...p, isAuto: true } : p,
    );
    return applyAutoFill(withAuto);
  }
  return applyAutoFill(newPostings);
}

export function validatePostings(postings: Posting[]): ValidationError | null {
  for (const posting of postings) {
    if (!posting.account) return "missingAccount";
    if (posting.amountCents === 0) return "zeroAmount";
  }
  if (remainder(postings) !== 0) return "unbalanced";
  return null;
}

export function buildEntryInput(
  postings: Posting[],
  opts: {
    date: string;
    payee: string;
    narration: string;
    currency: string;
  },
) {
  return {
    date: opts.date,
    flag: "*",
    narration: opts.narration,
    payee: opts.payee,
    type: "Transaction",
    meta: {},
    postings: postings.map((posting) => ({
      account: posting.account,
      amount: `${centsToInput(posting.amountCents)} ${opts.currency}`,
    })),
  };
}
