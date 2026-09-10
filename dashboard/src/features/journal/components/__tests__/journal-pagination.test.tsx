import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { JournalPagination } from "../journal-pagination";

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => {
      const labels: Record<string, string> = {
        "common.paginationNav": "Pagination",
        "common.goToPreviousPage": "Go to previous page",
        "common.goToNextPage": "Go to next page",
        "common.previous": "Previous",
        "common.nextPage": "Next",
        "common.morePages": "More pages",
      };
      return labels[key] ?? key;
    },
  }),
}));

function Harness({
  total = 120,
  limit = 60,
  initialOffset = 0,
}: {
  total?: number;
  limit?: number;
  initialOffset?: number;
}) {
  const [offset, setOffset] = useState(initialOffset);
  return (
    <div>
      <button type="button">Before</button>
      <JournalPagination
        total={total}
        limit={limit}
        offset={offset}
        setOffset={setOffset}
      />
      <button type="button">After</button>
      <output data-testid="offset">{offset}</output>
    </div>
  );
}

describe("JournalPagination keyboard access", () => {
  it("lets Tab reach page controls and Enter/Space change the page", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(
      screen.getByRole("button", { name: "Go to previous page" }),
    ).toBeDisabled();

    await user.tab();
    expect(screen.getByRole("button", { name: "Before" })).toHaveFocus();

    // Disabled Previous is skipped by Tab (native button behavior).
    await user.tab();
    expect(screen.getByRole("button", { name: "1" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "1" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await user.tab();
    expect(screen.getByRole("button", { name: "2" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByTestId("offset")).toHaveTextContent("60");
    expect(screen.getByRole("button", { name: "2" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await user.tab();
    // Next is now disabled on the last page and skipped.
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
    expect(
      screen.getByRole("button", { name: "Go to next page" }),
    ).toBeDisabled();

    // Space on an enabled page button changes offset once.
    await user.click(screen.getByRole("button", { name: "1" }));
    expect(screen.getByTestId("offset")).toHaveTextContent("0");
    screen.getByRole("button", { name: "2" }).focus();
    await user.keyboard(" ");
    expect(screen.getByTestId("offset")).toHaveTextContent("60");
  });

  it("hides controls when a single page covers every entry", () => {
    render(<Harness total={20} limit={60} />);
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});
