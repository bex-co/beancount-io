import type { BeancountError, DirectiveJson, FileMap } from "@rustledger/wasm";
import { padLocator } from "./pad-tolerance";

type Pad = Extract<DirectiveJson, { type: "pad" }>;

const padKey = (date: string, account: string, source: string) =>
  `${date}\0${account}\0${source}`;

/**
 * Beancount validates the padding its pad plugin inserts like any written
 * transaction: a posting in a currency its account's `open` does not allow is
 * "Invalid currency <C> for account '<account>'", once per posting, on the
 * pad's line (the padding carries the pad's meta). rustledger checks only the
 * transactions in the files, so a pad from an account opened for another
 * currency, or into one, loaded clean (w31/014).
 *
 * `paddingTransactions` is the padding that is kept, after w21/135's drop.
 */
export function paddingCurrencyErrors(
  directives: readonly DirectiveJson[],
  paddingTransactions: readonly DirectiveJson[],
  files: FileMap,
): BeancountError[] {
  if (paddingTransactions.length === 0) return [];
  // Beancount keeps the last `open` that names currencies.
  const allowed = new Map<string, readonly string[]>();
  const pads = new Map<string, Pad>();
  for (const directive of directives) {
    if (directive.type === "open" && directive.currencies.length > 0) {
      allowed.set(directive.account, directive.currencies);
    } else if (directive.type === "pad") {
      const key = padKey(
        directive.date,
        directive.account,
        directive.source_account,
      );
      if (!pads.has(key)) pads.set(key, directive);
    }
  }

  const locate = padLocator(files);
  const located = new Map<string, [string, number] | [null, null]>();
  const errors: BeancountError[] = [];
  for (const transaction of paddingTransactions) {
    if (transaction.type !== "transaction" || transaction.postings.length < 2) {
      continue;
    }
    const refused = transaction.postings.filter(
      (posting) =>
        posting.units !== undefined &&
        allowed.has(posting.account) &&
        !allowed.get(posting.account)?.includes(posting.units.currency),
    );
    if (refused.length === 0) continue;
    const key = padKey(
      transaction.date,
      transaction.postings[0].account,
      transaction.postings[1].account,
    );
    const pad = pads.get(key);
    if (!located.has(key)) {
      located.set(key, pad === undefined ? [null, null] : locate(pad));
    }
    const [file, line] = located.get(key) ?? [null, null];
    for (const posting of refused) {
      errors.push({
        message: `Invalid currency ${posting.units?.currency} for account '${posting.account}'`,
        code: "E5002",
        phase: "validate",
        hint: null,
        file,
        line,
        column: line === null ? null : 1,
        end_line: null,
        end_column: null,
        severity: "error",
      });
    }
  }
  return errors;
}
