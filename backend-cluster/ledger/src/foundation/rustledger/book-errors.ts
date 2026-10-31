import type { BeancountError, DirectiveJson } from "@rustledger/wasm";

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
const TRANSACTION_LINE = /^(\d{4}-\d{2}-\d{2})\s+(?:[*!]|txn)(\s|$)/u;
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
      const head = TRANSACTION_LINE.exec(text);
      if (!head) return;
      const strings = [...text.matchAll(QUOTED)];
      const last = strings[strings.length - 1];
      if (!last) return;
      const key = entryKey(head[1], unescape(last[1]));
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
