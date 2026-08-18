/**
 * Frecency ("frequency × recency") over locally recorded account usage: how the
 * picker decides which handful of accounts to pin above the list, and how
 * equally-good search matches break their tie.
 *
 * Usage is app-side preference state, like the theme — the beancount ledger
 * stays the source of truth for what accounts exist, and nothing here writes to
 * it. This module owns the shape of that state as well as the scoring, so the
 * reducer that records a pick and the ranking that reads it can't drift apart.
 *
 * `now` is a parameter rather than a `Date.now()` call inside, so a score is
 * reproducible under test and one screen ranks against a single instant.
 *
 * Kept free of any `@/` imports so the jest-lite runner can require it.
 */

/** One account's usage on one ledger. */
export interface AccountUsageEntry {
  /** How many times the account has been picked. */
  count: number;
  /** Epoch ms of the most recent pick. */
  lastUsedAt: number;
}

/** Usage for a single ledger, keyed by account name. */
export type AccountUsage = Record<string, AccountUsageEntry>;

/** Usage for every ledger the user has picked an account on. */
export type LedgerAccountUsage = Record<string, AccountUsage>;

/**
 * A ledger's usage and the instant to rank it against. The two only mean
 * anything together — usage without a `now` would score every pick as if it
 * had just happened — so they travel as one value rather than as two optional
 * arguments a caller can half-supply.
 */
export interface RankingContext {
  usage: AccountUsage;
  now: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Recency multipliers by age, in the spirit of Firefox's frecency: buckets
 * rather than a decay curve, because the ordering people actually notice is
 * "today / this week / this month / older", and a bucketed score stays an exact
 * integer — no float drift to reason about when two accounts tie.
 */
const RECENCY_WEIGHTS: ReadonlyArray<{ maxAgeDays: number; weight: number }> = [
  { maxAgeDays: 1, weight: 100 },
  { maxAgeDays: 7, weight: 70 },
  { maxAgeDays: 30, weight: 50 },
  { maxAgeDays: 90, weight: 30 },
];

/** Multiplier for a pick older than the last bucket. */
const STALE_WEIGHT = 10;

/** Shared so `usageFor` hands back one stable identity for "no usage yet". */
const NO_USAGE: AccountUsage = {};

/**
 * How strongly an account should surface, 0 when it never has been picked.
 * Count is the base; how recently it was last picked scales it.
 */
export function frecencyScore(
  entry: AccountUsageEntry | undefined,
  now: number,
): number {
  if (!entry || entry.count <= 0) {
    return 0;
  }
  // A clock that moved backwards reads as "just now" rather than as a negative
  // age that would fall out of every bucket and land on STALE_WEIGHT.
  const ageDays = Math.max(0, now - entry.lastUsedAt) / DAY_MS;
  const bucket = RECENCY_WEIGHTS.find(({ maxAgeDays }) => ageDays < maxAgeDays);
  return entry.count * (bucket ? bucket.weight : STALE_WEIGHT);
}

/**
 * The `limit` best accounts in `usage`, best first. Accounts with no usage
 * never appear. Equal scores fall back to the more recent pick, then to
 * alphabetical order, so the pinned rows don't reshuffle between renders.
 *
 * `offered` is the accounts the caller can actually show: usage outlives the
 * accounts it names, and one renamed or closed elsewhere would otherwise hold
 * a slot. Screened before scoring, so it can neither cost a score nor eat the
 * cap.
 */
export function topAccounts(
  { usage, now }: RankingContext,
  limit: number,
  offered?: readonly string[],
): string[] {
  const eligible = offered && new Set(offered);
  const ranked: Array<{
    account: string;
    entry: AccountUsageEntry;
    score: number;
  }> = [];
  for (const [account, entry] of Object.entries(usage)) {
    if (eligible && !eligible.has(account)) {
      continue;
    }
    const score = frecencyScore(entry, now);
    if (score > 0) {
      ranked.push({ account, entry, score });
    }
  }
  ranked.sort(
    (a, b) =>
      b.score - a.score ||
      b.entry.lastUsedAt - a.entry.lastUsedAt ||
      a.account.localeCompare(b.account),
  );
  return ranked.slice(0, limit).map(({ account }) => account);
}

/** One ledger's usage out of the whole map — `NO_USAGE` when it has none. */
export function usageFor(
  byLedger: LedgerAccountUsage,
  ledgerId: string,
): AccountUsage {
  return byLedger[ledgerId] || NO_USAGE;
}

/**
 * `byLedger` with one more pick of `account` on `ledgerId` recorded.
 *
 * Pure, and new objects all the way down the touched path: the reactive var
 * holding this state notifies by identity, so mutating in place would persist
 * the change but never re-render the picker.
 */
export function recordUsage(
  byLedger: LedgerAccountUsage,
  ledgerId: string,
  account: string,
  now: number,
): LedgerAccountUsage {
  const ledgerUsage = byLedger[ledgerId] ?? NO_USAGE;
  return {
    ...byLedger,
    [ledgerId]: {
      ...ledgerUsage,
      [account]: {
        count: (ledgerUsage[account]?.count ?? 0) + 1,
        lastUsedAt: now,
      },
    },
  };
}
