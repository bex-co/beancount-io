import {
  amountScale,
  formatSignedMoneyWithCurrency,
} from "../../common/number-utils";
import { currencyMinorUnits } from "../../common/currency-util";
import { toAsciiNumerals } from "../../common/ascii-numerals";

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
 * `1.25`). Thousands grouping is accepted only where it can't be a decimal
 * comma: with a `.` after the groups (`1,234.56`) or two groups or more
 * (`1,234,567`) (w21/031), and the other way round (`1.234,56`, `1.234.567`)
 * or by a space (`1 234,56`) as most languages write it (w21/463). `1,250`
 * stays the decimal comma 1.250, except in a currency with no minor unit
 * (`minorUnits` 0: JPY, KRW, VND), where a lone group of three after either
 * mark can only be thousands: `1,500` and `1.500` are 1500 (w21/697). A leading
 * `.` reads as `0.` (`.5` → `0.5`). Rejects partial forms (`1.`, `-`, `.`)
 * and any other junk — never silently takes a
 * numeric prefix the way parseFloat does.
 */
/**
 * An amount's typed text split into its sign and the rest, reading the sign as
 * `parseExactAmount` does: past direction marks, and with the typographic minus
 * (U+2212) as `-`. The row's badge and its toggle use this, so what shows
 * negative is what saves negative (w21/232, w21/666).
 */
export function splitAmountSign(input: string): {
  negative: boolean;
  absolute: string;
} {
  const typed = input
    .replace(/[\u200e\u200f\u061c]/g, "")
    .replace(/\u2212/g, "-")
    .trim();
  const negative = typed.startsWith("-");
  return { negative, absolute: negative ? typed.slice(1) : typed };
}

/**
 * The text a row stores for its digits and sign. A field emptied of digits
 * stores nothing: with a minus kept on, it stored "-", read as an unparsable
 * amount ("Use digits and one decimal point") under a field that looked empty,
 * and blocked Done (w21/728).
 */
export function signedAmountInput(absolute: string, negative: boolean): string {
  if (absolute.trim() === "") return "";
  return negative ? `-${absolute}` : absolute;
}

/**
 * What a row stores for text typed or pasted into its digits field, which
 * shows the row's sign beside it. Text with a sign of its own takes that sign:
 * "-20" pasted into a negative row was put behind the row's minus, read
 * "--20", and blocked Done (w21/791). Unsigned text keeps the row's sign.
 */
export function typedAmountInput(input: string, rowNegative: boolean): string {
  const { negative, absolute } = splitAmountSign(input);
  if (negative) return signedAmountInput(absolute, true);
  if (absolute.startsWith("+")) {
    return signedAmountInput(absolute.slice(1), false);
  }
  // The trimmed text: a pasted " 20" in a negative row was "- 20", which no
  // parser reads (w21/855).
  return signedAmountInput(absolute, rowNegative);
}

