import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as apolloClient from "@apollo/client/react";
import LedgerErrorsPage from "../index";

const fileNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ ledgerOwner: "open_ledger", ledgerName: "example" }),
  Link: ({ children }: { children: React.ReactNode }) => (
    <a href="#">{children}</a>
  ),
}));

vi.mock("@apollo/client/react", () => ({
  useQuery: vi.fn(),
}));

vi.mock("@/common/hooks/use-file-navigate", () => ({
  useFileNavigate: () => fileNavigate,
  getLedgerFilesRootPath: () => "/ledger/open_ledger/example/files",
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerName: "example" }),
}));

vi.mock("@/common/components/seo/ledger-page-seo", () => ({
  LedgerPageSEO: () => null,
}));

const errorRow = {
  __typename: "LedgerError",
  message: "Transaction does not balance",
  filename: "transactions/invoicing.bean",
  lineno: 10,
};

describe("LedgerErrorsPage source navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apolloClient.useQuery).mockReturnValue({
      data: { getLedgerErrors: [errorRow] },
      loading: false,
      error: undefined,
    } as any);
  });

  it("opens the source location from a keyboard-reachable control", async () => {
    const user = userEvent.setup();
    render(<LedgerErrorsPage />);

    // Activation used to live only on the <tr> onClick, which no keyboard user
    // could reach.
    const sourceButton = screen.getByRole("button", {
      name: /transactions\/invoicing\.bean/,
    });

    sourceButton.focus();
    expect(sourceButton).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(fileNavigate).toHaveBeenCalledWith(
      expect.any(String),
      "file",
      "transactions/invoicing.bean",
      { lineNumber: 10, editMode: true },
    );
  });

  it("keeps the row as a plain table row", () => {
    render(<LedgerErrorsPage />);

    const row = screen
      .getByRole("button", { name: /transactions\/invoicing\.bean/ })
      .closest("tr");

    expect(row).not.toHaveAttribute("role");
    expect(row).not.toHaveAttribute("tabindex");
    expect(row?.className).not.toMatch(/cursor-pointer/);
  });

  it("does not offer a control when the error has no source file", () => {
    vi.mocked(apolloClient.useQuery).mockReturnValue({
      data: {
        getLedgerErrors: [{ ...errorRow, filename: null, lineno: null }],
      },
      loading: false,
      error: undefined,
    } as any);

    render(<LedgerErrorsPage />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
