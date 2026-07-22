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
