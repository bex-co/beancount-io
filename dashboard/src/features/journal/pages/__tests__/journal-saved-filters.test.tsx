import { render, screen } from "@testing-library/react";
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

const queryVariables = vi.hoisted(() => [] as unknown[]);
vi.mock("@apollo/client/react", () => ({
  useQuery: (_document: unknown, options: { variables: unknown }) => (
    queryVariables.push(options.variables),
    {
      data: { getLedgerJournal: { data: [], total: 0 } },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    }
  ),
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
  useTranslations: () => ({
    i18n: { language: "en" },
    t: (key: string) => key,
  }),
}));

vi.mock("@/common/components/authenticated", () => ({
  Authenticated: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/common/components/page-header", () => ({ PageHeader: () => null }));
vi.mock("@/common/components/related-links", () => ({
  RelatedLinks: () => null,
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

/** Wrong-shaped saved filters fall back instead of crashing (w4/m39). */
describe("malformed saved Journal filters", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", memoryStorage());
    queryVariables.length = 0;
    // The storage hook reports the discarded value; that is expected here.
    vi.spyOn(console, "warn").mockImplementation(() => {});
    actionSearch = {};
    canWrite = true;
    params = { ledgerOwner: "alice", ledgerName: "books" };
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const save = (name: string, value: unknown) =>
    localStorage.setItem(`journal.alice/books.${name}`, JSON.stringify(value));
  const lastQuery = () =>
    (queryVariables.at(-1) as { query: Record<string, unknown> }).query;

  it.each([{}, null, 7, "Transaction", { length: 2 }])(
    "renders with the defaults when every saved list is %j",
    (value) => {
      for (const name of [
        "directiveTypes",
        "transactionSubtypes",
        "documentSubtypes",
        "customSubtypes",
      ]) {
        save(name, value);
      }
      render(<LedgerJournalPage />);

      expect(screen.getByText("Empty")).toBeInTheDocument();
      expect(lastQuery()).toMatchObject({
        directiveTypes: ["Transaction"],
        transactionSubtypes: undefined,
        documentSubtypes: undefined,
        customSubtypes: undefined,
      });
    },
  );

  it("keeps valid saved members and drops invalid ones before the query", () => {
    save("directiveTypes", ["Note", "NotADirective", 3, null, "Open"]);
    save("transactionSubtypes", ["pending", { flag: "*" }, 3, "cleared"]);
    save("customSubtypes", ["budget"]);
    save("showPostings", true);
    render(<LedgerJournalPage />);

    expect(lastQuery()).toMatchObject({
      directiveTypes: ["Note", "Open"],
      transactionSubtypes: ["pending", "cleared"],
      customSubtypes: ["budget"],
      documentSubtypes: undefined,
    });
  });

  // The API accepts only the kinds the filter buttons offer, so a saved
  // `*`, `attached` or empty string failed the read on every reload.
  it.each([
    ["transactionSubtypes", ["*", "!", "Cleared", "cleared"], ["cleared"]],
    ["documentSubtypes", ["attached", "linked"], ["linked"]],
    ["customSubtypes", ["", "budget"], ["budget"]],
    ["transactionSubtypes", ["*"], undefined],
    ["documentSubtypes", ["attached"], undefined],
    ["customSubtypes", [""], undefined],
  ])("sends %s %j to the query as %j", (name, saved, sent) => {
    save(name, saved);
    render(<LedgerJournalPage />);
    expect(screen.getByText("Empty")).toBeInTheDocument();
    expect(lastQuery()[name]).toEqual(sent);
  });

  it("keeps a saved empty directive list", () => {
    save("directiveTypes", []);
    render(<LedgerJournalPage />);
    expect(lastQuery().directiveTypes).toBeUndefined();
  });
});
