/**
 * One place that knows which queries derive from the ledger, so no screen has
 * to hand-maintain a `refetchQueries` array.
 *
 * Why this exists: the cache is a bare `InMemoryCache` with no `typePolicies`
 * (see `./cache.ts`), so root fields are keyed by field name + args and a write
 * invalidates nothing implicitly. Nothing self-heals either — `(tabs)/_layout`
 * sets `lazy: false`, so all five tabs mount once and stay mounted, and
 * `network-only` only fires on mount.
 *
 * The whole mechanism is `cache.evict` inside `refetchQueries`'s `updateCache`.
 * That one move covers both halves of the problem: Apollo refetches exactly the
 * watched queries the eviction dirtied — verified for `cache-first`,
 * `cache-and-network` and `network-only` alike, one network call each — and the
 * eviction also clears variable sets nobody is watching, which is the only way
 * a `cache-first` query like the `/budget` page's interval totals ever stops
 * serving pre-write numbers.
 *
 * Note the absent `include:` option. Naming the documents there is redundant
 * (eviction already dirties them) and Apollo logs "Unknown query named ..." for
 * every one that has no active observer — which, with five tabs mounted out of
 * fourteen documents, is most of them on every write.
 *
 * Kept free of any `@/` imports so the jest-lite runner can require it.
 */
import { makeVar, NetworkStatus } from "@apollo/client";
import type { ApolloClient } from "@apollo/client";

/**
 * How much of the ledger a write touched.
 *
 * - `errors` — cheap enough to fire on every editor save while the user is
 *   still typing. The editor renders these, so they must be current the moment
 *   the save lands.
 * - `entries` — one directive changed: a transaction added, edited or deleted,
 *   an account opened, a budget written.
 * - `file` — a whole `.bean` file changed. The broadest write in the app: it
 *   can rewrite every transaction, account, balance and parse error at once.
 */
export type LedgerInvalidationScope = "errors" | "entries" | "file";

const ERRORS_FIELDS = ["getLedgerErrors"] as const;

const ENTRIES_FIELDS = [
  ...ERRORS_FIELDS,
  "getLedgerJournal",
  "getLedgerBalanceSheet",
  "getLedgerTrialBalance",
  "getLedgerAccountReport",
  "getLedgerAccountJournal",
  "getLedgerIncomeStatement",
  "getLedgerIntervalTotals",
  // Price dates behind the market-valued balances above; an entry write can
  // add a `price` directive.
  "getLedgerCommodities",
  "getLedgerManagedPrices",
  "ledgerMeta",
  // The account list (`attributes.accounts`) and close dates: opening or
  // closing an account changes them, and a new account has no posting for any
  // other read to carry — Accounts kept the pre-write tree (w21/056).
  "getLedger",
  "getLedgerAccountDirectives",
  // Every write is a git commit, so the notifications history moves too.
  "listCommits",
  // Size, sha and lastCommitSha in the file browser: an entry write commits to
  // its file, and a stale sha handed back to `deleteLedgerFile` as the
  // optimistic lock refused the delete until a refresh (w21/079).
  "getLedgerDirContent",
  // Fixed app-authored BQL aggregations (Merchants directory and later
  // merchant/recurring views). Evict on every entry write so rollups stay exact.
  "queryShell",
] as const;

const FILE_FIELDS = [
  ...ENTRIES_FIELDS,
  "getLedgerNarrations",
  "getLedgerPayees",
  "getLedgerPayeeAccounts",
] as const;

/**
 * Root query fields — what `cache.evict` takes, not operation names.
 * `file` is a superset of `entries` is a superset of `errors`, by construction.
 *
 * Deliberately absent:
 * - `homeCharts` — the client no longer defines this operation at all (the
 *   `.graphql` file was deleted once nothing called `useHomeChartsQuery`); the
 *   field still exists server-side. Home's net-worth chart reads
 *   `getLedgerBalanceSheet`, which is in `entries`.
 * - `getLedgerEntryContext` — evicting it after a *delete* would send the
 *   still-mounted detail screen back for an entry that no longer exists. The
 *   edit screen, which reads its own slice back, refetches it explicitly.
 * - `getFeed`, `userProfile`, `suggestTransactionCategories` — not
 *   ledger-derived. The last one is an LLM call, which is why this is a curated
 *   list and not a blanket `include: "active"`.
 */
