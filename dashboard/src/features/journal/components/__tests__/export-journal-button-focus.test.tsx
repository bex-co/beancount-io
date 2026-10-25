import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExportJournalButton } from "../export-journal-button";

const lazy = vi.hoisted(() => ({ fn: vi.fn() }));

vi.mock("@apollo/client/react", () => ({
  useLazyQuery: () => [lazy.fn],
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

  it("returns focus to Export after a failed read, for one Enter retry (w4/1082)", async () => {
    const user = userEvent.setup();
    let rejectRead: (error: Error) => void = () => {};
    lazy.fn.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectRead = reject;
        }),
    );
    render(<ExportJournalButton ledgerId="owner/ledger" />);
    await user.click(screen.getByRole("button", { name: /export/i }));
    const dialog = screen.getByRole("dialog");
    const confirm = Array.from(dialog.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Export",
    ) as HTMLElement;
    confirm.focus();
    fireEvent.click(confirm);
    await waitFor(() => expect(lazy.fn).toHaveBeenCalledTimes(1));
    // A browser drops a disabled control's focus to the dialog; jsdom
    // does not, so move it the way the browser leaves it.
    dialog.focus();
    rejectRead(new Error("offline"));
    await waitFor(() => expect(confirm).toBeEnabled());
    await waitFor(() => expect(confirm).toHaveFocus());

    // Enter retries exactly once more.
    lazy.fn.mockClear();
    lazy.fn.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectRead = reject;
        }),
    );
    await user.keyboard("{Enter}");
    await waitFor(() => expect(lazy.fn).toHaveBeenCalledTimes(1));
    dialog.focus();
    rejectRead(new Error("offline again"));
    await waitFor(() => expect(confirm).toHaveFocus());
  });
});
