import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
let params = { ledgerOwner: "alice", ledgerName: "books" };

vi.mock("@tanstack/react-router", () => ({
  useParams: () => params,
  useSearch: () => actionSearch,
  useNavigate: () => mockNavigate,
  ClientOnly: ({ children }: { children: React.ReactNode }) => children,
  Link: ({
    children,
    to,
    "aria-label": ariaLabel,
  }: {
    children: React.ReactNode;
    to: string;
    "aria-label"?: string;
  }) => {
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

vi.mock("@/features/journal/components/journal-filters", () => ({
  JournalFilters: ({
    selectedTransactionSubtypes,
    onTransactionSubtypesChange,
    showPostings,
    onShowPostingsChange,
  }: {
    selectedTransactionSubtypes: string[];
    onTransactionSubtypesChange: (value: string[]) => void;
    showPostings: boolean;
    onShowPostingsChange: (value: boolean) => void;
  }) => (
    <div>
      <output data-testid="subtypes">
        {selectedTransactionSubtypes.join(",")}
      </output>
      <output data-testid="postings">{String(showPostings)}</output>
      <button onClick={() => onTransactionSubtypesChange(["!"])}>
        Pending
      </button>
      <button onClick={() => onShowPostingsChange(true)}>Postings</button>
    </div>
  ),
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

/** A working Storage: the shared test setup stubs every method out. */
function memoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => void store.set(key, String(value)),
    removeItem: (key) => void store.delete(key),
    clear: () => store.clear(),
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
}

describe("journal filter persistence", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", memoryStorage());
    actionSearch = {};
    canWrite = true;
    params = { ledgerOwner: "alice", ledgerName: "books" };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps each ledger's journal filters to that ledger", () => {
    const { rerender } = render(<LedgerJournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "Pending" }));
    fireEvent.click(screen.getByRole("button", { name: "Postings" }));
    expect(screen.getByTestId("subtypes")).toHaveTextContent("!");

    // Same mounted page, different ledger — as a client-side ledger switch.
    params = { ledgerOwner: "bob", ledgerName: "shop" };
    rerender(<LedgerJournalPage />);
    expect(screen.getByTestId("subtypes")).toHaveTextContent("");
    expect(screen.getByTestId("postings")).toHaveTextContent("false");

    params = { ledgerOwner: "alice", ledgerName: "books" };
    rerender(<LedgerJournalPage />);
    expect(screen.getByTestId("subtypes")).toHaveTextContent("!");
    expect(screen.getByTestId("postings")).toHaveTextContent("true");
  });

  it("restores the current ledger's filters after a reload", () => {
    const { unmount } = render(<LedgerJournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "Pending" }));
    unmount();

    render(<LedgerJournalPage />);
    expect(screen.getByTestId("subtypes")).toHaveTextContent("!");
  });
});
