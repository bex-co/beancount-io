import type { DirectiveJson, MetaValueJson } from "@rustledger/wasm";

/**
 * The per-account data the `getLedgerAccounts` endpoint returns — a port of
 * fava-slim's `AccountsModule.load_file` (`fava/modules/accounts.py`), which
 * `reports.py`'s `get_ledger_accounts` serialises as `dict[str,
 * AccountDataPublic]`:
 *
 *   ledger = ctx.fava_client.get_ledger(...)
 *   result = {name: AccountDataPublic.model_validate(data)
 *             for name, data in ledger.accounts.items()}
 *
 * `AccountDataPublic` (server/app/schemas/report.py) carries five fields:
 * `close_date`, `meta`, `uptodate_status`, `balance_string`, `last_entry`
 * (`{ date, entry_hash }`).
 *
 * WHICH ACCOUNTS APPEAR (byte-exact parity, golden-validated):
 * `AccountsModule.load_file` builds the dict in two passes over the *plugin-run*
 * entry stream (`ledger.all_entries`):
 *   1. every `Open` entry `setdefault`s its account (source order), and
 *   2. every `Close` entry `setdefault`s its account then sets `close_date`.
 * So the key set is exactly `{opened accounts} ∪ {closed accounts}`, and
 * `close_date` is the date of the account's `Close` directive (or `null`). This
 * is reproduced here by walking the rustledger `getDirectives()` stream, which —
 * like fava — runs beancount's plugins first: an `auto_accounts` (or `auto`)
 * ledger synthesises `Open` directives for otherwise-unopened accounts, and
 * those synthesised opens appear in the stream, so the account set matches fava
 * exactly with or without the plugin (verified live against the WASM AND the real
 * `fava.core.loader` for explicit-open, `auto_accounts`, and close-without-open
 * ledgers — see account-list.test.ts + account-list.golden.json).
 *
 * ── ACCEPTED, DOCUMENTED GAP: `last_entry.entry_hash` (and `meta`) ──
 * Fava's `last_entry.entry_hash` is `hash_entry(entry)`, whose hash is
 * META-INCLUSIVE — it folds in the entry's `filename`/`lineno` metadata. The
 * rustledger `DirectiveJson` wire shape does NOT expose `filename`/`lineno`
 * (this is the same fundamental limitation `entry-hash.ts` documents for its
 * `exclude_meta` choice), so the entry hash CANNOT be reproduced byte-exact from
 * a `DirectiveJson`. Likewise `meta` on the `Open` entry carries beancount's
 * automatic `filename`/`lineno` keys that the WASM strips. Both are therefore
 * approximated, NOT byte-exact.
 *
 * This gap is production-safe: the ONLY load-bearing output through the migrated
 * path is the **account name set** plus each account's **`close_date`** (open vs.
 * closed). `getAccounts`/`getAccountsDetail` (`ledger-account-service.ts`) and
 * `getOpenLedgerAccounts` (`plaid-item-service.ts`) consume only the account
 * name + `close_date == null` open/closed filter; no caller reads `last_entry`,
 * `meta`, `uptodate_status`, or `balance_string` (verified by grepping every
 * consumer of `getLedgerAccounts`). The account set + `close_date` are
 * golden-validated byte-exact; the remaining fields are produced as faithfully as
 * the wire shape allows (`last_entry.date` from the account's last referencing
 * directive; `meta` from the `Open` directive's non-automatic meta;
 * `uptodate_status`/`balance_string` left `null`, matching fava for the common
 * case of an account with no `fava-uptodate-indication` meta).
 */

/** `AccountDataPublic.last_entry` — the account's last non-close entry. */
export interface AccountLastEntry {
  /** ISO `YYYY-MM-DD` date of the last referencing directive. */
  date: string;
  /**
   * Fava's `hash_entry` of that entry. NOT byte-exact vs. fava (its hash is
   * meta-inclusive on `filename`/`lineno`, which the WASM does not expose) — see
   * the module-level ACCEPTED GAP note. Emitted as `""` (no meta-exact hash is
   * derivable) and never consumed downstream.
   */
  entry_hash: string;
}

/**
 * The per-account record `getLedgerAccounts` returns for one account —
 * structurally `AccountDataPublic` (report.py). `close_date` and the account key
 * are byte-exact vs. fava; `meta`/`last_entry` are best-effort and
 * `uptodate_status`/`balance_string` default to `null` (see module note).
 */
export interface AccountDataPublic {
  /** ISO date of the account's `Close` directive, or `null` if still open. */
  close_date: string | null;
  /** The `Open` directive's (non-automatic) metadata; `{}` when none. */
  meta: Record<string, MetaValueJson>;
  /** Only set when the account has a `fava-uptodate-indication` meta; else `null`. */
  uptodate_status: string | null;
  /** Only set alongside a non-green `uptodate_status`; else `null`. */
  balance_string: string | null;
  /** The account's last non-close entry, or `null` if it has none. */
  last_entry: AccountLastEntry | null;
}

