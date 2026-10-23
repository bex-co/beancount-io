import type { BeancountError, DirectiveJson, FileMap } from "@rustledger/wasm";
import { indexBlocks } from "./block-index";
import { beancountPluginRuns } from "./plugins/collect-plugins";
import { includeTraversalOrder } from "./source-slice";

/** rustledger's own check: once per transaction, with none of the opt-outs. */
const RUSTLEDGER = /^Account '.*' uses multiple currencies: /u;
/** A posting line's account, after its flag if it has one. */
const POSTING = /^\s+(?:[*!&#?%]\s*|[PSTCURM]\s+)?(\S+)/u;
const HEADER =
  /^(\d{4}-\d{2}-\d{2})\s+(?:balance\s+(\S+)|txn\b|[*!&#?%PSTCURM](?:\s|$))/u;

type Kind = "units" | "cost";
/** Beancount's sort key for an entry, and where it is written. */
type Place = {
  date: string;
  order: number;
  line: number;
  seq: number;
  file: string;
};

const later = (a: Place, b: Place) =>
  a.date !== b.date
    ? a.date > b.date
    : a.order !== b.order
      ? a.order > b.order
      : a.line !== b.line
        ? a.line > b.line
        : a.seq > b.seq;

/** Beancount reads `onecommodity: FALSE` (or any false value) as an opt-out. */
function optsOut(open: Extract<DirectiveJson, { type: "open" }>): boolean {
  const value = open.meta?.onecommodity;
  return value === false || value === "";
}

/** Whether `pattern` matches `account` from its start, as `re.match` does. */
function matchesFromStart(pattern: RegExp, account: string): boolean {
  pattern.lastIndex = 0;
  return pattern.test(account);
}

/**
 * The accounts Beancount's check refuses, with the commodities it found:
 * units from postings and balances, costs from postings at cost. Skipped are
 * accounts opened `onecommodity: FALSE` or with several currencies, and those
 * the config pattern does not match from their start (`re.match`).
 */
function mixedAccounts(
  entries: readonly DirectiveJson[],
  pattern: RegExp | null,
): Map<Kind, Map<string, string[]>> {
  const skip = new Set<string>();
  for (const entry of entries) {
    if (entry.type !== "open") continue;
    if (
      optsOut(entry) ||
      (pattern !== null && !matchesFromStart(pattern, entry.account)) ||
      entry.currencies.length > 1
    ) {
      skip.add(entry.account);
    }
  }
  const seen = new Map<Kind, Map<string, Set<string>>>([
    ["units", new Map()],
    ["cost", new Map()],
  ]);
  const add = (kind: Kind, account: string, currency: string | undefined) => {
    if (skip.has(account) || !currency) return;
    const byAccount = seen.get(kind)!;
    byAccount.set(account, (byAccount.get(account) ?? new Set()).add(currency));
  };
  for (const entry of entries) {
    if (entry.type === "balance")
      add("units", entry.account, entry.amount.currency);
    if (entry.type !== "transaction") continue;
    for (const posting of entry.postings) {
      add("units", posting.account, posting.units?.currency);
      add("cost", posting.account, posting.cost?.currency);
    }
  }
  return new Map(
    [...seen].map(([kind, byAccount]) => [
      kind,
      new Map(
        [...byAccount]
          .filter(([, currencies]) => currencies.size > 1)
          .map(([account, currencies]) => [account, [...currencies]]),
      ),
    ]),
  );
}

/**
 * Where Beancount places each account's error: the last entry, in its order
 * (date, then balances before transactions, then line, not file), that holds
 * the account; for costs, a posting at cost. Pads are expanded after the
 * plugin runs (`PLUGINS_POST`), so no padding is among them.
 */
function lastPlaces(
  files: FileMap,
  entryPoint: string,
  mixed: Map<Kind, Map<string, string[]>>,
): Map<string, Place> {
  const wanted = (kind: Kind, account: string) => mixed.get(kind)!.has(account);
  const places = new Map<string, Place>();
  const index = indexBlocks(files);
  let seq = 0;
  for (const file of includeTraversalOrder(files, entryPoint)) {
    for (const block of index.blocks(file)) {
      const [header = "", ...lines] = block.text.split("\n");
      const match = HEADER.exec(header);
      if (match === null) continue;
      const [, date = "", balanced] = match;
      const place = (order: number) => ({
        date,
        order,
        line: block.startLine + 1,
        seq: seq++,
        file,
      });
      const hold = (kind: Kind, account: string, at: Place) => {
        const key = `${kind} ${account}`;
        if (!wanted(kind, account)) return;
        const last = places.get(key);
        if (last === undefined || later(at, last)) places.set(key, at);
      };
      if (balanced !== undefined) {
        hold("units", balanced, place(-1));
      } else {
        const at = place(0);
        for (const line of lines) {
          const account = POSTING.exec(line)?.[1];
          if (account === undefined) continue;
          hold("units", account, at);
          if (line.includes("{")) hold("cost", account, at);
        }
      }
    }
  }
  return places;
}

/**
 * Beancount's `onecommodity` (`plugin "beancount.plugins.onecommodity"
 * "<pattern>"`, or `pedantic`) refuses an account holding more than one commodity, once per
 * account, on its last entry. rustledger's native check honours none of its
 * opt-outs (an open's `onecommodity: FALSE`, an open naming several
 * currencies, the account pattern), says so once per transaction, without a
 * location, and never checks costs, so a ledger bean-check passes read as
 * broken (w21/736). With the plugin declared, its errors are replaced by
 * Beancount's, computed over the booked stream (`entries`): "More than one currency in account 'X': A,B", and the same for
 * cost currencies.
 */
export function reconcileOneCommodityErrors(
  errors: readonly BeancountError[],
  entries: readonly DirectiveJson[],
  files: FileMap,
  entryPoint: string,
): BeancountError[] {
  const configs = beancountPluginRuns(files[entryPoint], "onecommodity");
  if (configs.length === 0) return [...errors];
  let patterns: (RegExp | null)[];
  try {
    // Sticky, so a pattern matches from the account's start, as `re.match`.
    patterns = configs.map((config) =>
      config ? new RegExp(config, "y") : null,
    );
  } catch {
    return [...errors];
  }
  const reconciled = errors.filter((error) => !RUSTLEDGER.test(error.message));
  for (const pattern of patterns) {
    const mixed = mixedAccounts(entries, pattern);
    const places = lastPlaces(files, entryPoint, mixed);
    for (const [kind, label] of [
      ["units", "currency"],
      ["cost", "cost currency"],
    ] as const) {
      for (const [account, currencies] of mixed.get(kind)!) {
        const at = places.get(`${kind} ${account}`);
        reconciled.push({
          message: `More than one ${label} in account '${account}': ${currencies.join(",")}`,
          code: "PLUGIN",
          phase: "plugin",
          hint: null,
          file: at?.file ?? null,
          line: at?.line ?? null,
          column: at ? 1 : null,
          end_line: null,
          end_column: null,
          severity: "error",
        });
      }
    }
  }
  return reconciled;
}
