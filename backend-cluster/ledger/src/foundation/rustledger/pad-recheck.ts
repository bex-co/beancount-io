import type { BeancountError, DirectiveJson, FileMap } from "@rustledger/wasm";
import { indexBlocks, type BlockIndex } from "./block-index";
import { directiveToText } from "./journal-serialize";
import { padLocator, unusedPadError } from "./pad-tolerance";

type Pad = Extract<DirectiveJson, { type: "pad" }>;
type Balance = Extract<DirectiveJson, { type: "balance" }>;

const BALANCE_CODES = new Set(["E2001", "E2002"]);

function padKey(date: string, account: string, source: string): string {
  return `${date}\0${account}\0${source}`;
}

/** Each pad's kept padding transactions, by pad. */
function paddingByPad(
  paddingTransactions: readonly DirectiveJson[],
): Map<string, DirectiveJson[]> {
  const padded = new Map<string, DirectiveJson[]>();
  for (const transaction of paddingTransactions) {
    if (transaction.type !== "transaction" || transaction.postings.length < 2) {
      continue;
    }
    const key = padKey(
      transaction.date,
      transaction.postings[0].account,
      transaction.postings[1].account,
    );
    padded.set(key, [...(padded.get(key) ?? []), transaction]);
  }
  return padded;
}

/** The currencies a pad's padding filled. */
const currenciesOf = (padding: readonly DirectiveJson[]): Set<string> =>
  new Set(
    padding.flatMap((transaction) =>
      transaction.type === "transaction" && transaction.postings[0]?.units
        ? [transaction.postings[0].units.currency]
        : [],
    ),
  );

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

/** `account` and every account above it: `A:B:C`, `A:B`, `A`. */
function selfAndAncestors(account: string): string[] {
  const parts = account.split(":");
  return parts.map((_, end) => parts.slice(0, end + 1).join(":"));
}

/** The first index in sorted `items` where `after` holds. */
function firstWhere<T>(items: readonly T[], after: (item: T) => boolean) {
  let low = 0;
  let high = items.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (after(items[middle])) high = middle;
    else low = middle + 1;
  }
  return low;
}

/**
 * Whether a padding moves a balance rustledger checked without it. rustledger
 * fills a pad's next balance in the same pass that checks the balances, so a
 * balance it reached before the padding was in its running totals passed
 * against a stream the service then serves with that padding merged in
 * (w31/014). That is the pad's own balance when the source sits in the padded
 * account's subtree (a pad from the account itself, or from a child, adds
 * nothing there: bean-check reports `accumulated 0`), and any balance in the
 * padding's currency on a leg's account or above it, dated after the padding
 * and no later than the balance that set its amount (a second pad, filled on a
 * later balance, posting into an account checked first). Beancount checks
 * every balance after its pad plugin has run, over all the padding.
 *
 * Loose on purpose: a ledger it flags only costs the second run, whose
 * balances are checked by the engine against the padding as served.
 */