export function parseExactAmount(input: string, minorUnits = 2): string | null {
  let trimmed = toAsciiNumerals(input)
    // Direction marks a right-to-left locale's formatting puts around a sign,
    // and the typographic minus it uses (w21/463).
    .replace(/[\u200e\u200f\u061c]/g, "")
    .replace(/\u2212/g, "-")
    // Grouping by a space, no-break or narrow no-break space, between digits
    // and a group of three: "1 234,56" (French, Russian, …).
    .replace(/(\d)[ \u00a0\u2009\u202f](?=\d{3}(?!\d))/g, "$1")
    // And by an apostrophe (Swiss, Liechtenstein): "1'234.50" (w21/920).
    .replace(/(\d)['\u2019\u02bc](?=\d{3}(?!\d))/g, "$1")
    .trim();
  if (!trimmed) return null;
  // The Arabic thousands separator groups three digits and is never a decimal
  // mark: `۱٬۲۳۴` is 1,234, where the ASCII comma it was mapped to read as a
  // decimal comma and saved 1.234 (w21/386). A grouping that is not threes is
  // refused, not guessed.
  if (trimmed.includes("\u066c")) {
    if (!/^-?\d{1,3}(\u066c\d{3})+(\.\d+)?$/.test(trimmed)) return null;
    trimmed = trimmed.replace(/\u066c/g, "");
  }

  let normalized = trimmed;
  // One group of thousands in a currency with no decimals: "1.500" yen is
  // 1500. Never after a lone zero, which no thousands group follows: "0.500"
  // read as 500, a thousand times what was typed (w21/794).
  if (minorUnits === 0 && /^-?[1-9]\d{0,2}[.,]\d{3}$/.test(normalized)) {
    normalized = normalized.replace(/[.,]/, "");
  }
  // A point as the grouping mark, where a comma decimal follows or there are
  // two groups or more: "1.234,56" (German, Spanish, …) and "1.234.567". A bare
  // "1.234" stays the decimal 1.234 (w21/031).
  if (
    /^-?\d{1,3}(\.\d{3})+,\d+$/.test(normalized) ||
    /^-?\d{1,3}(\.\d{3}){2,}$/.test(normalized)
  ) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  }
  // Indian grouping, a group of three then twos: "1,23,456.78". At least one
  // pair of digits, so a lone "1,250" stays a decimal comma (w21/031).
  if (/^-?\d{1,2}(,\d{2})+,\d{3}(\.\d+)?$/.test(normalized)) {
    normalized = normalized.replace(/,/g, "");
  } else if (
    /^-?\d{1,3}(,\d{3})+\.\d+$/.test(normalized) ||
    /^-?\d{1,3}(,\d{3}){2,}$/.test(normalized)
  ) {
    normalized = normalized.replace(/,/g, "");
  } else if (/^-?\d*,\d+$/.test(normalized)) {
    normalized = normalized.replace(",", ".");
  } else if (normalized.includes(",")) {
    return null;
  }

  // The decimal pad lets "." come first: ".5" is 0.5 (w21/075), and so ",5",
  // where the pad's separator is a comma (w21/792).
  normalized = normalized.replace(/^(-?)\./, "$10.");
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

/** The exact sum of two plain decimal strings, at the wider scale. */
export function addExact(a: string, b: string): string {
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

/**
 * Format an exact amount for the amount field / auto-fill display and the
 * entry payload, padded to the currency's minor unit (`minorUnits`: 2 for USD,
 * 0 for JPY, 3 for KWD) but never truncating a longer exact value (1.005 stays
 * 1.005). Padded to two for every currency, a typed 1500 JPY was written to
 * the ledger as "1500.00 JPY" (w21/231).
 */
export function formatExactAmount(amount: string, minorUnits = 2): string {
  if (isZeroExact(amount)) {
    const scale = amount.includes(".")
      ? amount.split(".")[1].length
      : minorUnits;
    return scale > 0 ? `0.${"0".repeat(scale)}` : "0";
  }
  const neg = amount.startsWith("-");
  const body = neg ? amount.slice(1) : amount;
  const [whole, frac = ""] = body.split(".");
  const padded =
    frac.length >= minorUnits ? frac : frac.padEnd(minorUnits, "0");
  return `${neg ? "-" : ""}${whole}${padded ? `.${padded}` : ""}`;
}

function amountOrZero(amount: string | null): string {
  return amount === null || isZeroExact(amount) ? "0" : amount;
}

function applyAutoFill(postings: Posting[], minorUnits = 2): Posting[] {
  const lastIdx = postings.length - 1;
  if (lastIdx < 1) return postings;
  const last = postings[lastIdx];
  if (!last.isAuto) return postings;

  let sumOfOthers = "0";
  for (const p of postings.slice(0, lastIdx)) {
    sumOfOthers = addExact(sumOfOthers, amountOrZero(p.amount));
  }
  const autoAmount = isZeroExact(sumOfOthers)
    ? formatExactAmount("0", minorUnits)
    : formatExactAmount(negateExact(sumOfOthers), minorUnits);
  const parsed = parseExactAmount(autoAmount);

  // A zero auto leg shows no text, so the "0.00" placeholder does: shown as
  // text, a tap placed the caret after it and "12.50" became "0.0012.50"
  // (w21/321).
  const shown = isZeroExact(sumOfOthers) ? "" : autoAmount;
  return postings.map((p, i) =>
    i === lastIdx ? { ...p, amount: parsed, amountInput: shown } : p,
  );
}

export function makePosting(partial?: Partial<Posting>): Posting {
  // An amount the user types starts empty, so the "0.00" placeholder shows
  // and the first digit starts the value. Seeded as text, "0.00" was typed
  // onto: an iOS tap leaves the caret after it with nothing selected, and
  // "12.50" became "0.0012.50" (w21/159). The auto leg is empty while it is
  // zero for the same reason (w21/321): it carries a computed zero amount but
  // no text to type onto.
  const amountInput = partial?.amountInput ?? "";
  const amount =
    partial && "amount" in partial
      ? (partial.amount ?? null)
      : partial?.isAuto
        ? "0.00"
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
  minorUnits = 2,
): Posting[] {
  return applyAutoFill(
    [
      makePosting({ account: firstAsset, isAuto: false }),
      makePosting({ account: firstExpense, isAuto: true }),
    ],
    minorUnits,
  );
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
  minorUnits = 2,
): Posting[] {
  const parsed = parseExactAmount(amountInput, minorUnits);
  // A total that is zero or unreadable seeds nothing: an empty field shows the
  // placeholder and the first digit starts the value, where a seeded "0.00"
  // was typed onto (w21/321).
  const hasTotal = parsed !== null && !isZeroExact(parsed);
  const paidAmount = hasTotal
    ? parseExactAmount(formatExactAmount(negateExact(parsed), minorUnits))
    : null;
  const paidInput = hasTotal
    ? formatExactAmount(paidAmount ?? "0", minorUnits)
    : "";
  return applyAutoFill(
    [
      makePosting({
        account: sourceAccount,
        amount: paidAmount,
        amountInput: paidInput,
        isAuto: false,
      }),
      makePosting({ account: targetAccount, isAuto: true }),
    ],
    minorUnits,
  );
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
  minorUnits = 2,
): Posting[] {
  // Stored without the spaces a pasted amount carries: the row reads the sign
  // off the text itself (w21/232).
  const text = input.trim();
  const amount = parseExactAmount(text, minorUnits);
  const isLast = index === postings.length - 1;
  const updated = postings.map((p, i) =>
    i === index
      ? {
          ...p,
          amountInput: text,
          amount,
          isAuto: isLast ? false : p.isAuto,
        }
      : p,
  );
  return applyAutoFill(updated, minorUnits);
}

/**
 * An auto leg the user now types into. A computed amount is kept as the
 * starting value; a zero one starts empty, like a new leg, rather than as a
 * "0.00" the next digits would be typed onto (w21/159).
 */
function asTyped(posting: Posting): Posting {
  return isZeroExact(posting.amount)
    ? { ...posting, isAuto: false, amountInput: "", amount: null }
    : { ...posting, isAuto: false };
}

export function toggleLastPostingAuto(
  postings: Posting[],
  minorUnits = 2,
): Posting[] {
  const lastIdx = postings.length - 1;
  const updated = postings.map((p, i) =>
    i !== lastIdx ? p : p.isAuto ? asTyped(p) : { ...p, isAuto: true },
  );
  return applyAutoFill(updated, minorUnits);
}

export function addPosting(postings: Posting[], minorUnits = 2): Posting[] {
  const withNoAuto = postings.map((p, i) =>
    i === postings.length - 1 ? asTyped(p) : p,
  );
  return applyAutoFill(
    [...withNoAuto, makePosting({ isAuto: true })],
    minorUnits,
  );
}

export function removePosting(
  postings: Posting[],
  index: number,
  minorUnits = 2,
): Posting[] {
  if (postings.length <= 2) return postings;
  const newPostings = postings.filter((_, i) => i !== index);
  if (index >= newPostings.length) {
    // The row that is now last balances the others only if it holds nothing of
    // the user's: a typed amount stays, and the form shows the remainder as
    // unbalanced, instead of being overwritten without a word (w21/462).
    const last = newPostings[newPostings.length - 1]!;
    const typed = last.amountInput.trim() !== "" && !isZeroExact(last.amount);
    const withAuto = typed
      ? newPostings
      : newPostings.map((p, i) =>
          i === newPostings.length - 1 ? { ...p, isAuto: true } : p,
        );
    return applyAutoFill(withAuto, minorUnits);
  }
  return applyAutoFill(newPostings, minorUnits);
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
      amount: `${formatExactAmount(
        posting.amount ?? "0",
        currencyMinorUnits(opts.currency),
      )} ${opts.currency}`,
    })),
  };
}

