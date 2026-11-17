import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { formatDistanceToNow } from "date-fns";
import { compileAppCss, parseRules } from "@/test/tailwind";
import { CommitListItem } from "../commit-list-item";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    params,
    onClick,
    ...props
  }: React.ComponentProps<"a"> & {
    params: { ledgerOwner: string; ledgerName: string; commitSha: string };
  }) => (
    <a
      {...props}
      href={`/ledger/${params.ledgerOwner}/${params.ledgerName}/commit/${params.commitSha}`}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/common/hooks/use-date-locale", () => ({
  useFormatRelativeTime: () => (date: Date | number) =>
    formatDistanceToNow(date, { addSuffix: true }),
}));

const commit = {
  sha: "1234567890abcdef",
  shortSha: "1234567",
  message: "A very long commit message that should stay on one compact line",
  author: {
    name: "A very long author name",
    email: "author@example.com",
    date: "2026-07-27T12:00:00.000Z",
  },
};

describe("CommitListItem", () => {
  it("is a selected, focusable route link with compact long-content handling", async () => {
    const user = userEvent.setup();
    render(
      <CommitListItem commit={commit} ledgerId="alice/books" isSelected />,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute(
      "href",
      "/ledger/alice/books/commit/1234567890abcdef",
    );
    expect(link).toHaveAttribute("aria-current", "page");
    expect(link).toHaveClass("h-[60px]", "focus-visible:ring-2");
    expect(screen.getByText(commit.message)).toHaveClass("truncate");
    expect(screen.getByText(commit.author.name)).toHaveClass("truncate");

    await user.tab();
    expect(link).toHaveFocus();
  });

  it("truncates an English message and author at their end in a right-to-left page", async () => {
    // In Persian an English message took the page's direction, so its
    // ellipsis landed at the left and cut "Add 2026-10-30 custom budget …"
    // at its start (w2/138). Each git string now takes its own direction,
    // and the message is sized to its text so a short one stays at the
    // row's start edge rather than the far side.
    const root = document.body.appendChild(document.createElement("div"));
    root.setAttribute("dir", "rtl");
    const message = "Add 2026-10-30 custom budget Expenses:Food:Restaurant";
    render(
      <CommitListItem
        commit={{ ...commit, message: `${message}\n\nBody text` }}
        ledgerId="alice/books"
      />,
      { container: root },
    );

    const subject = screen.getByText(message);
    expect(subject).toHaveAttribute("dir", "auto");
    expect(subject).toHaveClass("truncate", "w-fit", "max-w-full");
    expect(screen.getByText(commit.author.name)).toHaveAttribute("dir", "auto");

    const rules = parseRules(await compileAppCss(["w-fit", "max-w-full"]));
    expect(rules.get("w-fit")).toContain("width: fit-content");
    expect(rules.get("max-w-full")).toContain("max-width: 100%");
  });

  it("preserves modified-click behavior while closing responsive history on plain activation", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <CommitListItem
        commit={commit}
        ledgerId="alice/books"
        onSelect={onSelect}
      />,
    );

    const link = screen.getByRole("link");
    fireEvent.click(link, { ctrlKey: true });
    expect(onSelect).not.toHaveBeenCalled();

    await user.click(link);
    expect(onSelect).toHaveBeenCalledWith(commit.sha);
  });
});
