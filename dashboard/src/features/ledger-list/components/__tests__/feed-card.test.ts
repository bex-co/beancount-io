import { describe, expect, it } from "vitest";
import { FeedSource, type GetFeedQuery } from "@/graphql/definitions";
import { getLedgerDestination } from "../../lib/feed-destination";

type FeedItem = GetFeedQuery["getFeed"]["items"][number];

function createFeedItem(overrides: Partial<FeedItem> = {}): FeedItem {
  return {
    __typename: "FeedItem",
    id: "activity-1",
    title: "Committed to my-book",
    summary: "Reconcile checking account",
    link: "/ledger/un_ubrekqsrhlbp/my-book",
    publishedAt: "2026-07-27T12:00:00Z",
    author: "testuser",
    authorAvatar: null,
    source: FeedSource.LedgerRss,
    ...overrides,
  };
}

describe("getLedgerDestination", () => {
  it("extracts an exact commit destination from the dashboard link", () => {
    const destination = getLedgerDestination(
      createFeedItem({
        link: "/ledger/un_ubrekqsrhlbp/my-book/commit/0df5296bc0b8b18020082d7b98bc3d5ef7008b92",
      }),
    );

    expect(destination).toEqual({
      owner: "un_ubrekqsrhlbp",
      name: "my-book",
      commitSha: "0df5296bc0b8b18020082d7b98bc3d5ef7008b92",
    });
  });

  it("extracts a ledger destination without a commit", () => {
    const destination = getLedgerDestination(createFeedItem());

    expect(destination).toEqual({
      owner: "un_ubrekqsrhlbp",
      name: "my-book",
      commitSha: undefined,
    });
  });

  it("returns null for non-ledger destinations", () => {
    expect(
      getLedgerDestination(
        createFeedItem({
          link: "https://beancount.io/blog",
        }),
      ),
    ).toBeNull();
  });
});
