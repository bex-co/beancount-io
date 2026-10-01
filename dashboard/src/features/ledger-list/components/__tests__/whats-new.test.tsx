import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FeedSource, type GetChangelogQuery } from "@/graphql/definitions";
import type { ChangelogWatermark } from "@/common/hooks/use-changelog-watermark";

const watermark = vi.fn<() => ChangelogWatermark>();
const track = vi.fn();

vi.mock("@/common/hooks/use-changelog-watermark", () => ({
  useChangelogWatermark: () => watermark(),
}));
vi.mock("@/common/analytics/events", () => ({
  track: (...args: unknown[]) => track(...args),
}));
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params?.count !== undefined ? `${key}:${params.count}` : key,
  }),
}));
vi.mock("@/common/hooks/use-date-locale", () => ({
  useFormatRelativeTime: () => () => "2 weeks ago",
  useDateLocale: () => undefined,
}));

import { WhatsNew } from "../whats-new";

type Release = GetChangelogQuery["getFeed"]["items"][number];

function release(id: string, publishedAt: string, title: string): Release {
  return {
    __typename: "FeedItem",
    id,
    title,
    summary: `Summary of ${title}`,
    link: `https://beancount.io/blog/${id}`,
    publishedAt,
    source: FeedSource.Changelog,
  };
}

const releases = [
  release("a", "2026-08-28T00:00:00.000Z", "Declare cash-flow roles"),
  release("b", "2026-08-14T00:00:00.000Z", "Summer release"),
  release("c", "2026-06-30T00:00:00.000Z", "Ask AI writes entries"),
  release("d", "2026-05-01T00:00:00.000Z", "MCP launch"),
];

function arrange(overrides: Partial<ChangelogWatermark> = {}) {
  const value: ChangelogWatermark = {
    items: releases,
    loading: false,
    failed: false,
    unreadCount: 2,
    isUnread: (item) => item.id === "a" || item.id === "b",
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    allReleasesUrl: "https://beancount.io/changelog",
    ...overrides,
  };
  watermark.mockReturnValue(value);
  return value;
}

describe("WhatsNew", () => {
  beforeEach(() => {
    track.mockReset();
  });

  it("expands with an accent edge, a count line, and one flagged row per counted release", async () => {
    const user = userEvent.setup();
    const value = arrange();
    render(<WhatsNew />);

    screen.getByTestId("whats-new-expanded");
    expect(
      screen.getByRole("heading", { name: /common\.whatsNew/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("common.whatsNewUnread:2")).toBeInTheDocument();
    // Every counted release is rendered. Capping the rows below the count
    // left "N updates" on screen with no unread row left to open.
    expect(screen.getAllByTestId("release-row")).toHaveLength(releases.length);
    expect(screen.getByText("MCP launch")).toBeInTheDocument();
    const flags = screen.getAllByTestId("release-flag");
    expect(flags.map((flag) => flag.textContent)).toEqual(["!", "!", "*", "*"]);
    // The leading rule marks which rows are new without reading a title.
    const rows = screen.getAllByTestId("release-row");
    expect(
      rows.map((row) => row.className.includes("border-s-primary")),
    ).toEqual([true, true, false, false]);
    // Rows arrive one after another rather than all at once.
    expect(rows.map((row) => row.style.animationDelay)).toEqual([
      "0ms",
      "70ms",
      "140ms",
      "210ms",
    ]);

    await user.click(
      screen.getByRole("button", { name: "common.whatsNewMarkRead" }),
    );
    expect(value.markAllRead).toHaveBeenCalledTimes(1);
  });

  it("records an opened release and clears its flag", async () => {
    const user = userEvent.setup();
    const value = arrange();
    render(<WhatsNew />);

    await user.click(screen.getAllByTestId("release-row")[0]);
    expect(value.markRead).toHaveBeenCalledWith(releases[0]);
    expect(track).toHaveBeenCalledWith("changelog_release_opened", {
      surface: "dashboard",
    });
  });

  it("collapses to one line with the latest release once everything is read, and expands on request", async () => {
    const user = userEvent.setup();
    arrange({ unreadCount: 0, isUnread: () => false });
    render(<WhatsNew />);

    const line = screen.getByTestId("whats-new-collapsed");
    expect(line).toHaveTextContent("Declare cash-flow roles");
    expect(line).toHaveTextContent("2026-08-28");
    expect(screen.queryByTestId("release-row")).toBeNull();
    expect(
      screen.queryByRole("link", { name: "common.whatsNewChangelog" }),
    ).toBeNull();

    await user.click(
      screen.getByRole("button", { name: "common.whatsNewExpand" }),
    );
    expect(screen.getAllByTestId("release-row")).toHaveLength(releases.length);
    expect(screen.queryByText(/common\.whatsNewUnread:/)).toBeNull();
    expect(screen.getByText("common.whatsNewUpToDate")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "common.whatsNewChangelog" }),
    ).toHaveAttribute("href", "https://beancount.io/changelog");

    await user.click(
      screen.getByRole("button", { name: "common.whatsNewCollapse" }),
    );
    expect(screen.getByTestId("whats-new-collapsed")).toBeInTheDocument();
  });

  it("renders nothing when the changelog failed or is empty", () => {
    arrange({ failed: true, items: [], unreadCount: 0 });
    const { container, unmount } = render(<WhatsNew />);
    expect(container).toBeEmptyDOMElement();
    unmount();

    arrange({ items: [], unreadCount: 0 });
    const { container: emptyContainer } = render(<WhatsNew />);
    expect(emptyContainer).toBeEmptyDOMElement();
  });

  it("shows a quiet placeholder while loading", () => {
    arrange({ loading: true, items: [], unreadCount: 0 });
    render(<WhatsNew />);
    expect(screen.getByTestId("whats-new-loading")).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });
});
