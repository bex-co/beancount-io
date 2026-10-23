import type { BeancountError, DirectiveJson, FileMap } from "@rustledger/wasm";
import { indexBlocks, type BlockIndex } from "./block-index";
import { padLocator, unusedPadError } from "./pad-tolerance";

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

/** Each account's latest balance date per currency. */
function lastBalanceDates(
  directives: readonly DirectiveJson[],
): Map<string, Map<string, string>> {
  const last = new Map<string, Map<string, string>>();
  for (const directive of directives) {
    if (directive.type !== "balance") continue;
    const dates = last.get(directive.account) ?? new Map<string, string>();
    const currency = directive.amount.currency;
    if ((dates.get(currency) ?? "") < directive.date) {
      dates.set(currency, directive.date);
    }
    last.set(directive.account, dates);
  }
  return last;
}

/**
 * Whether the pad's account asserts a balance after it in a currency the pad
 * did not fill. Beancount gives a pad only each currency's first balance after
 * it, padded or not, so such a balance is checked on its own; rustledger let
 * the pad cover it too (w21/705).
 */
function assertsOtherCurrency(
  lastBalance: ReadonlyMap<string, ReadonlyMap<string, string>>,
  pad: Pad,
  filled: ReadonlySet<string>,
): boolean {
  for (const [currency, date] of lastBalance.get(pad.account) ?? []) {
    if (date > pad.date && !filled.has(currency)) return true;
  }
  return false;
}

/** The account and currency of the balance an error was reported on. */
function balanceAt(
  error: BeancountError,
  index: BlockIndex,
): { account: string; currency: string } | null {
  if (!error.file || !error.line) return null;
  const block = index.at(error.file, error.line);
  const header = block?.text.split("\n")[0].replace(/;.*$/, "").trim();
  const match = header
    ? /^\d{4}-\d{2}-\d{2}\s+balance\s+(\S+)\s.*\s(\S+)$/.exec(header)
    : null;
  return match ? { account: match[1], currency: match[2] } : null;
}

/** `file`'s source with the blocks written at 1-based `starts` blanked, every other line number kept. */
function withoutBlocks(
  index: BlockIndex,
  file: string,
  source: string,
  starts: readonly number[],
): string {
  const lines = source.split("\n");
  for (const start of starts) {
    const block = index.at(file, start);
    if (block === undefined) continue;
    for (let at = block.startLine; at < block.endLine; at += 1) lines[at] = "";
  }
  return lines.join("\n");
}

/** What tells two reports of one error apart: its code, words and place. */
const errorKey = (error: BeancountError) =>
  `${error.code}\0${error.message}\0${error.file ?? ""}\0${error.line ?? ""}`;

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
 * rustledger also reports "Multiple pad directives" (E2004) on the next pad
 * after one it still counts as open, an error Beancount does not have: those
 * that do not recur in the second run come back as `cleared` (w21/706).
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
): Promise<{ added: BeancountError[]; cleared: BeancountError[] }> {
  const filled = paddedCurrencies(paddingTransactions);
  const lastBalance = lastBalanceDates(directives);
  const pads = directives.filter(
    (directive): directive is Pad => directive.type === "pad",
  );
  const unused = pads.filter((pad) => !filled.has(keyOf(pad)));
  const partly = pads.filter((pad) => {
    const currencies = filled.get(keyOf(pad));
    return (
      currencies !== undefined &&
      assertsOtherCurrency(lastBalance, pad, currencies)
    );
  });
  if (unused.length === 0 && partly.length === 0) {
    return { added: [], cleared: [] };
  }

  const index = indexBlocks(files);
  const locate = padLocator(files, index);
  const seen = new Set(known.map(errorKey));
  const added: BeancountError[] = [];
  const starts = new Map<string, number[]>();
  for (const pad of [...unused, ...partly]) {
    const [file, line] = locate(pad);
    if (!filled.has(keyOf(pad))) {
      const error = unusedPadError(file, line);
      if (!seen.has(errorKey(error))) {
        seen.add(errorKey(error));
        added.push(error);
      }
    }
    if (file !== null && line !== null) {
      const lines = starts.get(file) ?? [];
      lines.push(line);
      starts.set(file, lines);
    }
  }
  if (starts.size === 0) return { added, cleared: [] };
  const blanked: FileMap = { ...files };
  for (const [file, lines] of starts) {
    blanked[file] = withoutBlocks(index, file, files[file], lines);
  }

  // Blanking a used pad drops the padding it did add, on both its accounts.
  const lost = new Set(
    partly.flatMap((pad) =>
      [...filled.get(keyOf(pad))!].flatMap((currency) => [
        `${pad.account}\0${currency}`,
        `${pad.source_account}\0${currency}`,
      ]),
    ),
  );
  const rechecked = await reparse(blanked, [...unused, ...partly]);
  for (const error of rechecked) {
    if (!BALANCE_CODES.has(error.code ?? "")) continue;
    if (seen.has(errorKey(error))) continue;
    const balance = lost.size > 0 ? balanceAt(error, index) : null;
    if (balance && lost.has(`${balance.account}\0${balance.currency}`)) {
      continue;
    }
    seen.add(errorKey(error));
    added.push(error);
  }
  const recurring = new Set(rechecked.map(errorKey));
  const cleared = known.filter(
    (error) => error.code === "E2004" && !recurring.has(errorKey(error)),
  );
  return { added, cleared };
}
