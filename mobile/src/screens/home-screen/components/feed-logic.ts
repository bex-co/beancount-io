import { FeedSource } from "../../../generated-graphql/types";
import { getFormatDate } from "../../../common/format-util";
import { formatFeedDate, formatMoment } from "../../../common/date-format";
import { isolateLtr } from "../../../common/bidi";
import {
  normalizeOrigin,
  resolveAppLink,
  type AppLinkTarget,
} from "../../../common/app-links/resolve-app-link";

export type FeedSourceLabelKey =
  "feedSourceLedger" | "feedSourceBlog" | "feedSourceRelease";

/**
 * Translation key for the source label of a feed row. Product releases arrive
 * from the changelog feed and used to be labelled "Blog" alongside marketing
 * posts, which is the one thing they are not.
 */
export function feedSourceLabelKey(source: FeedSource): FeedSourceLabelKey {
  switch (source) {
    case FeedSource.LedgerRss:
      return "feedSourceLedger";
    case FeedSource.Changelog:
      return "feedSourceRelease";
    default:
      return "feedSourceBlog";
  }
}

/**
 * The feed's query variables. The feed is asked for in the app's language:
 * pinned to "en", a German app listed English titles that opened `/blog/…`
 * instead of `/de/blog/…` (w21/136). Being a variable, a language change
 * refetches.
 */
export function feedQueryVariables(limit: number, locale: string) {
  return { offset: 0, limit, locale };
}

export type FeedRowAction =
  | { kind: "external"; url: string }
  | { kind: "ledger"; target: AppLinkTarget; sourceUrl: string };

/**
 * What tapping a feed row does. Blog and release rows link out; ledger
 * activity carries a relative `/ledger/<owner>/<name>[/commit/<sha>]` path,
 * which the row ignored, so "Committed to …" rows looked tappable and did
 * nothing (w21/137). Those open in the app as the same URL would. A row
 * whose link resolves to nothing is not a button.
 */
