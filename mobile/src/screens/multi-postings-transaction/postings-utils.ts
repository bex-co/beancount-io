let _postingIdCounter = 0;
const nextId = () => `posting-${++_postingIdCounter}`;

/**
 * Exact decimal posting amounts.
 *
 * `amountInput` is the raw editable field. `amount` is the validated exact
 * decimal (or null while the field is empty/incomplete/invalid). Arithmetic,
 * remainder, auto-balance and serialization use only `amount` — never
 * parseFloat / cents quantization.
 */
export type Posting = {
  id: string;
  account: string;
  amountInput: string;
  /** Exact decimal string like "1.005", or null if not yet a valid number. */
  amount: string | null;
  isAuto: boolean;
};

export type ValidationError =
  "unbalanced" | "missingAccount" | "zeroAmount" | "invalidAmount";

type Scaled = { coeff: bigint; scale: number };

/**
 * Parse a complete decimal amount. Accepts optional leading `-`, a single
 * `.` decimal separator, or a single `,` as a decimal separator (`1,25` →
 * `1.25`). Rejects grouping commas, partial forms (`1.`, `-`), and any
 * other junk — never silently takes a numeric prefix the way parseFloat does.
 */
export function parseExactAmount(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let normalized = trimmed;
  if (/^-?\d+,\d+$/.test(normalized)) {
    normalized = normalized.replace(",", ".");
  } else if (normalized.includes(",")) {
    return null;
  }

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;

  const neg = normalized.startsWith("-");
  const body = neg ? normalized.slice(1) : normalized;
  const [wholeRaw, frac = ""] = body.split(".");
  const whole = wholeRaw.replace(/^0+(?=\d)/, "") || "0";
  const value = `${neg ? "-" : ""}${whole}${frac.length ? `.${frac}` : ""}`;
  if (value === "-0" || /^-0\.0+$/.test(value)) {
    return frac.length ? `0.${frac}` : "0";
  }
  return value;
}

function toScaled(amount: string): Scaled {
  const neg = amount.startsWith("-");
  const body = neg ? amount.slice(1) : amount;
  const [whole, frac = ""] = body.split(".");
  return {
    coeff: BigInt(`${neg ? "-" : ""}${whole}${frac}` || "0"),
    scale: frac.length,
  };
}

function fromScaled(coeff: bigint, scale: number): string {
  if (coeff === 0n) {
    return scale > 0 ? `0.${"0".repeat(scale)}` : "0";
  }
  const neg = coeff < 0n;
  let digits = (neg ? -coeff : coeff).toString();
  if (scale === 0) return `${neg ? "-" : ""}${digits}`;
  while (digits.length <= scale) digits = `0${digits}`;
  const split = digits.length - scale;
  return `${neg ? "-" : ""}${digits.slice(0, split)}.${digits.slice(split)}`;
}

function addExact(a: string, b: string): string {
  const A = toScaled(a);
  const B = toScaled(b);
  const scale = Math.max(A.scale, B.scale);
  const ca = A.coeff * 10n ** BigInt(scale - A.scale);
  const cb = B.coeff * 10n ** BigInt(scale - B.scale);
  return fromScaled(ca + cb, scale);
}

function negateExact(a: string): string {
  if (a === "0" || /^0\.0+$/.test(a)) return a;
  return a.startsWith("-") ? a.slice(1) : `-${a}`;
}

function isZeroExact(a: string | null): boolean {
  if (a === null) return true;
  return a === "0" || /^0\.0+$/.test(a) || /^-0(\.0+)?$/.test(a);
}

