import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FeedSource, type GetChangelogQuery } from "@/graphql/definitions";
import { WhatsNewList } from "../whats-new-list";

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));

vi.mock("@/common/hooks/use-date-locale", () => ({
  useFormatRelativeTime: () => () => "2 weeks ago",
  useDateLocale: () => undefined,
}));

type Release = GetChangelogQuery["getFeed"]["items"][number];

/** The event a non-primary mouse button actually produces. */
const auxClick = (button: number) =>
  new MouseEvent("auxclick", { bubbles: true, cancelable: true, button });

const releases: Release[] = [
  {
    __typename: "FeedItem",
    id: "changelog:a",
    title: "Declare cash-flow roles in your ledger",
    summary: "One key, four values.",
    link: "https://beancount.io/zh/blog/2026/08/28/declare",
    publishedAt: "2026-08-28T00:00:00.000Z",
    source: FeedSource.Changelog,
  },
  {
    __typename: "FeedItem",
    id: "changelog:b",
    title: "Beancount.io 3.6 Summer Release",
    summary: "Smarter imports.",
    link: "https://beancount.io/zh/blog/2026/08/14/3-6",
    publishedAt: "2026-08-14T00:00:00.000Z",
    source: FeedSource.Changelog,
  },
];

describe("WhatsNewList", () => {
  it("renders ledger-style rows with ISO dates, flags, and accessible labels", () => {
    render(
      <WhatsNewList
        items={releases}
        isUnread={(item) => item.id === "changelog:a"}
        onOpen={() => undefined}
      />,
    );

    const rows = screen.getAllByTestId("release-row");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveAttribute("href", releases[0].link);
    expect(rows[0]).toHaveAttribute("target", "_blank");
    expect(rows[0]).toHaveAttribute("rel", "noopener noreferrer");

    const dates = document.querySelectorAll("time");
    expect(dates[0]).toHaveTextContent("2026-08-28");
    expect(dates[0]).toHaveAttribute("dir", "ltr");
    expect(dates[0]).toHaveAttribute("title", "2 weeks ago");

    const flags = screen.getAllByTestId("release-flag");
    expect(flags[0]).toHaveTextContent("!");
    expect(flags[0]).toHaveAttribute("aria-hidden", "true");
    expect(flags[1]).toHaveTextContent("*");
    expect(rows[0]).toHaveTextContent("common.whatsNewUnreadFlag");
    expect(rows[1]).toHaveTextContent("common.whatsNewReadFlag");
    expect(rows[0]).toHaveTextContent("One key, four values.");
    // The summary is clamped, not merely styled: `block` would silently win
    // over `line-clamp-2` and let a long summary run to four lines.
    const summary = screen.getByText("One key, four values.");
    expect(summary.className).toContain("line-clamp-2");
    expect(summary.className).not.toContain("block");
  });

  it("reports a release opened into a background tab by middle-click", () => {
    const onOpen = vi.fn();
    render(
      <WhatsNewList items={releases} isUnread={() => true} onOpen={onOpen} />,
    );
    const row = screen.getAllByTestId("release-row")[0];

    // Middle-click emits auxclick, never click, so onClick alone left the
    // release flagged after the user had read it in a background tab.
    fireEvent(row, auxClick(1));
    expect(onOpen).toHaveBeenCalledWith(releases[0]);

    // Any other auxiliary button is not an open.
    onOpen.mockClear();
    fireEvent(row, auxClick(2));
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("reports which release was opened", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(
      <WhatsNewList items={releases} isUnread={() => false} onOpen={onOpen} />,
    );

    await user.click(screen.getAllByTestId("release-row")[1]);
    expect(onOpen).toHaveBeenCalledWith(releases[1]);
  });
});
