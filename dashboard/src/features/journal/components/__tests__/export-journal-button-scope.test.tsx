import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExportJournalButton } from "../export-journal-button";

vi.mock("@apollo/client/react", () => ({
  useLazyQuery: () => [vi.fn()],
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => {
      const messages: Record<string, string> = {
        "journal.export": "Export",
        "journal.exporting": "Exporting",
        "journal.exportJournal": "Export Journal",
        "journal.downloadFilteredEntries":
          "Downloads source transactions and balance assertions narrowed by the selected date, account, and search expression. Entry type and transaction status filters do not apply.",
        "common.cancel": "Cancel",
      };
      return messages[key] ?? key;
    },
  }),
}));

describe("ExportJournalButton scope copy", () => {
  it("describes global filters and excludes type/status toggles before confirm", async () => {
    const user = userEvent.setup();
    render(<ExportJournalButton ledgerId="owner/ledger" />);

    await user.click(screen.getByRole("button", { name: "Export" }));

    expect(
      screen.getByRole("heading", { name: "Export Journal" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Entry type and transaction status filters do not apply/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/selected date, account, and search expression/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Export" }).length,
    ).toBeGreaterThanOrEqual(1);
  });
});
