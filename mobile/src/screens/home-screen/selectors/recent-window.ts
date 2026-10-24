import {
  type CardLoadState,
  selectCardLoadState,
} from "../../../common/apollo/card-load-state";

/**
 * Home's Recent Transactions shows what has happened: entries dated up to and
 * including today. The journal sorts newest first with no cap at today, so
 * entries pre-entered for later (rent for the next five months, forecast or
 * amortize copies) filled all five rows and hid what had actually happened
 * (w21/471).
 *
 * The query asks through the end of the month and a few more rows than the card
 * shows, and `recentTransactionsUpTo` drops the future ones on the client. A
 * window ending today changed the query's variables, and so its cache key,
 * every day: the copy persisted for offline use had no entry the next morning
 * and the card read "Couldn't load" (w21/513). The range needs both ends, so
 * it starts at the earliest date the ledger accepts.
 */
export function recentTransactionsWindow(today: string): string {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `0001-01-01 - ${today.slice(0, 8)}${String(lastDay).padStart(2, "0")}`;
}

/** Rows asked for beyond the card's own, to absorb entries dated later this month. */
export const RECENT_FUTURE_BUFFER = 20;

/** The newest `limit` entries dated no later than `today`. */
export function recentTransactionsUpTo<T extends { date: string }>(
  entries: readonly T[],
  today: string,
  limit: number,
): T[] {
  return entries.filter((entry) => entry.date <= today).slice(0, limit);
}

/**
 * Whether the month-end page may have run out before reaching today: it came
 * back full and holds fewer than `limit` entries up to today, because later
 * entries of this month took its rows (w21/664). Only then is a second read,
 * ending today, worth making.
 */
export function pageEndedBeforeToday(
  entries: readonly { date: string }[],
  today: string,
  limit: number,
  pageSize: number,
): boolean {
  return (
    entries.length >= pageSize &&
    recentTransactionsUpTo(entries, today, limit).length < limit
  );
}

/** The window ending today, for that second read (the key changes with the day, so it is kept to when it is needed). */
export function recentTransactionsWindowToToday(today: string): string {
  return `0001-01-01 - ${today}`;
}

/** What one of the card's reads holds, as `selectRecentCardState` reads it. */
type RecentRead = { loading: boolean; hasData: boolean; error: unknown };

/**
 * Which branch Recent Transactions renders, with both of its reads: the
 * month-end page and, when that page ran out before today, the read up to
 * today. Until that second read landed the card held only the page's past
 * rows, often none, and said "No transactions yet" with Add Transaction; a
 * failed one left that for good (w21/700). So it is part of the card's state:
 * pending, it holds the skeleton, and failed, the failure tile. Rows already
 * shown stay: they are the newest that have happened, just fewer.
 *
 * With nothing shown, the card also reads the newest entry, to tell a ledger
 * whose entries are all booked for later from a new one; until that read lands
 * the card holds the skeleton, and a failed one shows the failure, rather than
 * the first-run copy and its button (w21/919).
 */
export function selectRecentCardState({
  page,
  past,
  newest = null,
  shown,
}: {
  page: RecentRead;
  /** The read up to today; `null` while the page does not need it. */
  past: Omit<RecentRead, "loading"> | null;
  /** The newest-entry read; `null` while nothing is left to tell apart. */
  newest?: Omit<RecentRead, "loading"> | null;
  shown: number;
}): CardLoadState {
  if (selectCardLoadState(page) === "failed") return "failed";
  if (shown > 0) return "ready";
  const second =
    past === null
      ? "ready"
      : selectCardLoadState({ ...past, loading: !past.hasData });
  if (second === "failed") return "failed";
  const last =
    newest === null
      ? "ready"
      : selectCardLoadState({ ...newest, loading: !newest.hasData });
  if (last === "failed") return "failed";
  return page.loading || second === "loading" || last === "loading"
    ? "loading"
    : "ready";
}
