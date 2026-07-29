import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EmptyLedgerSetup } from "../empty-ledger-setup";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
    search,
    className,
  }: {
    children: React.ReactNode;
    to: string;
    params: Record<string, string>;
    search?: Record<string, unknown>;
    className?: string;
  }) => (
    <a
      href="#"
      data-to={to}
      data-params={JSON.stringify(params)}
      data-search={search ? JSON.stringify(search) : undefined}
      className={className}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) =>
      ({
        "page.overview.emptyLedgerTitle": "Set up your ledger",
        "page.overview.emptyLedgerDescription": "Start with these steps.",
        "page.overview.emptyLedgerReadOnlyTitle": "This ledger is empty",
        "page.overview.emptyLedgerReadOnlyDescription":
          "You can explore its files and reports.",
        "page.overview.emptyLedgerOpenAccountStep": "Open an account",
        "page.overview.emptyLedgerOpenAccountDescription":
          "Create the account first.",
        "page.overview.emptyLedgerOpenAccountAction": "Open account",
        "page.overview.emptyLedgerAddEntryStep": "Add your first entry",
        "page.overview.emptyLedgerAddEntryDescription":
          "Record a transaction or edit the file.",
        "page.overview.emptyLedgerAddEntryAction": "Add first entry",
        "page.overview.emptyLedgerEditFileAction": "Edit ledger file",
        "page.accounts.accounts": "Accounts",
        "journal.journal": "Journal",
        "ledgerEditor.files": "Files",
      })[key] ?? key,
  }),
}));

const commonProps = {
  ledgerOwner: "alice",
  ledgerName: "books",
  entryFile: "transactions/2026.bean",
};

describe("EmptyLedgerSetup", () => {
  it("renders ordered writer setup with canonical, refreshable action links", () => {
    render(<EmptyLedgerSetup {...commonProps} canWrite />);

    expect(
      screen.getByRole("heading", { name: "Set up your ledger" }),
    ).toBeInTheDocument();
    const steps = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(steps).toHaveLength(2);
    expect(steps[0]).not.toHaveClass("border");
    expect(steps[1]).not.toHaveClass("border");
    expect(within(steps[0]).getByText("Open an account")).toBeInTheDocument();
    expect(
      within(steps[1]).getByText("Add your first entry"),
    ).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Open account" })).toHaveAttribute(
      "data-to",
      "/ledger/$ledgerOwner/$ledgerName/accounts",
    );
    expect(screen.getByRole("link", { name: "Open account" })).toHaveClass(
      "underline",
    );
    expect(screen.getByRole("link", { name: "Open account" })).toHaveAttribute(
      "data-search",
      JSON.stringify({ action: "open-account" }),
    );
    expect(
      screen.getByRole("link", { name: "Add first entry" }),
    ).toHaveAttribute(
      "data-search",
      JSON.stringify({ action: "new-entry", directive: "transaction" }),
    );

    const editLink = screen.getByRole("link", { name: "Edit ledger file" });
    expect(editLink).toHaveAttribute(
      "data-to",
      "/ledger/$ledgerOwner/$ledgerName/files/blob/$branch/$",
    );
    expect(editLink).toHaveAttribute(
      "data-params",
      JSON.stringify({
        ledgerOwner: "alice",
        ledgerName: "books",
        branch: "main",
        _splat: "transactions/2026.bean",
      }),
    );
    expect(editLink).toHaveAttribute(
      "data-search",
      JSON.stringify({ editMode: true }),
    );
  });

  it("gives read-only users view links without mutation actions", () => {
    render(<EmptyLedgerSetup {...commonProps} canWrite={false} />);

    expect(
      screen.getByRole("heading", { name: "This ledger is empty" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Open account" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Add first entry" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Edit ledger file" }),
    ).not.toBeInTheDocument();

    const viewLinks = screen.getAllByRole("link");
    expect(viewLinks).toHaveLength(3);
    for (const link of viewLinks) {
      expect(link).not.toHaveAttribute("data-search");
      expect(link).toHaveClass("underline");
    }
    expect(screen.getByRole("link", { name: "Files" })).toHaveAttribute(
      "data-params",
      expect.stringContaining("transactions/2026.bean"),
    );
  });
});
