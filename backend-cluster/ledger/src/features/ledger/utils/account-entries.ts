import type { DirectiveJson } from "@rustledger/wasm";
import { getEntryAccounts } from "@/foundation/rustledger/directive-filter";
import {
  accountOwnUnitBalances,
  collectLedgerAccounts,
  hashEntry,
} from "@/foundation/rustledger";
// Kept as the DTO/output contract these helpers project onto (no runtime fava).
import type {
  DirectiveType,
  JournalOpenPublic,
  JournalClosePublic,
} from "@/foundation/ledger-api-types";

/**
 * Account open/close/balance/count helpers for `getAccountDirectives`, ported
 * from the former fava-backed paging onto the in-process rustledger engine.
 *
 * The previous implementation pulled Open/Close journal pages, per-account
 * last-entry balances (`getLedgerAccountLastEntries`), and a BQL
 * `count(account)` from the Python service. Each is now derived directly from a
 * parsed `DirectiveJson[]` snapshot:
 *
 *  - {@link collectOpenEntries} / {@link collectCloseEntries} — the ledger's
 *    Open / Close directives (source order), each with its {@link hashEntry}.
 *  - {@link accountBalances} — the units balance from each asset or liability
 *    account's own postings, including closed accounts.
 *  - {@link accountEntryCounts} — the per-account posting count, mirroring the
 *    BQL `SELECT account, count(account)` the endpoint ran (that query counts
 *    posting rows, so an opened-but-never-posted account counts 0).
 *
 * ── ACCEPTED, DOCUMENTED GAP: `entry_hash` ──
 * The former fava path stamped each Open/Close with fava's META-INCLUSIVE
 * `hash_entry` (folds in `filename`/`lineno`). rustledger's `DirectiveJson` does
 * not expose those, so {@link hashEntry} is the `exclude_meta=True` variant — the
 * only hash reproducible from a `DirectiveJson`, and the SAME hash the whole
 * source-slice deep-link chain (`findEntrySlice`/`getContext`/delete/update) keys
 * on. So the value is internally consistent (a deep link built from this hash
 * resolves correctly) but NOT byte-equal to the old fava value. This mirrors the
 * identical accepted gap in `account-list.ts` / `entry-hash.ts` / `source-slice.ts`.
 */

/**
 * Default root prefixes whose accounts carry a units balance (beancount
 * `name_assets`/`name_liabilities`). Callers that have resolved a ledger's
 * actual root names (via `deriveReportAccounts`) should pass those instead, so
 * a ledger renaming its assets/liabilities roots still surfaces balances.
 */
const DEFAULT_BALANCE_ROOTS = ["Assets", "Liabilities"];

/** The Open directives in source order, each with its (exclude-meta) entry hash. */
export function collectOpenEntries(
  directives: DirectiveJson[],
): JournalOpenPublic[] {
  const opens: JournalOpenPublic[] = [];
  directives.forEach((directive) => {
    if (directive.type !== "open") return;
    opens.push({
      directive_type: "Open" as DirectiveType,
      date: directive.date,
      account: directive.account,
      entry_hash: hashEntry(directive),
      currencies:
        directive.currencies.length > 0 ? [...directive.currencies] : null,
      booking: directive.booking ?? null,
    });
  });
  return opens;
}

/** The Close directives in source order, each with its (exclude-meta) entry hash. */
export function collectCloseEntries(
  directives: DirectiveJson[],
): JournalClosePublic[] {
  const closes: JournalClosePublic[] = [];
  directives.forEach((directive) => {
    if (directive.type !== "close") return;
    closes.push({
      directive_type: "Close" as DirectiveType,
      date: directive.date,
      account: directive.account,
      entry_hash: hashEntry(directive),
    });
  });
  return closes;
}

/**
 * Each Assets/Liabilities account's own posting balance in units, including
 * closed accounts and accounts that have no postings.
 */
export function accountBalances(
  directives: DirectiveJson[],
  balanceRoots: string[] = DEFAULT_BALANCE_ROOTS,
): Map<string, Record<string, string>> {
  const accounts = collectLedgerAccounts(directives);
  const ownBalances = accountOwnUnitBalances(directives);
  const balances = new Map<string, Record<string, string>>();
  Object.keys(accounts).forEach((account) => {
    if (!balanceRoots.some((root) => isUnderRoot(account, root))) return;
    balances.set(account, ownBalances.get(account) ?? {});
  });
  return balances;
}

/** Whether `account` is `root` or one of its subaccounts (`root:...`). */
function isUnderRoot(account: string, root: string): boolean {
  return account === root || account.startsWith(`${root}:`);
}

/**
 * Per-account posting count — parity for the BQL
 * `SELECT account, count(account)` the former path ran. beancount's query
 * expands each transaction into one row per posting, so `count(account)` is the
 * number of postings referencing the account across the whole ledger. An account
 * that is only opened/closed (never posted to) has no rows and counts 0.
 */
export function accountEntryCounts(
  directives: DirectiveJson[],
): Map<string, number> {
  const counts = new Map<string, number>();
  directives.forEach((directive) => {
    if (directive.type !== "transaction") return;
    directive.postings.forEach((posting) => {
      counts.set(posting.account, (counts.get(posting.account) ?? 0) + 1);
    });
  });
  return counts;
}

/** Count each directive once per account, excluding its own open and close. */
export function accountReferenceCounts(
  directives: readonly DirectiveJson[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const directive of directives) {
    if (directive.type === "open" || directive.type === "close") continue;
    for (const account of new Set(getEntryAccounts(directive))) {
      counts.set(account, (counts.get(account) ?? 0) + 1);
    }
  }
  return counts;
}