export function feedRowAction(
  link: string,
  serverUrl: string,
): FeedRowAction | null {
  if (/^https?:\/\//.test(link)) return { kind: "external", url: link };
  if (!link.startsWith("/ledger/")) return null;
  const sourceUrl = `${normalizeOrigin(serverUrl)}${link}`;
  const target = resolveAppLink(sourceUrl, { serverUrl });
  return target ? { kind: "ledger", target, sourceUrl } : null;
}

/**
 * Whether a row's date is a calendar day rather than an instant. Blog and
 * release posts are date-only and arrive as midnight UTC; ledger activity
 * is a real commit time, read in the device's zone (w21/147).
 */
export function feedDateIsCalendarDay(source: FeedSource): boolean {
  return source !== FeedSource.LedgerRss;
}

/**
 * The date a row shows: a post's calendar day, or a commit's day and time in
 * the device's zone (`timeZone`, for a test). Dated only, two commits with one
 * message on one day read as the same row (w21/715), as Notifications' did
 * before w21/487.
 */
export function feedRowDate(
  publishedAt: unknown,
  source: FeedSource,
  locale: string,
  timeZone?: string,
): string {
  return feedDateIsCalendarDay(source)
    ? formatFeedDate(publishedAt, locale, { calendarDay: true })
    : formatMoment(publishedAt, locale, timeZone);
}

/**
 * The day a row shows. A blog or release post is a calendar day (midnight UTC);
 * ledger activity is a commit time, shown in the device's zone.
 */
function displayedDay(item: {
  publishedAt: unknown;
  source: FeedSource;
}): string {
  const published = String(item.publishedAt);
  if (feedDateIsCalendarDay(item.source)) return published.slice(0, 10);
  return getFormatDate(new Date(published));
}

/**
 * The rows newest first by the day they show, then by time within a day. The
 * server sorts by instant, so a commit at 18:30 Pacific on the 21st (01:30Z on
 * the 22nd) sat above the 22nd's posts, and the dates read "Oct 21" over "Oct
 * 22" (w21/598). A row whose date does not parse keeps its place at the end.
 */
export function sortFeedItems<
  T extends { publishedAt: unknown; source: FeedSource },
>(items: readonly T[]): T[] {
  const keyed = items.map((item, index) => {
    const time = Date.parse(String(item.publishedAt));
    return {
      item,
      index,
      time,
      day: Number.isNaN(time) ? "" : displayedDay(item),
    };
  });
  keyed.sort((a, b) => {
    if (a.day !== b.day) return a.day < b.day ? 1 : -1;
    if (a.time !== b.time && !Number.isNaN(a.time) && !Number.isNaN(b.time)) {
      return b.time - a.time;
    }
    return a.index - b.index;
  });
  return keyed.map(({ item }) => item);
}

/**
 * What a ledger row says beyond "Committed to books": the commit message as its
 * second line, and who committed it when that is not the signed-in account. Every
 * save read as the same row, so several in a day looked duplicated, and a
 * collaborator's commit to a shared ledger could not be told from yours
 * (w21/599). Blog and release rows keep their title only, as before.
 */
export function feedRowDetail(
  item: {
    source: FeedSource;
    summary?: string | null;
    author?: string | null;
  },
  me?: {
    username?: string | null;
    names?: ReadonlyArray<string | null | undefined>;
  },
): { subtitle: string | null; byline: string | null } {
  if (item.source !== FeedSource.LedgerRss) {
    return { subtitle: null, byline: null };
  }
  const subtitle = item.summary?.trim() || null;
  const author = item.author?.trim() || null;
  const mine = [me?.username, ...(me?.names ?? [])]
    .map((name) => name?.trim().toLowerCase())
    .filter(Boolean);
  const byline = author && !mine.includes(author.toLowerCase()) ? author : null;
  return { subtitle, byline };
}

/** The server's English titles for ledger activity, and the keys that say them. */
const LEDGER_TITLES: ReadonlyArray<[RegExp, string]> = [
  [/^Committed to (.+)$/, "feedCommittedTo"],
  [/^Created repository (.+)$/, "feedCreatedLedger"],
];

/**
 * A row's title in the app's language. The server writes ledger activity in
 * English ("Committed to mcp-agent-eval"), so a German Home read English rows
 * (w21/718): a commit or a new ledger is said in the app's words, with the
 * ledger's name isolated for a right-to-left language; any other title is the
 * server's.
 */
export function feedRowTitle(
  title: string,
  source: FeedSource,
  t: (key: string, params?: Record<string, string>) => string,
): string {
  if (source !== FeedSource.LedgerRss) return title;
  for (const [pattern, key] of LEDGER_TITLES) {
    const match = pattern.exec(title.trim());
    if (match) return t(key, { ledger: isolateLtr(match[1]!) });
  }
  return title;
}

/** The server's last summary line for a push holding more commits than it lists. */
const MORE_COMMITS = /^\+(\d+) more commit\(s\)$/;

/**
 * A push's summary lists its newest commits, then "+N more commit(s)" in
 * English. The row shows two lines, so past two commits that count was cut
 * off, and it read English in every language (w21/716). This is the push's
 * newest commit and how many commits it holds in all, for the row to say in
 * its own words; null for any other summary.
 */
export function pushSummary(
  summary: string,
): { newest: string; total: number } | null {
  const lines = summary
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const more = MORE_COMMITS.exec(lines.at(-1) ?? "");
  const listed = lines.slice(0, -1);
  if (!more || listed.length === 0) return null;
  return { newest: listed[0]!, total: listed.length + Number(more[1]) };
}

/**
 * Whether the Latest Updates card has nothing to show and leaves the screen. An
 * empty feed (the server answers `[]` for any RSS outage) used to be a header
 * over a blank card (w21/417). A failed first load keeps its retry card, and a
 * load in flight its skeleton.
 */
export function feedCardIsEmpty({
  failed,
  loading,
  itemCount,
}: {
  failed: boolean;
  loading: boolean;
  itemCount: number;
}): boolean {
  return !failed && !loading && itemCount === 0;
}