/** Meta keys beancount attaches automatically and fava/JSON consumers ignore. */
const AUTOMATIC_META_KEYS: ReadonlySet<string> = new Set([
  "filename",
  "lineno",
  "__automatic__",
  "__tolerances__",
]);
const FLAG_UNREALIZED = "U";

/** Strip beancount's automatic meta keys, leaving only user-declared metadata. */
function stripAutomaticMeta(
  meta: Record<string, MetaValueJson> | undefined,
): Record<string, MetaValueJson> {
  if (!meta) return {};
  const out: Record<string, MetaValueJson> = {};
  Object.entries(meta).forEach(([key, value]) => {
    if (!AUTOMATIC_META_KEYS.has(key)) out[key] = value;
  });
  return out;
}

/**
 * Build the `{ accountName -> AccountDataPublic }` map the `getLedgerAccounts`
 * endpoint returns, from a parsed rustledger snapshot's directive stream.
 *
 * @param directives - The full directive list from a rustledger parse
 *   (`getDirectives()` / `parseLedgerFiles(...).directives`). Must be the
 *   plugin-run stream (as `getDirectives()` returns) so `auto_accounts`-style
 *   synthesised `Open`s are included, matching fava's `all_entries`.
 *
 * Insertion order mirrors fava's `load_file`: opened accounts first (in source
 * order), then any close-only accounts. Only the account SET and each account's
 * `close_date` are guaranteed byte-exact vs. fava (golden-validated); the
 * remaining fields are best-effort — see the module-level ACCEPTED GAP note.
 */
export function collectLedgerAccounts(
  directives: DirectiveJson[],
): Record<string, AccountDataPublic> {
  const accounts: Record<string, AccountDataPublic> = {};
  const openedAccounts = new Set<string>();

  const ensure = (account: string): AccountDataPublic => {
    let data = accounts[account];
    if (!data) {
      data = {
        close_date: null,
        meta: {},
        uptodate_status: null,
        balance_string: null,
        last_entry: null,
      };
      accounts[account] = data;
    }
    return data;
  };

  // Pass 1: every Open seeds its account and (last-Open-wins) carries its meta,
  // exactly as fava's `load_file` iterates `all_entries_by_type.Open`.
  directives.forEach((directive) => {
    if (directive.type !== "open") return;
    const data = ensure(directive.account);
    data.meta = stripAutomaticMeta(directive.meta);
    openedAccounts.add(directive.account);
  });

  // Pass 2: every Close seeds (if unseen) then stamps the close date, mirroring
  // fava's `all_entries_by_type.Close` loop.
  directives.forEach((directive) => {
    if (directive.type !== "close") return;
    ensure(directive.account).close_date = directive.date;
  });

  // Best-effort `last_entry.date` from the account's last referencing directive
  // (fava's `get_last_entry`, minus the meta-inclusive hash it cannot mirror).
  // Fava computes `last_entry` only inside its per-`Open` loop AND skips it when
  // the last grouped entry is a `Close` (`not isinstance(last, Close)`), so a
  // closed account carries no `last_entry`. Mirror both: restrict to opened
  // accounts, and drop the field when the account's last referencing directive is
  // its own close.
  const lastEntry = accountLastReferencingDirective(directives);
  openedAccounts.forEach((account) => {
    const last = lastEntry.get(account);
    if (last && !last.isClose) {
      accounts[account].last_entry = { date: last.date, entry_hash: "" };
    }
  });

  return accounts;
}

/**
 * The last directive that references each account, with whether it was a `Close`
 * — the input fava's `get_last_entry` reduces (which returns `None` when the last
 * grouped entry is a `Close`). Assumes date-sorted directives (rustledger output
 * is), so the last occurrence in the stream wins.
 */
function accountLastReferencingDirective(
  directives: DirectiveJson[],
): Map<string, { date: string; isClose: boolean }> {
  const last = new Map<string, { date: string; isClose: boolean }>();
  const touch = (account: string, date: string, isClose: boolean): void => {
    last.set(account, { date, isClose });
  };
  directives.forEach((directive) => {
    switch (directive.type) {
      case "transaction":
        if (directive.flag === FLAG_UNREALIZED) break;
        directive.postings.forEach((posting) =>
          touch(posting.account, directive.date, false),
        );
        break;
      case "close":
        touch(directive.account, directive.date, true);
        break;
      case "open":
      case "balance":
      case "note":
      case "document":
        touch(directive.account, directive.date, false);
        break;
      case "pad":
        touch(directive.account, directive.date, false);
        touch(directive.source_account, directive.date, false);
        break;
      default:
        break;
    }
  });
  return last;
}