export const LEDGER_SCOPE_FIELDS: Record<
  LedgerInvalidationScope,
  readonly string[]
> = {
  errors: ERRORS_FIELDS,
  entries: ENTRIES_FIELDS,
  file: FILE_FIELDS,
};

/**
 * Bumped on every invalidation. Watched-query consumers need nothing from this
 * — eviction reaches them — but code that reads the ledger through a one-off
 * `client.query` does: it is not an observable query, so nothing re-runs it.
 * The Home budget panel is the case in point. It fetches interval totals
 * imperatively per budget and keys its effect on the budget *directives*, which
 * a new transaction does not change — so without a signal to depend on it would
 * keep showing pre-write actuals over a cache entry that was correctly evicted.
 */
export const ledgerRevisionVar = makeVar(0);

/** What `invalidateLedgerData` asks of the cache persistor around a refetch. */
export type InvalidationPersistence = {
  begin(): void;
  end(succeeded: boolean): void;
};

let persistence: InvalidationPersistence | null = null;

export function setInvalidationPersistence(
  next: InvalidationPersistence | null,
): void {
  persistence = next;
}

/**
 * Pauses `persistor` while invalidations are in flight and, once the last one
 * has settled, saves the cache only if every refetch succeeded. After a failed
 * one the disk keeps its last complete snapshot: the pre-write ledger beats an
 * evicted, empty one. Overlapping invalidations share one pause.
 */
export function createInvalidationGuard(persistor: {
  pause(): void;
  resume(): void;
  persist(): Promise<void>;
}): InvalidationPersistence {
  let inFlight = 0;
  let failed = false;
  return {
    begin() {
      if (inFlight === 0) failed = false;
      inFlight += 1;
      persistor.pause();
    },
    end(succeeded) {
      if (!succeeded) failed = true;
      inFlight -= 1;
      if (inFlight > 0) return;
      persistor.resume();
      if (!failed) persistor.persist().catch(() => undefined);
    },
  };
}

/**
 * Drop every cached read of the ledger in `scope` and re-run the ones on screen.
 *
 * Never rejects. The write it follows has already committed, so reporting an
 * invalidation failure to the caller would invite a duplicate write. Await it
 * when the caller is about to navigate into a screen that must already be
 * correct; otherwise let it settle in the background.
 */
export async function invalidateLedgerData(
  client: ApolloClient<unknown>,
  scope: LedgerInvalidationScope,
): Promise<void> {
  const fields = LEDGER_SCOPE_FIELDS[scope];

  // The persistor saves on every cache write, evictions included. Saved while
  // the cache is empty and the refetch then fails, the disk copy is the empty
  // one and the next offline launch shows "Failed to load" everywhere
  // (w21/350). Hold saving until the refetch has settled.
  persistence?.begin();
  let succeeded = false;
  try {
    await client.refetchQueries({
      updateCache(cache) {
        for (const fieldName of fields) {
          cache.evict({ id: "ROOT_QUERY", fieldName });
        }
        cache.gc();
      },
      // The read-back after a write must not fold into a read already in
      // flight: that one answers with the rows as they stood before the write,
      // and a deleted row stayed listed (w21/904). Only these reads skip
      // deduplication; the screens' own co-mounted queries still share one
      // request (w21/975).
      onQueryUpdated: (observableQuery) =>
        observableQuery.reobserve(
          {
            fetchPolicy: "network-only",
            pollInterval: 0,
            context: {
              ...observableQuery.options.context,
              queryDeduplication: false,
            },
          },
          NetworkStatus.refetch,
        ),
    });
    succeeded = true;
  } catch (error: unknown) {
    console.warn(`ledger invalidation (${scope}) failed`, error);
  } finally {
    persistence?.end(succeeded);
    // After the eviction, so a consumer woken by this re-reads on a cold cache
    // rather than racing the refetch. Bumped even when the refetch failed —
    // the cache was still cleared, and a stale reader must not stay stale.
    ledgerRevisionVar(ledgerRevisionVar() + 1);
  }
}
