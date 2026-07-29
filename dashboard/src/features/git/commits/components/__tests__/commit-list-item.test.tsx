import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
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
