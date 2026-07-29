import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommitMetadata } from "../commit-metadata";

describe("CommitMetadata", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("shows compact metadata and exposes the exact time", () => {
    const { container } = render(
      <CommitMetadata
        sha="1234567890abcdef"
        message={"Compact title\n\nExtended commit context"}
        author={{
          name: "Ada",
          email: "ada@example.com",
          date: "2026-07-27T12:00:00.000Z",
        }}
        fileCount={2}
        stats={{ additions: 12, deletions: 3, total: 15 }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Compact title" })).toHaveClass(
      "text-xl",
    );
    expect(screen.getByText("Extended commit context")).toBeInTheDocument();
    expect(screen.getByText("2 files")).toBeInTheDocument();
    expect(screen.getAllByText("+12")).toHaveLength(1);
    expect(screen.getAllByText("-3")).toHaveLength(1);

    const time = container.querySelector("time");
    expect(time).toHaveAttribute("dateTime", "2026-07-27T12:00:00.000Z");
    expect(time?.getAttribute("aria-label")).toBeTruthy();
    expect(time).toHaveAttribute("tabIndex", "0");
  });

  it("copies the full SHA and announces success", async () => {
    const user = userEvent.setup();
    const writeText = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue(undefined);
    render(
      <CommitMetadata
        sha="1234567890abcdef"
        message="Compact title"
        author={{
          name: "Ada",
          email: "ada@example.com",
          date: "2026-07-27T12:00:00.000Z",
        }}
        fileCount={1}
        stats={{ additions: 1, deletions: 0, total: 1 }}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Copy 1234567890abcdef" }),
    );

    expect(writeText).toHaveBeenCalledWith("1234567890abcdef");
    expect(
      screen.getByRole("button", { name: "Copied 1234567890abcdef" }),
    ).toBeInTheDocument();
  });
});
