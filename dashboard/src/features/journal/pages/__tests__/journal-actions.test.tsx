import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LedgerJournalPage from "../journal-page";

const mockNavigate = vi.fn();
let actionSearch: {
  action?: "new-entry";
  directive?: "transaction" | "balance" | "note" | "account";
  account?: string;
  filter?: string;
  time?: string;
} = {};
let canWrite = true;
let capturedLinkSearch: unknown;

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ ledgerOwner: "alice", ledgerName: "books" }),
  useSearch: () => actionSearch,
  useNavigate: () => mockNavigate,
  ClientOnly: ({ children }: { children: React.ReactNode }) => children,
  Link: ({
    children,
    to,
    search,
    "aria-label": ariaLabel,
  }: {
    children: React.ReactNode;
    to: string;
    search?: unknown;
    "aria-label"?: string;
  }) => {
    capturedLinkSearch = search;
    return (
      <a href="#" data-to={to} aria-label={ariaLabel}>
        {children}
      </a>
    );
  },
}));

vi.mock("@apollo/client/react", () => ({
  useQuery: () => ({
    data: { getLedgerJournal: { data: [], total: 0 } },
    loading: false,
    error: undefined,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({ canWrite }),
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerName: "My books" }),
}));

vi.mock("@/common/hooks/use-ledger-search-params", () => ({
  useLedgerSearchParams: () => ({
    searchParams: { account: "Assets:Cash", filter: "coffee", time: "year" },
  }),
}));

vi.mock("@/common/hooks/use-local-storage-state", () => ({
  useLocalStorageState: (_key: string, initial: unknown) => [initial, vi.fn()],
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));

vi.mock("@/common/components/authenticated", () => ({
  Authenticated: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/common/components/page-header", () => ({ PageHeader: () => null }));
vi.mock("@/common/components/related-links", () => ({
  RelatedLinks: () => null,
}));
vi.mock("@/common/components/seo/ledger-page-seo", () => ({
  LedgerPageSEO: () => null,
}));
vi.mock("@/features/journal/components/journal-filters", () => ({
  JournalFilters: () => null,
}));
vi.mock("@/features/journal/components/journal-table", () => ({
  JournalTable: () => null,
}));
vi.mock("@/features/journal/components/journal-pagination", () => ({
  JournalPagination: () => null,
}));
vi.mock("@/features/journal/components/export-journal-button", () => ({
  ExportJournalButton: () => null,
}));
vi.mock("@/features/journal/components/entry-context-dialog", () => ({
  EntryContextDialog: () => null,
}));
vi.mock("@/features/journal/components/journal-states", () => ({
  JournalLoadingState: () => <div>Loading</div>,
  JournalErrorState: () => <div>Error</div>,
  JournalEmptyState: () => <div>Empty</div>,
}));

vi.mock("@/features/journal/components/new-directive-dialog", () => ({
  NewDirectiveDialog: ({
    open,
    activeTab,
    onOpenChange,
    onActiveTabChange,
  }: {
    open: boolean;
    activeTab: string;
    onOpenChange: (open: boolean) => void;
    onActiveTabChange: (directive: "note") => void;
  }) => (
    <div
      data-testid="new-directive-dialog"
      data-open={String(open)}
      data-tab={activeTab}
    >
      {open && (
        <>
          <button onClick={() => onOpenChange(false)}>Close entry form</button>
          <button onClick={() => onActiveTabChange("note")}>Choose note</button>
        </>
      )}
    </div>
  ),
}));

describe("journal action URLs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    actionSearch = {};
    canWrite = true;
    capturedLinkSearch = undefined;
  });

  it.each(["transaction", "balance", "note", "account"] as const)(
    "opens the %s form from a direct action URL",
    (directive) => {
      actionSearch = { action: "new-entry", directive };
      render(<LedgerJournalPage />);

      expect(screen.getByTestId("new-directive-dialog")).toHaveAttribute(
        "data-open",
        "true",
      );
      expect(screen.getByTestId("new-directive-dialog")).toHaveAttribute(
        "data-tab",
        directive,
      );
    },
  );

  it("writes tab changes to the URL while preserving filters", () => {
    actionSearch = { action: "new-entry", directive: "balance" };
    render(<LedgerJournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "Choose note" }));

    const navigation = mockNavigate.mock.calls.at(-1)?.[0];
    expect(navigation).toMatchObject({ to: ".", replace: true });
    expect(
      navigation.search({
        account: "Assets:Cash",
        filter: "coffee",
        time: "year",
        action: "new-entry",
        directive: "balance",
      }),
    ).toEqual({
      account: "Assets:Cash",
      filter: "coffee",
      time: "year",
      action: "new-entry",
      directive: "note",
    });
  });

  it("closes by clearing action state without losing filters", () => {
    actionSearch = { action: "new-entry", directive: "transaction" };
    render(<LedgerJournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "Close entry form" }));

    const navigation = mockNavigate.mock.calls.at(-1)?.[0];
    expect(
      navigation.search({
        account: "Assets:Cash",
        filter: "coffee",
        time: "year",
        action: "new-entry",
        directive: "transaction",
      }),
    ).toEqual({
      account: "Assets:Cash",
      filter: "coffee",
      time: "year",
      action: undefined,
      directive: undefined,
    });
  });

  it("uses the canonical action URL for the toolbar CTA", () => {
    render(<LedgerJournalPage />);

    expect(
      screen.getByRole("link", { name: "journal.addNewJournalEntry" }),
    ).toHaveAttribute("data-to", "/ledger/$ledgerOwner/$ledgerName/journal");
    expect(typeof capturedLinkSearch).toBe("function");
    expect(
      (
        capturedLinkSearch as (
          value: Record<string, string>,
        ) => Record<string, string>
      )({
        account: "Assets:Cash",
      }),
    ).toEqual({
      account: "Assets:Cash",
      action: "new-entry",
      directive: "transaction",
    });
  });

  it("does not open or offer the mutation to a read-only user", () => {
    actionSearch = { action: "new-entry", directive: "transaction" };
    canWrite = false;
    render(<LedgerJournalPage />);

    expect(screen.getByTestId("new-directive-dialog")).toHaveAttribute(
      "data-open",
      "false",
    );
    expect(
      screen.queryByRole("link", { name: "journal.addNewJournalEntry" }),
    ).not.toBeInTheDocument();
  });
});
