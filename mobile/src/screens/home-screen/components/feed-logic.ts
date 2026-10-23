import { FeedSource } from "../../../generated-graphql/types";
import { getFormatDate } from "../../../common/format-util";
import { formatFeedDate, formatMoment } from "../../../common/date-format";
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
