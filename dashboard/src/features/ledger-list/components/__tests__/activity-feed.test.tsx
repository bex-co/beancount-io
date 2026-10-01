import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FeedSource, GetFeedDocument } from "@/graphql/definitions";

const useQueryMock = vi.fn();

vi.mock("@apollo/client/react", () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => key,
    i18n: { language: "de" },
  }),
}));
vi.mock("../feed-card", () => ({
  FeedCard: ({ title }: { title: string }) => <article>{title}</article>,
}));

import { ActivityFeed } from "../activity-feed";

describe("ActivityFeed", () => {
  it("requests only ledger activity in the UI language", () => {
    useQueryMock.mockReturnValue({
      data: {
        getFeed: {
          items: [
            {
              __typename: "FeedItem",
              id: "activity-1",
              title: "Committed to my-book",
              summary: null,
              link: "/ledger/alice/my-book",
              publishedAt: "2026-09-01T00:00:00.000Z",
              author: "alice",
              authorAvatar: null,
              source: FeedSource.LedgerRss,
            },
          ],
          total: 1,
          hasMore: false,
        },
      },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
      fetchMore: vi.fn(),
    });
    render(<ActivityFeed />);

    expect(useQueryMock).toHaveBeenCalledWith(GetFeedDocument, {
      variables: { offset: 0, limit: 10, source: "LEDGER_RSS", locale: "de" },
      // Revalidated on return, or the list can predate the user's own commit.
      fetchPolicy: "cache-and-network",
    });
    expect(
      screen.getByRole("heading", { name: "page.dashboard.activity" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Committed to my-book")).toBeInTheDocument();
  });

  it("invites the user to commit when there is no activity yet", () => {
    useQueryMock.mockReturnValue({
      data: { getFeed: { items: [], total: 0, hasMore: false } },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
      fetchMore: vi.fn(),
    });
    render(<ActivityFeed />);

    expect(
      screen.getByText("page.dashboard.activityEmpty"),
    ).toBeInTheDocument();
  });
});
