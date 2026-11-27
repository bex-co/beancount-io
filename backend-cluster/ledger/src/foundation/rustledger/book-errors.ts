import type { BeancountError, DirectiveJson } from "@rustledger/wasm";
import { SOURCE_DATE, sourceDateOf } from "./source-date";

/**
 * Put booking and interpolation errors on the transaction they are about.
 *
 * The engine reports `BOOK` errors ("interpolation failed: cannot infer
 * currency for posting to account Assets:Cash (2026-01-05, "narration")") with
 * no file or line, so the app could not open them and the file editor's banner,
 * which matches by file, never listed them. The message ends with the entry's
 * date and narration: the transaction whose first line has that date and ends
 * its strings with that narration is the one. Several transactions sharing both
 * are told apart by order, as the engine reports them in the order it books
 * them; when the counts of errors and transactions differ the error is left as
 * it was (w21/534).
 */

const BOOK_ENTRY = /\((\d{4}-\d{2}-\d{2}), "((?:[^"\\]|\\.)*)"\)$/u;
/** A transaction's first line, its date spelled any way the lexer reads (w31/107). */
const TRANSACTION_LINE = new RegExp(
  String.raw`^${SOURCE_DATE}\s+(?:[*!]|txn)(\s|$)`,
  "u",
);
const QUOTED = /"((?:[^"\\]|\\.)*)"/gu;

type Block = { file: string; line: number };

const unescape = (text: string): string => text.replace(/\\(.)/gu, "$1");

/** What pairs a `BOOK` error with its transaction: the date and the narration. */
const entryKey = (date: string, narration: string): string =>
  `${date}\u0000${narration}`;

/** Every transaction's first line, keyed by its date and last quoted string. */
function transactionLines(
  files: Readonly<Record<string, string>>,
  entryPoint: string,
): Map<string, Block[]> {
  const found = new Map<string, Block[]>();
  const names = [
    entryPoint,
    ...Object.keys(files)
      .filter((name) => name !== entryPoint)
      .sort(),
  ];
  for (const file of names) {
    const content = files[file];
    if (content === undefined) continue;
    content.split(/\r\n|\n|\r/u).forEach((text, index) => {
      if (!TRANSACTION_LINE.test(text)) return;
      const strings = [...text.matchAll(QUOTED)];
      const last = strings[strings.length - 1];
      if (!last) return;
      const key = entryKey(sourceDateOf(text)!, unescape(last[1]));
      const list = found.get(key) ?? [];
      list.push({ file, line: index + 1 });
      found.set(key, list);
    });
  }
  return found;
}

export function locateBookErrors(
  errors: readonly BeancountError[],
  files: Readonly<Record<string, string>>,
  entryPoint: string,
): BeancountError[] {
  const wanted = (error: BeancountError) =>
    error.code === "BOOK" && !error.file
      ? BOOK_ENTRY.exec(error.message.trim())
      : null;
  if (!errors.some(wanted)) return [...errors];

  const blocks = transactionLines(files, entryPoint);
  const keyOf = (match: RegExpExecArray) =>
    entryKey(match[1], unescape(match[2]));
  const errorCounts = new Map<string, number>();
  for (const error of errors) {
    const match = wanted(error);
    if (match) {
      errorCounts.set(keyOf(match), (errorCounts.get(keyOf(match)) ?? 0) + 1);
    }
  }
  const seen = new Map<string, number>();
  return errors.map((error) => {
    const match = wanted(error);
    if (!match) return error;
    const key = keyOf(match);
    const candidates = blocks.get(key);
    if (!candidates || candidates.length !== errorCounts.get(key)) return error;
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    const at = candidates[n];
    return {
      ...error,
      file: at.file,
      line: at.line,
      column: error.column ?? 1,
    };
  });
}

/**
 * The transactions a `BOOK` error is about, found in the stream by the date and
 * narration its message ends with. Beancount drops such an entry from its
 * entries; the engine keeps it, half booked, so balances must be told which to
 * skip (w21/678).
 *
 * Transactions sharing a date and narration cannot be told apart by the
 * message alone, so a key is marked only when the transactions with it are
 * exactly as many as the errors that name it: an unproven twin stays counted
 * rather than a good entry being hidden.
 */
export function unbookedTransactions(
  errors: readonly BeancountError[],
  directives: readonly DirectiveJson[],
): DirectiveJson[] {
  const wanted = new Map<string, number>();
  for (const error of errors) {
    if (error.code !== "BOOK") continue;
    const match = BOOK_ENTRY.exec(error.message.trim());
    if (!match) continue;
    const key = entryKey(match[1], unescape(match[2]));
    wanted.set(key, (wanted.get(key) ?? 0) + 1);
  }
  if (wanted.size === 0) return [];
  const candidates = new Map<string, DirectiveJson[]>();
  for (const directive of directives) {
    if (directive.type !== "transaction") continue;
    const narration = (directive as { narration?: string | null }).narration;
    const key = entryKey(directive.date, narration ?? "");
    if (!wanted.has(key)) continue;
    const list = candidates.get(key) ?? [];
    list.push(directive);
    candidates.set(key, list);
  }
  return [...wanted].flatMap(([key, count]) => {
    const list = candidates.get(key);
    return list !== undefined && list.length === count ? list : [];
  });
}

