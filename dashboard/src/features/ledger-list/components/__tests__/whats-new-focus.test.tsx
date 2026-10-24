import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FeedSource, type GetChangelogQuery } from "@/graphql/definitions";

/**
 * What's new keeps the keyboard on its disclosure when its layout changes
 * (w4/1040). Show and Hide each swapped in a layout without the button just
 * pressed, so focus fell to the page and a second Enter did nothing. The real
 * WhatsNew runs over the real watermark hook; only the changelog read is
 * stubbed.
 */
type Release = GetChangelogQuery["getFeed"]["items"][number];
const NOW = new Date("2026-10-23T12:00:00.000Z");
const release = (id: string, daysAgo: number): Release => ({
  __typename: "FeedItem",
  id: `changelog:https://beancount.io/blog/${id}`,
  title: `Release ${id}`,
  summary: `Summary ${id}`,
  link: `https://beancount.io/blog/${id}`,
  publishedAt: new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString(),
  source: FeedSource.Changelog,
});
const feed = vi.hoisted(() => ({ items: [] as Release[] }));

vi.mock("@apollo/client/react", () => ({
  useQuery: () => ({
    data: {
      getFeed: { items: feed.items, total: feed.items.length, hasMore: false },
    },
    loading: false,
    error: undefined,
  }),
}));
vi.mock("@/common/analytics/events", () => ({ track: vi.fn() }));
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params?.count !== undefined ? `${key}:${params.count}` : key,
    i18n: { language: "en" },
  }),
}));
vi.mock("@/common/hooks/use-date-locale", () => ({
  useFormatRelativeTime: () => () => "3 days ago",
  useDateLocale: () => undefined,
}));

import { WhatsNew } from "../whats-new";

function memoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => void store.set(key, String(value)),
    removeItem: (key) => void store.delete(key),
    clear: () => store.clear(),
    key: (index) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  };
}

const READ_IDS = "beancount.changelog.readIds";
const show = () =>
  screen.getByRole("button", { name: "common.whatsNewExpand" });
const hide = () =>
  screen.getByRole("button", { name: "common.whatsNewCollapse" });

function renderHome() {
  render(
    <>
      <WhatsNew />
      <button>After What's new</button>
    </>,
  );
  return userEvent.setup();
}

describe("What's new disclosure focus", () => {
  // Opening a release must not try to navigate jsdom.
  const stayOnPage = (event: Event) => event.preventDefault();
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    vi.stubGlobal("localStorage", memoryStorage());
    document.addEventListener("click", stayOnPage, true);
  });
  afterEach(() => {
    cleanup();
    document.removeEventListener("click", stayOnPage, true);
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it.each(["{Enter}", " "])(
    "keeps the disclosure focused through expand and collapse with %j",
    async (key) => {
      // Older than a first visit's cutoff: everything has been seen.
      feed.items = [release("a", 40), release("b", 50)];
      const user = renderHome();
      expect(screen.getByTestId("whats-new-collapsed")).toBeInTheDocument();

      show().focus();
      await user.keyboard(key);
      expect(screen.getByTestId("whats-new-expanded")).toBeInTheDocument();
      expect(hide()).toHaveFocus();
      expect(hide()).toHaveAttribute("aria-expanded", "true");

      await user.keyboard(key);
      expect(screen.getByTestId("whats-new-collapsed")).toBeInTheDocument();
      expect(show()).toHaveFocus();
      expect(show()).toHaveAttribute("aria-expanded", "false");

      await user.keyboard(key);
      expect(hide()).toHaveFocus();
    },
  );

  it("hands Mark all as read's focus to the disclosure it collapses to", async () => {
    feed.items = [release("a", 3), release("b", 5)];
    const user = renderHome();
    screen.getByRole("button", { name: "common.whatsNewMarkRead" }).focus();
    await user.keyboard("{Enter}");

    expect(screen.getByTestId("whats-new-collapsed")).toBeInTheDocument();
    expect(show()).toHaveFocus();
  });

  it("hands the last unread release's focus to the disclosure", async () => {
    feed.items = [release("a", 3), release("b", 5)];
    localStorage.setItem(READ_IDS, JSON.stringify(["blog/a"]));
    const user = renderHome();
    await user.click(screen.getByRole("link", { name: /Release b/ }));

    expect(screen.getByTestId("whats-new-collapsed")).toBeInTheDocument();
    expect(show()).toHaveFocus();
  });

  it("keeps an earlier unread release's link focused", async () => {
    feed.items = [release("a", 3), release("b", 5)];
    const user = renderHome();
    const link = screen.getByRole("link", { name: /Release b/ });
    await user.click(link);

    expect(screen.getByTestId("whats-new-expanded")).toBeInTheDocument();
    expect(link).toHaveFocus();
  });

  it("does not take focus when another tab reads everything", () => {
    feed.items = [release("a", 3), release("b", 5)];
    renderHome();
    const after = screen.getByRole("button", { name: "After What's new" });
    after.focus();

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: READ_IDS,
          newValue: JSON.stringify(["blog/a", "blog/b"]),
        }),
      );
    });
    expect(screen.getByTestId("whats-new-collapsed")).toBeInTheDocument();
    expect(after).toHaveFocus();
  });
});
