import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LedgerAccountsPage from "../index";

const mockNavigate = vi.fn();
let actionSearch: { action?: "open-account" } = {};
let canWrite = true;

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ ledgerOwner: "alice", ledgerName: "books" }),
  useSearch: () => actionSearch,
  useNavigate: () => mockNavigate,
  Link: ({
    children,
    to,
    search,
  }: {
    children: React.ReactNode;
    to: string;
    search?: Record<string, unknown>;
  }) => (
    <a href="#" data-to={to} data-search={JSON.stringify(search)}>
      {children}
    </a>
  ),
}));

vi.mock("@apollo/client/react", () => ({
  useQuery: () => ({
    data: { getLedgerAccountDirectives: [] },
    loading: false,
    error: undefined,
  }),
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({
    ledgerName: "My books",
    ledgerData: {
      options: {
        nameAssets: "Assets",
        nameLiabilities: "Liabilities",
        nameEquity: "Equity",
        nameIncome: "Income",
        nameExpenses: "Expenses",
      },
    },
  }),
}));

vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({ canWrite }),
}));

vi.mock("@/common/hooks/use-apollo-cache", () => ({
  useApolloCacheClear: () => vi.fn(),
}));

vi.mock("../open-account-dialog", () => ({
  OpenAccountDialog: ({
    open,
    onOpenChange,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div data-testid="open-account-dialog" data-open={String(open)}>
      {open && (
        <button onClick={() => onOpenChange(false)}>Close account form</button>
      )}
    </div>
  ),
}));

vi.mock("../delete-account-dialog", () => ({
  DeleteAccountDialog: () => null,
}));

vi.mock("../close-account-dialog", () => ({
  CloseAccountDialog: () => null,
}));

describe("account action URLs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    actionSearch = {};
    canWrite = true;
  });

  it("opens the account form from a direct action URL and exposes the same URL in the page CTA", () => {
    actionSearch = { action: "open-account" };
    render(<LedgerAccountsPage />);

    expect(screen.getByTestId("open-account-dialog")).toHaveAttribute(
      "data-open",
      "true",
    );
    expect(screen.getByRole("link", { name: /Open account/i })).toHaveAttribute(
      "data-search",
      JSON.stringify({ action: "open-account" }),
    );
  });

  it("closes by replacing only the action search value", () => {
    actionSearch = { action: "open-account" };
    render(<LedgerAccountsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Close account form" }));

    const navigation = mockNavigate.mock.calls.at(-1)?.[0];
    expect(navigation).toMatchObject({ to: ".", replace: true });
    expect(
      navigation.search({ action: "open-account", retained: "value" }),
    ).toEqual({ action: undefined, retained: "value" });
  });

  it("never opens or offers the account mutation to a read-only user", () => {
    actionSearch = { action: "open-account" };
    canWrite = false;
    render(<LedgerAccountsPage />);

    expect(screen.getByTestId("open-account-dialog")).toHaveAttribute(
      "data-open",
      "false",
    );
    expect(
      screen.queryByRole("link", { name: /Open account/i }),
    ).not.toBeInTheDocument();
  });
});
