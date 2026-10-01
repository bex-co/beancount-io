import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@apollo/client/react";
import {
  GetChangelogDocument,
  type GetChangelogQuery,
} from "@/graphql/definitions";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n";
import { useLocalStorageState } from "./use-local-storage-state";
import { useTranslations } from "./use-translations";

export type ChangelogRelease = GetChangelogQuery["getFeed"]["items"][number];

const SEEN_THROUGH_KEY = "beancount.changelog.seenThrough";
const READ_IDS_KEY = "beancount.changelog.readIds";
const FLAGGED_FROM_KEY = "beancount.changelog.flaggedFrom";
/** A first visit flags only releases from the last 30 days, not the history. */
const FIRST_VISIT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const CHANGELOG_LIMIT = 5;
const SITE_URL = "https://beancount.io";

function parseTime(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const time =
    value instanceof Date ? value.getTime() : new Date(String(value)).getTime();
  return Number.isNaN(time) ? null : time;
}

/**
 * Site URL for the active UI language: `/zh/changelog` for Chinese and
 * `/changelog` for English, matching how the CMS publishes translated pages.
 */
export function localizedSiteUrl(language: string, path: string): string {
  const lang = language.split("-")[0];
  const localized =
    lang !== "en" && SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
  return localized ? `${SITE_URL}/${lang}${path}` : `${SITE_URL}${path}`;
}

/**
 * Identity of a release that does not change with the UI language.
 *
 * A changelog item's id and link both carry the locale that fetched them
 * (`https://beancount.io/zh/blog/2026/08/28/...`), so keying read state on
 * either makes an already-opened release unread again the moment the user
 * switches language. The post's path without that prefix is the same in every
 * locale. The transport id deliberately stays locale-specific — it is what
 * keeps one release's translations apart in the Apollo cache.
 */
function releaseIdentity(item: ChangelogRelease): string {
  let path = item.link;
  try {
    path = new URL(item.link).pathname;
  } catch {
    // A relative link is already free of the origin; use it as it is.
  }
  const segments = path.split("/").filter(Boolean);
  const [first] = segments;
  if (
    segments.length > 1 &&
    first !== undefined &&
    SUPPORTED_LANGUAGES.includes(first as SupportedLanguage)
  ) {
    segments.shift();
  }
  return segments.join("/") || item.id;
}

export interface ChangelogWatermark {
  /** Releases newest first, already in the UI language. */
  items: ChangelogRelease[];
  loading: boolean;
  /** The changelog request failed; callers hide or degrade quietly. */
  failed: boolean;
  unreadCount: number;
  isUnread: (item: ChangelogRelease) => boolean;
  /** Clear one release's flag; advances the watermark when it was the last unread one. */
  markRead: (item: ChangelogRelease) => void;
  /** Advance the watermark to the newest release. */
  markAllRead: () => void;
  /** Localized changelog page for the "Changelog" link. */
  allReleasesUrl: string;
}

/**
 * Which changelog releases are new to this user, tracked per device in local
 * storage.
 *
 * Deliberately not server state. A reading position is not a fact the server
 * acts on, so the only thing a database column would buy is agreeing across a
 * user's own devices — a nicety that is not worth a column on the identity
 * table, a public mutation, and the same unread rule reimplemented in every
 * client. Re-flagging a release on a second browser is the accepted cost.
 *
 * The watermark only moves on an explicit action: "Mark all as read" or
 * opening the last unread release. Merely visiting a page never marks one
 * seen, and neither does the passage of time — the first-visit cutoff is
 * recorded once rather than recomputed against the current clock.
 */
export function useChangelogWatermark(): ChangelogWatermark {
  const { i18n } = useTranslations();
  const language = i18n.language?.split("-")[0] || "en";
  const { data, loading, error } = useQuery(GetChangelogDocument, {
    variables: { limit: CHANGELOG_LIMIT, locale: language },
    // Render what we have, then revalidate. Under the default cache-first
    // policy a release published while the tab was open stayed invisible
    // until a full reload, because returning to the dashboard only re-read
    // the cache.
    fetchPolicy: "cache-and-network",
  });
  const [seenThrough, setSeenThrough] = useLocalStorageState<string | null>(
    SEEN_THROUGH_KEY,
    null,
    { syncAcrossTabs: true },
  );
  // Locale-independent identities, not transport ids — see releaseIdentity.
  const [readIds, setReadIds] = useLocalStorageState<string[]>(
    READ_IDS_KEY,
    [],
    { syncAcrossTabs: true },
  );
  // Releases published before this instant never count as new. Recorded once,
  // on the first visit, and never moved afterwards: recomputing
  // `now - 30 days` on every mount silently aged unread releases out of the
  // window, so a 29-day-old release the user had not opened turned itself
  // read two days later.
  const [flaggedFrom, setFlaggedFrom] = useLocalStorageState<string | null>(
    FLAGGED_FROM_KEY,
    null,
    { syncAcrossTabs: true },
  );
  const [mountFlaggedFrom] = useState(() =>
    new Date(Date.now() - FIRST_VISIT_WINDOW_MS).toISOString(),
  );
  useEffect(() => {
    if (flaggedFrom === null) {
      setFlaggedFrom(mountFlaggedFrom);
    }
  }, [flaggedFrom, mountFlaggedFrom, setFlaggedFrom]);

  const items = useMemo(() => data?.getFeed.items ?? [], [data]);
  const recordedTime = parseTime(seenThrough) ?? 0;
  const firstVisitFloor =
    parseTime(flaggedFrom) ?? parseTime(mountFlaggedFrom) ?? 0;
  const watermark = recordedTime || firstVisitFloor;

  const readIdSet = useMemo(() => new Set(readIds), [readIds]);
  const isUnread = useCallback(
    (item: ChangelogRelease) => {
      const time = parseTime(item.publishedAt);
      return (
        time !== null &&
        time > watermark &&
        !readIdSet.has(releaseIdentity(item))
      );
    },
    [watermark, readIdSet],
  );
  const unreadCount = useMemo(
    () => items.filter(isUnread).length,
    [items, isUnread],
  );

  const newestTime = useMemo(
    () =>
      items.reduce<number | null>((max, item) => {
        const time = parseTime(item.publishedAt);
        return time !== null && (max === null || time > max) ? time : max;
      }, null),
    [items],
  );

  const markAllRead = useCallback(() => {
    if (newestTime === null || newestTime <= recordedTime) return;
    setSeenThrough(new Date(newestTime).toISOString());
    setReadIds([]);
  }, [newestTime, recordedTime, setSeenThrough, setReadIds]);

  const markRead = useCallback(
    (item: ChangelogRelease) => {
      if (!isUnread(item)) return;
      const remaining = items.filter(
        (other) => other.id !== item.id && isUnread(other),
      ).length;
      if (remaining === 0) {
        markAllRead();
        return;
      }
      const identity = releaseIdentity(item);
      setReadIds((prev) =>
        prev.includes(identity) ? prev : [...prev, identity],
      );
    },
    [isUnread, items, markAllRead, setReadIds],
  );

  return {
    items,
    loading,
    failed: Boolean(error),
    unreadCount,
    isUnread,
    markRead,
    markAllRead,
    allReleasesUrl: localizedSiteUrl(language, "/changelog"),
  };
}