/** Format an exact amount for the amount field / auto-fill display. */
export function formatExactAmount(amount: string): string {
  if (isZeroExact(amount)) {
    const scale = amount.includes(".") ? amount.split(".")[1].length : 2;
    return scale > 0 ? `0.${"0".repeat(scale)}` : "0.00";
  }
  // Prefer at least two fractional digits for ordinary two-decimal ledgers,
  // but never truncate a longer exact value (1.005 stays 1.005).
  const neg = amount.startsWith("-");
  const body = neg ? amount.slice(1) : amount;
  const [whole, frac = ""] = body.split(".");
  const padded = frac.length >= 2 ? frac : frac.padEnd(2, "0");
  return `${neg ? "-" : ""}${whole}.${padded}`;
}

function amountOrZero(amount: string | null): string {
  return amount === null || isZeroExact(amount) ? "0" : amount;
}

function applyAutoFill(postings: Posting[]): Posting[] {
  const lastIdx = postings.length - 1;
  if (lastIdx < 1) return postings;
  const last = postings[lastIdx];
  if (!last.isAuto) return postings;

  let sumOfOthers = "0";
  for (const p of postings.slice(0, lastIdx)) {
    sumOfOthers = addExact(sumOfOthers, amountOrZero(p.amount));
  }
  const autoAmount = isZeroExact(sumOfOthers)
    ? "0.00"
    : formatExactAmount(negateExact(sumOfOthers));
  const parsed = parseExactAmount(autoAmount);

  return postings.map((p, i) =>
    i === lastIdx ? { ...p, amount: parsed, amountInput: autoAmount } : p,
  );
}

export function makePosting(partial?: Partial<Posting>): Posting {
  const amountInput = partial?.amountInput ?? "0.00";
  const amount =
    partial && "amount" in partial
      ? (partial.amount ?? null)
      : parseExactAmount(amountInput);
  return {
    id: nextId(),
    account: partial?.account ?? "",
    amountInput,
    amount,
    isAuto: partial?.isAuto ?? false,
    ...(partial?.id ? { id: partial.id } : {}),
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
  const parsed = parseExactAmount(amountInput);
  const paidAmount =
    parsed === null || isZeroExact(parsed)
      ? parseExactAmount("0.00")
      : parseExactAmount(formatExactAmount(negateExact(parsed)));
  const paidInput = formatExactAmount(paidAmount ?? "0");
  return applyAutoFill([
    makePosting({
      account: sourceAccount,
      amount: paidAmount,
      amountInput: paidInput,
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

/**
 * Whether a posting row carries the automatic-balance switch, and whether that
 * switch reads as on.
 *
 * The two questions are deliberately separate. Only the final row can balance
 * the rest, so only it gets a switch — but it keeps that switch whether or not
 * it is currently automatic. Gating the *mount* on `isAuto` is what made the
 * control disappear the first time it was turned off (editing the last amount
 * clears `isAuto` too), leaving `toggleLastPostingAuto`'s enable direction with
 * nothing to call it.
 */
export function lastPostingAutoToggle({
  isLast,
  isAuto,
}: {
  isLast: boolean;
  isAuto: boolean;
}): { rendered: boolean; selected: boolean } {
  return { rendered: isLast, selected: isLast && isAuto };
}

/** Sum of exact posting amounts; "0" when balanced. */
export function remainder(postings: Posting[]): string {
  return postings.reduce(
    (sum, p) => addExact(sum, amountOrZero(p.amount)),
    "0",
  );
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
  const amount = parseExactAmount(input);
  const isLast = index === postings.length - 1;
  const updated = postings.map((p, i) =>
    i === index
      ? {
          ...p,
          amountInput: input,
          amount,
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
    const trimmed = posting.amountInput.trim();
    if (trimmed && posting.amount === null) return "invalidAmount";
    if (isZeroExact(posting.amount)) return "zeroAmount";
  }
  if (!isZeroExact(remainder(postings))) return "unbalanced";
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
      amount: `${formatExactAmount(posting.amount ?? "0")} ${opts.currency}`,
    })),
  };
}

export function hasNonZeroAmount(posting: Posting): boolean {
  return !isZeroExact(posting.amount);
}

export function isRemainderBalanced(rem: string): boolean {
  return isZeroExact(rem);
}