/** The engine's message for an elided posting it found no currency for. */
const NO_CURRENCY =
  /^interpolation failed: cannot infer currency for posting to account (\S+) \((\d{4}-\d{2}-\d{2}), "((?:[^"\\]|\\.)*)"\)$/u;

/** The account of a transaction's only posting when it has no amount, cost or price. */
function loneElidedAccount(directive: DirectiveJson): string | undefined {
  if (directive.type !== "transaction" || directive.postings.length !== 1) {
    return undefined;
  }
  const [posting] = directive.postings;
  return posting.units == null && posting.cost == null && posting.price == null
    ? posting.account
    : undefined;
}

/**
 * The transactions whose only posting has no amount, and the `BOOK` errors the
 * engine reports for them. Stock interpolation fills an elided posting from
 * the transaction's residual. With no other posting there is no residual, so
 * stock drops the posting and reports nothing: the entry loads with no
 * postings. The engine reports "cannot infer currency" instead (w31/138).
 *
 * An error is paired with its transaction by date, narration and account.
 * A key is taken only when its transactions and errors are as many, as in
 * {@link unbookedTransactions}. A posting with a cost or a price is left
 * alone: stock cannot resolve its units either and refuses it.
 */
export function loneElidedTransactions(
  errors: readonly BeancountError[],
  directives: readonly DirectiveJson[],
): { transactions: Set<DirectiveJson>; errors: Set<BeancountError> } {
  const byKey = new Map<
    string,
    { errors: BeancountError[]; transactions: DirectiveJson[] }
  >();
  const slot = (key: string) => {
    const found = byKey.get(key) ?? { errors: [], transactions: [] };
    byKey.set(key, found);
    return found;
  };
  for (const error of errors) {
    if (error.code !== "BOOK") continue;
    const match = NO_CURRENCY.exec(error.message.trim());
    if (!match) continue;
    slot(
      `${entryKey(match[2], unescape(match[3]))}\u0000${match[1]}`,
    ).errors.push(error);
  }
  const found = {
    transactions: new Set<DirectiveJson>(),
    errors: new Set<BeancountError>(),
  };
  if (byKey.size === 0) return found;
  for (const directive of directives) {
    const account = loneElidedAccount(directive);
    if (account === undefined) continue;
    const narration = (directive as { narration?: string | null }).narration;
    const key = `${entryKey(directive.date, narration ?? "")}\u0000${account}`;
    byKey.get(key)?.transactions.push(directive);
  }
  for (const pair of byKey.values()) {
    if (pair.errors.length !== pair.transactions.length) continue;
    pair.errors.forEach((error) => found.errors.add(error));
    pair.transactions.forEach((directive) => found.transactions.add(directive));
  }
  return found;
}

/**
 * `files` with the transactions the `BOOK` errors name blanked out, line for
 * line, so BQL (which books the source itself) sees what Beancount sees: an
 * entry that failed booking is not in the ledger (w21/678). Returns undefined
 * when no error could be placed on a transaction, leaving the files as they
 * are. Blank lines keep every other line number, and so every other error's
 * place, where it was.
 */
export function withoutUnbookedTransactions(
  files: Readonly<Record<string, string>>,
  errors: readonly BeancountError[],
  entryPoint: string,
): Record<string, string> | undefined {
  const located = locateBookErrors(errors, files, entryPoint).filter(
    (error) =>
      error.code === "BOOK" &&
      error.file !== null &&
      error.file !== undefined &&
      typeof error.line === "number",
  );
  if (located.length === 0) return undefined;
  const lines = new Map<string, Set<number>>();
  for (const error of located) {
    const set = lines.get(error.file!) ?? new Set<number>();
    set.add(error.line!);
    lines.set(error.file!, set);
  }
  const result: Record<string, string> = { ...files };
  for (const [file, heads] of lines) {
    const content = files[file];
    if (content === undefined) continue;
    const text = content.split(/(\r\n|\n|\r)/u);
    // `split` keeps the separators at odd indexes: lines are the even ones.
    let blanking = false;
    for (let i = 0, line = 1; i < text.length; i += 2, line++) {
      if (heads.has(line)) {
        blanking = true;
        text[i] = "";
        continue;
      }
      // A transaction's postings and metadata are indented; anything else ends it.
      if (blanking && /^[ \t]+\S/u.test(text[i])) {
        text[i] = "";
        continue;
      }
      blanking = false;
    }
    result[file] = text.join("");
  }
  return result;
}