function movesCheckedBalance(
  directives: readonly DirectiveJson[],
  paddingTransactions: readonly DirectiveJson[],
): boolean {
  if (paddingTransactions.length === 0) return false;
  const balances = new Map<string, Array<{ at: number; balance: Balance }>>();
  const padAt = new Map<string, number>();
  directives.forEach((directive, at) => {
    if (directive.type === "balance") {
      const key = `${directive.account}\0${directive.amount.currency}`;
      const list = balances.get(key) ?? [];
      list.push({ at, balance: directive });
      balances.set(key, list);
    } else if (directive.type === "pad") {
      const key = keyOf(directive);
      if (!padAt.has(key)) padAt.set(key, at);
    }
  });
  for (const transaction of paddingTransactions) {
    if (transaction.type !== "transaction" || transaction.postings.length < 2) {
      continue;
    }
    const [padded, source] = transaction.postings;
    if (padded.units === undefined) continue;
    const pad =
      padAt.get(padKey(transaction.date, padded.account, source.account)) ?? -1;
    const own = balances.get(`${padded.account}\0${padded.units.currency}`);
    const trigger = own?.[firstWhere(own, (entry) => entry.at > pad)]?.balance;
    // No balance found to have set it: every later one may have missed it.
    const until = trigger?.date ?? "9999-12-31";
    for (const posting of transaction.postings) {
      if (posting.units === undefined) continue;
      for (const account of selfAndAncestors(posting.account)) {
        const list = balances.get(`${account}\0${posting.units.currency}`);
        if (list === undefined) continue;
        // A balance is checked at the start of its day, before that day's padding.
        const from = firstWhere(
          list,
          (entry) => entry.balance.date > transaction.date,
        );
        for (let next = from; next < list.length; next += 1) {
          const { balance } = list[next];
          if (balance.date > until) break;
          // The padded leg is what fills its own balance.
          if (balance === trigger && posting === padded) continue;
          return true;
        }
      }
    }
  }
  return false;
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
 * adds are the ones the pad had silenced.
 *
 * A pad that filled one currency is used, but its account's balances in
 * another currency are Beancount's own (w21/705). For the second run it is
 * replaced by the padding it did add (`standIns`, written at the end of its
 * file so no line moves): the currencies it filled keep their padding, and the
 * others are checked on their own. Blanking it outright dropped that padding
 * too, and the failures that caused hid one an unused pad had silenced
 * (w21/720).
 *
 * A padding can also move a balance rustledger had already checked: a pad
 * from its own account or a child, or a second pad posting into an account
 * checked before it was filled (`movesCheckedBalance`). Then every used pad
 * is replaced by its padding, so the second run checks each balance against
 * the stream as it is served, as Beancount checks it after its pad plugin
 * (w31/014).
 *
 * rustledger also reports "Multiple pad directives" (E2004) on the next pad
 * after one it still counts as open, an error Beancount does not have: those
 * that do not recur in the second run come back as `cleared` (w21/706).
 *
 * `reparse` returns the errors rustledger reports for a file map: `files` with
 * the pads blanked and the stand-ins written, or, where balances were checked
 * on a plugin's transformed stream, that stream with `removed` swapped for
 * `standIns` (w21/704).
 */
export async function errorsHiddenByUnusedPads(
  directives: readonly DirectiveJson[],
  paddingTransactions: readonly DirectiveJson[],
  files: FileMap,
  known: readonly BeancountError[],
  reparse: (
    files: FileMap,
    removed: readonly DirectiveJson[],
    standIns: readonly DirectiveJson[],
  ) => Promise<readonly BeancountError[]>,
): Promise<{ added: BeancountError[]; cleared: BeancountError[] }> {
  const padding = paddingByPad(paddingTransactions);
  const lastBalance = lastBalanceDates(directives);
  const pads = directives.filter(
    (directive): directive is Pad => directive.type === "pad",
  );
  const unused = pads.filter((pad) => !padding.has(keyOf(pad)));
  const everyUsed = movesCheckedBalance(directives, paddingTransactions);
  const partly = pads.filter((pad) => {
    const kept = padding.get(keyOf(pad));
    return (
      kept !== undefined &&
      (everyUsed || assertsOtherCurrency(lastBalance, pad, currenciesOf(kept)))
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
  const removed: Pad[] = [];
  const standIns: DirectiveJson[] = [];
  const written = new Map<string, string[]>();
  // Twin pads share their padding; it stands in once.
  const standing = new Set<string>();
  for (const pad of [...unused, ...partly]) {
    const [file, line] = locate(pad);
    const kept = padding.get(keyOf(pad));
    if (kept === undefined) {
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
      removed.push(pad);
      if (kept !== undefined && !standing.has(keyOf(pad))) {
        standing.add(keyOf(pad));
        const texts = written.get(file) ?? [];
        for (const transaction of kept) {
          standIns.push(transaction);
          texts.push(
            directiveToText({ ...transaction, flag: "*" } as DirectiveJson),
          );
        }
        written.set(file, texts);
      }
    }
  }
  if (starts.size === 0) return { added, cleared: [] };
  const blanked: FileMap = { ...files };
  for (const [file, lines] of starts) {
    blanked[file] = withoutBlocks(index, file, files[file], lines);
  }
  for (const [file, texts] of written) {
    blanked[file] = `${blanked[file]}\n${texts.join("\n")}`;
  }

  const rechecked = await reparse(blanked, removed, standIns);
  for (const error of rechecked) {
    if (!BALANCE_CODES.has(error.code ?? "")) continue;
    if (seen.has(errorKey(error))) continue;
    seen.add(errorKey(error));
    added.push(error);
  }
  const recurring = new Set(rechecked.map(errorKey));
  const cleared = known.filter(
    (error) => error.code === "E2004" && !recurring.has(errorKey(error)),
  );
  return { added, cleared };
}
