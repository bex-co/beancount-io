import type { BeancountError, DirectiveJson, FileMap } from "@rustledger/wasm";
import { padLocation, unusedPadError } from "./pad-tolerance";
import { splitIntoBlocks } from "./source-slice";

type Pad = Extract<DirectiveJson, { type: "pad" }>;

const BALANCE_CODES = new Set(["E2001", "E2002"]);

function padKey(date: string, account: string, source: string): string {
  return `${date}\0${account}\0${source}`;
}

/** The currencies each pad's kept padding transactions filled, by pad. */
function paddedCurrencies(
  paddingTransactions: readonly DirectiveJson[],
): Map<string, Set<string>> {
  const padded = new Map<string, Set<string>>();
  for (const transaction of paddingTransactions) {
    if (transaction.type !== "transaction" || transaction.postings.length < 2) {
      continue;
    }
    const key = padKey(
      transaction.date,
      transaction.postings[0].account,
      transaction.postings[1].account,
    );
    const currencies = padded.get(key) ?? new Set<string>();
    const currency = transaction.postings[0].units?.currency;
    if (currency) currencies.add(currency);
    padded.set(key, currencies);
  }
  return padded;
}

const keyOf = (pad: Pad) => padKey(pad.date, pad.account, pad.source_account);

/**
 * Whether the pad's account asserts a balance after it in a currency the pad
 * did not fill. Beancount gives a pad only each currency's first balance after
 * it, padded or not, so such a balance is checked on its own; rustledger let
 * the pad cover it too (w21/705).
 */
function assertsOtherCurrency(
  directives: readonly DirectiveJson[],
  pad: Pad,
  filled: ReadonlySet<string>,
): boolean {
  return directives.some(
    (directive) =>
      directive.type === "balance" &&
      directive.account === pad.account &&
      directive.date > pad.date &&
      !filled.has(directive.amount.currency),
  );
}

/** The account and currency of the balance an error was reported on. */
function balanceAt(
  error: BeancountError,
  files: FileMap,
): { account: string; currency: string } | null {
  const source = error.file ? files[error.file] : undefined;
  if (source === undefined || !error.line) return null;
  const block = splitIntoBlocks(source).find(
    (candidate) => candidate.startLine + 1 === error.line,
  );
  const header = block?.text.split("\n")[0].replace(/;.*$/, "").trim();
  const match = header
    ? /^\d{4}-\d{2}-\d{2}\s+balance\s+(\S+)\s.*\s(\S+)$/.exec(header)
    : null;
  return match ? { account: match[1], currency: match[2] } : null;
}

/** `files[file]` with the block written at 1-based `line` blanked, every other line number kept. */
function withoutBlock(source: string, line: number): string {
  const lines = source.split("\n");
  for (const block of splitIntoBlocks(source)) {
    if (block.startLine + 1 !== line) continue;
    for (let at = block.startLine; at < block.endLine; at += 1) lines[at] = "";
    break;
  }
  return lines.join("\n");
}

const sameError = (a: BeancountError, b: BeancountError) =>
  a.code === b.code &&
  a.message === b.message &&
  (a.file ?? null) === (b.file ?? null) &&
  (a.line ?? null) === (b.line ?? null);

/**
 * What an unused pad hides. Beancount pads only the first balance after a pad
 * and checks every later one on its own; rustledger keeps counting a pad it
 * did not need (or that w21/135 dropped as within tolerance), so a later
 * failing balance was neither reported nor given an Off-by (w21/675, w21/676).
 * Each unused pad is reported (E2003), and the ledger is checked again with
 * those pads blanked out, line numbers kept: the balance failures that run
 * adds are the ones the pad had silenced. A pad that filled one currency is
 * used, but its account's balances in another currency are Beancount's own
 * (w21/705): it is blanked for the second run too, and that run's failures in
 * the currencies it did fill, which only the blanking caused, are left out.
 *
 * `reparse` returns the errors rustledger reports for a file map: `files` with
 * the unused pads blanked, or, where balances were checked on a plugin's
 * transformed stream, that stream without `unused` (w21/704).
 */
export async function errorsHiddenByUnusedPads(
  directives: readonly DirectiveJson[],
  paddingTransactions: readonly DirectiveJson[],
  files: FileMap,
  known: readonly BeancountError[],
  reparse: (
    files: FileMap,
    unused: readonly DirectiveJson[],
  ) => Promise<readonly BeancountError[]>,
): Promise<BeancountError[]> {
  const filled = paddedCurrencies(paddingTransactions);
  const pads = directives.filter(
    (directive): directive is Pad => directive.type === "pad",
  );
  const unused = pads.filter((pad) => !filled.has(keyOf(pad)));
  const partly = pads.filter((pad) => {
    const currencies = filled.get(keyOf(pad));
    return (
      currencies !== undefined &&
      assertsOtherCurrency(directives, pad, currencies)
    );
  });
  if (unused.length === 0 && partly.length === 0) return [];

  const claimed = new Set<string>();
  const extra: BeancountError[] = [];
  const blanked: FileMap = { ...files };
  let changed = false;
  for (const pad of [...unused, ...partly]) {
    const [file, line] = padLocation(pad, files, claimed);
    if (!filled.has(keyOf(pad))) {
      const error = unusedPadError(file, line);
      if (!known.some((existing) => sameError(existing, error))) {
        extra.push(error);
      }
    }
    if (file !== null && line !== null) {
      blanked[file] = withoutBlock(blanked[file], line);
      changed = true;
    }
  }
  if (!changed) return extra;

  // Blanking a used pad drops the padding it did add, on both its accounts.
  const lost = new Set(
    partly.flatMap((pad) =>
      [...filled.get(keyOf(pad))!].flatMap((currency) => [
        `${pad.account}\0${currency}`,
        `${pad.source_account}\0${currency}`,
      ]),
    ),
  );
  for (const error of await reparse(blanked, [...unused, ...partly])) {
    if (!BALANCE_CODES.has(error.code ?? "")) continue;
    if ([...known, ...extra].some((existing) => sameError(existing, error))) {
      continue;
    }
    const balance = lost.size > 0 ? balanceAt(error, files) : null;
    if (balance && lost.has(`${balance.account}\0${balance.currency}`)) {
      continue;
    }
    extra.push(error);
  }
  return extra;
}