/**
 * Typed text the parser could not read as an amount. Such a posting adds
 * nothing to the remainder, which then read as a green, balanced zero
 * (w21/031); the form shows it as an error instead.
 */
export function hasUnparsedAmount(posting: Posting): boolean {
  return posting.amountInput.trim() !== "" && posting.amount === null;
}

export function hasNonZeroAmount(posting: Posting): boolean {
  return !isZeroExact(posting.amount);
}

export function isRemainderBalanced(rem: string): boolean {
  return isZeroExact(rem);
}

/**
 * The Remainder row's label, at the remainder's own scale: 10.004 against -10
 * leaves "+$0.004". Rounded to cents it read "+$0.00" in red while Done
 * refused the entry as unbalanced (w21/075).
 */
export function formatRemainderAmount(rem: string, currency: string): string {
  const exact = formatExactAmount(rem, currencyMinorUnits(currency));
  return formatSignedMoneyWithCurrency(
    Number(exact),
    currency,
    true,
    amountScale(exact),
  );
}

/**
 * The accounts a new entry opens with: the first open asset as the source,
 * and the first open expense (else another open asset) as the target, by the
 * ledger's recent-use ranking. That ranking still lists a heavily used account
 * just closed first, and the form opened on it only for Done to be refused
 * (w21/103). With nothing open the ranking's own first entries stand.
 */
