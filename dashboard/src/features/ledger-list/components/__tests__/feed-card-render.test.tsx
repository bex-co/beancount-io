import type { AnchorHTMLAttributes, ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FeedSource, type GetFeedQuery } from "@/graphql/definitions";
import { FeedCard } from "../feed-card";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    to: string;
    params: Record<string, string>;
    children: ReactNode;
  }) => {
    const href = Object.entries(params).reduce(
      (path, [key, value]) => path.replace(`$${key}`, value),
      to,
    );
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));

type FeedItem = GetFeedQuery["getFeed"]["items"][number];

describe("FeedCard", () => {
  it("links every ledger change to its exact saved version", () => {
    const item: FeedItem = {
      __typename: "FeedItem",
      id: "activity-1",
      title: "Committed to my-book",
      summary: "Reconcile checking account",
      link: "/ledger/un_ubrekqsrhlbp/my-book/commit/0df5296bc0b8b18020082d7b98bc3d5ef7008b92",
      publishedAt: "2026-07-27T12:00:00Z",
      author: "testuser",
      authorAvatar: null,
      source: FeedSource.LedgerRss,
    };

    render(<FeedCard {...item} />);

    expect(
      screen.getByRole("link", { name: "commits.changes" }),
    ).toHaveAttribute(
      "href",
      "/ledger/un_ubrekqsrhlbp/my-book/commit/0df5296bc0b8b18020082d7b98bc3d5ef7008b92",
    );
    expect(
      screen.getByRole("link", { name: "commits.versionHistory" }),
    ).toHaveAttribute("href", "/ledger/un_ubrekqsrhlbp/my-book/commits");
  });
});
