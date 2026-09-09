import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExportJournalButton } from "../export-journal-button";

vi.mock("@apollo/client/react", () => ({
  useLazyQuery: () => [vi.fn()],
}));

describe("ExportJournalButton focus", () => {
  it("returns focus to Export after Escape closes the dialog", async () => {
    const user = userEvent.setup();
    render(<ExportJournalButton ledgerId="owner/ledger" />);

    const exportButton = screen.getByRole("button", { name: /export/i });
    await user.click(exportButton);
    expect(
      screen.getByRole("heading", { name: /export journal/i }),
    ).toBeInTheDocument();

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: /export journal/i }),
      ).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(exportButton).toHaveFocus();
    });
  });
});