export function defaultPostingAccounts(
  assets: readonly string[],
  expenses: readonly string[],
  isOpen: (account: string) => boolean,
): { source: string; target: string } {
  const source = assets.find(isOpen) ?? assets[0] ?? "";
  const target =
    expenses.find(isOpen) ??
    assets.find((account) => account !== source && isOpen(account)) ??
    expenses[0] ??
    (assets.length > 1 ? assets[1] : source);
  return { source, target };
}

/** What a posting says, as the draft keeps it. */
type PostingShape = Pick<Posting, "account" | "amountInput">;

/**
 * Whether two posting lists say the same thing: their accounts and typed
 * amounts, ignoring ids.
 */
function samePostings(
  a: readonly PostingShape[],
  b: readonly PostingShape[],
): boolean {
  return (
    a.length === b.length &&
    a.every(
      (posting, i) =>
        posting.account === b[i].account &&
        posting.amountInput === b[i].amountInput,
    )
  );
}

/**
 * Whether a fresh seed should replace the form's postings. The first seed
 * came from last session's persisted ranking, which can name an account since
 * removed; the network's arrives later (w21/110). Replace only postings the
 * user has not touched, and only when the seed changed.
 */
export function shouldReseed(
  current: readonly PostingShape[],
  lastSeed: readonly PostingShape[],
  nextSeed: readonly PostingShape[],
): boolean {
  return samePostings(current, lastSeed) && !samePostings(nextSeed, lastSeed);
}

/**
 * The root a new account created from posting `index`'s picker should start
 * under. Every row of New Transaction is a `posting` picker, which suggested
 * `Assets:` even on the expense row, so one tap on Done booked "groceries" to
 * `Assets:Groceries` (w21/259). A debit (positive amount) is where money went:
 * Expenses. A credit is where it came from: Assets. A row with no amount yet
 * follows its place: the first row is the source, the others the destination.
 */
export function createRootForPosting(
  postings: readonly Posting[],
  index: number,
): "Assets" | "Expenses" {
  const amount = postings[index]?.amount;
  if (amount != null && !isZeroExact(amount)) {
    return amount.startsWith("-") ? "Assets" : "Expenses";
  }
  return index === 0 ? "Assets" : "Expenses";
}
