import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FeedSource,
  GetChangelogDocument,
  type GetChangelogQuery,
} from "@/graphql/definitions";

const useQueryMock = vi.fn();

vi.mock("@apollo/client/react", () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => key,
    i18n: { language: "zh-CN" },
  }),
}));

import {
  localizedSiteUrl,
  useChangelogWatermark,
} from "../use-changelog-watermark";

type Release = GetChangelogQuery["getFeed"]["items"][number];

const NOW = new Date("2026-09-15T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * DAY).toISOString();
}

function release(id: string, publishedAt: string, locale = "zh"): Release {
  const path = locale === "en" ? `blog/${id}` : `${locale}/blog/${id}`;
  return {
    __typename: "FeedItem",
    // The backend stamps the localized permalink, so the same release arrives
    // under a different id in every language.
    id: `changelog:https://beancount.io/${path}`,
    title: `Release ${id}`,
    summary: "Summary",
    link: `https://beancount.io/${path}`,
    publishedAt,
    source: FeedSource.Changelog,
  };
}

function memoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (index) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  };
}

function arrange({ items }: { items: Release[] }) {
  useQueryMock.mockImplementation((document: unknown) => {
    if (document === GetChangelogDocument) {
      return {
        data: { getFeed: { items, total: items.length, hasMore: false } },
        loading: false,
        error: undefined,
      };
    }
    throw new Error("unexpected query");
  });
}

describe("useChangelogWatermark", () => {
  let originalStorage: Storage;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    originalStorage = global.localStorage;
    global.localStorage = memoryStorage();
  });

  afterEach(() => {
    global.localStorage = originalStorage;
    vi.useRealTimers();
  });

  it("revalidates on every mount so a release published mid-session appears", () => {
    arrange({ items: [] });
    renderHook(() => useChangelogWatermark());

    expect(useQueryMock).toHaveBeenCalledWith(
      GetChangelogDocument,
      expect.objectContaining({ fetchPolicy: "cache-and-network" }),
    );
  });

  it("does not let an unread release age out of the first-visit window", () => {
    // 29 days old on the first visit, so inside the window and unread.
    arrange({ items: [release("a", daysAgo(29)), release("b", daysAgo(31))] });
    const first = renderHook(() => useChangelogWatermark());
    expect(first.result.current.unreadCount).toBe(1);
    const recordedCutoff = localStorage.getItem(
      "beancount.changelog.flaggedFrom",
    );
    expect(recordedCutoff).not.toBeNull();
    first.unmount();

    // Two days pass. The same release is now 31 days old; a cutoff recomputed
    // against the current clock would quietly mark it read.
    vi.setSystemTime(new Date(NOW.getTime() + 2 * DAY));
    arrange({ items: [release("a", daysAgo(29)), release("b", daysAgo(31))] });
    const second = renderHook(() => useChangelogWatermark());

    expect(second.result.current.unreadCount).toBe(1);
    expect(second.result.current.isUnread(second.result.current.items[0])).toBe(
      true,
    );
    // The cutoff is a fixed point, not a window that follows the clock.
    expect(localStorage.getItem("beancount.changelog.flaggedFrom")).toBe(
      recordedCutoff,
    );
  });

  it("flags only releases from the last 30 days on a first visit", () => {
    arrange({
      items: [release("recent", daysAgo(10)), release("old", daysAgo(45))],
    });
    const { result } = renderHook(() => useChangelogWatermark());

    expect(result.current.unreadCount).toBe(1);
    expect(result.current.isUnread(result.current.items[0])).toBe(true);
    expect(result.current.isUnread(result.current.items[1])).toBe(false);
  });

  it("markAllRead clears every flag and persists the newest release", () => {
    const newest = daysAgo(3);
    arrange({
      items: [release("a", newest), release("b", daysAgo(10))],
    });
    const { result } = renderHook(() => useChangelogWatermark());
    expect(result.current.unreadCount).toBe(2);

    act(() => result.current.markAllRead());

    expect(result.current.unreadCount).toBe(0);
    expect(
      JSON.parse(localStorage.getItem("beancount.changelog.seenThrough")!),
    ).toBe(newest);
  });

  it("markRead flips one release and advances the watermark once the last one is opened", () => {
    arrange({
      items: [release("a", daysAgo(3)), release("b", daysAgo(10))],
    });
    const { result } = renderHook(() => useChangelogWatermark());

    act(() => result.current.markRead(result.current.items[0]));
    expect(result.current.unreadCount).toBe(1);
    expect(result.current.isUnread(result.current.items[0])).toBe(false);

    act(() => result.current.markRead(result.current.items[1]));
    expect(result.current.unreadCount).toBe(0);
    expect(
      JSON.parse(localStorage.getItem("beancount.changelog.seenThrough")!),
    ).toBe(daysAgo(3));
  });

  it("survives a throwing storage without surfacing an error", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    global.localStorage = {
      ...memoryStorage(),
      getItem: () => {
        throw new Error("storage disabled");
      },
      setItem: () => {
        throw new Error("storage disabled");
      },
    };
    arrange({ items: [release("a", daysAgo(1))] });
    const { result } = renderHook(() => useChangelogWatermark());

    expect(result.current.unreadCount).toBe(1);
    expect(() => act(() => result.current.markAllRead())).not.toThrow();
    warn.mockRestore();
  });

  it("keeps a partially read release read across a language switch", () => {
    // Two releases so opening one records it instead of advancing the
    // watermark past everything.
    arrange({ items: [release("a", daysAgo(3)), release("b", daysAgo(5))] });
    const first = renderHook(() => useChangelogWatermark());
    act(() => first.result.current.markRead(first.result.current.items[0]));
    expect(first.result.current.unreadCount).toBe(1);
    first.unmount();

    // Same two posts, now fetched in English: different ids, same releases.
    arrange({
      items: [release("a", daysAgo(3), "en"), release("b", daysAgo(5), "en")],
    });
    const second = renderHook(() => useChangelogWatermark());

    expect(second.result.current.isUnread(second.result.current.items[0])).toBe(
      false,
    );
    expect(second.result.current.unreadCount).toBe(1);
  });

  it("builds the localized changelog and blog URLs", () => {
    arrange({ items: [] });
    const { result } = renderHook(() => useChangelogWatermark());

    expect(result.current.allReleasesUrl).toBe(
      "https://beancount.io/zh/changelog",
    );
    expect(localizedSiteUrl("en-US", "/blog")).toBe(
      "https://beancount.io/blog",
    );
    expect(localizedSiteUrl("fa", "/changelog")).toBe(
      "https://beancount.io/fa/changelog",
    );
    expect(localizedSiteUrl("xx", "/changelog")).toBe(
      "https://beancount.io/changelog",
    );
  });
});
