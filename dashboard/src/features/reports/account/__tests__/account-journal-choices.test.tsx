import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AccountPage from "../index";

const { chartProps, reportState, filterProps, journalReads } = vi.hoisted(
  () => ({
    chartProps: vi.fn(),
    reportState: { current: {} as Record<string, unknown> },
    filterProps: vi.fn(),
    journalReads: [] as Array<Record<string, unknown>>,
  }),
);

// The page runs two reads. Only the report's state is under test; the journal
// below owns its own, and must stay mounted while the chart is pending.
vi.mock("@apollo/client/react", () => ({
  useQuery: (
    document: { __reportQuery?: boolean },
    options?: { variables?: { query?: Record<string, unknown> } },
  ) => {
    if (document?.__reportQuery) {
      return {
        data: undefined,
        previousData: undefined,
        loading: false,
        error: undefined,
        ...reportState.current,
      };
    }
    journalReads.push(options?.variables?.query ?? {});
    return {
      data: {
        getLedgerAccountJournal: {
          items: [{ entry: { id: "e1" }, change: {}, balance: {} }],
          total: 1,
        },
      },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    };
  },
}));

vi.mock("@/graphql/definitions", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, GetLedgerAccountReportDocument: { __reportQuery: true } };
});

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({
    ledgerOwner: "demo",
    ledgerName: "books",
    accountName: "Assets:US:BofA:Checking",
  }),
  useSearch: () => ({}),
  useNavigate: () => vi.fn(),
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({
    ledgerName: "Demo Books",
    primaryCurrency: "USD",
    ledgerData: { options: { title: "" }, favaOptions: {} },
  }),
}));

vi.mock("@/common/hooks/use-ledger-search-params", () => ({
  useLedgerSearchParams: () => ({
    searchParams: { account: "", filter: "", time: "" },
  }),
}));

vi.mock("@/features/reports/balance-sheet/line-chart", () => ({
  LineChart: (props: Record<string, unknown>) => {
    chartProps(props);
    return <div data-testid="line-chart" />;
  },
}));

vi.mock("@/features/reports/income-statement/date-balance-chart", () => ({
  DateBalanceChart: (props: Record<string, unknown>) => {
    chartProps(props);
    return <div data-testid="date-balance-chart" />;
  },
}));

// The journal owns a separate read; this suite is about the chart boundary.
vi.mock("@/features/journal/components/journal-table", () => ({
  JournalTable: () => <div data-testid="journal-table" />,
}));
vi.mock("@/features/journal/components/journal-filters", () => ({
  JournalFilters: (props: Record<string, unknown>) => {
    filterProps(props);
    return <div data-testid="journal-filters" />;
  },
}));
vi.mock("@/features/journal/components/journal-pagination", () => ({
  JournalPagination: () => <div data-testid="journal-pagination" />,
}));
vi.mock("@/features/journal/components/entry-context-dialog", () => ({
  EntryContextDialog: () => null,
}));

vi.mock("@/common/components/related-links", () => ({
  RelatedLinks: () => null,
}));

const atCost = {
  getLedgerAccountReport: {
    accountBalanceData: [{ date: "2016-01-31", balance: { USD: "-7494" } }],
    intervalTotalsData: [{ date: "2016-01-31", balance: { USD: "-7494" } }],
  },
  getLedgerAccountJournal: { items: [], total: 0 },
};

/** A Map-backed localStorage: the test setup's stub stores nothing. */
const stored = new Map<string, string>();
beforeEach(() => {
  stored.clear();
  journalReads.length = 0;
  filterProps.mockClear();
  vi.mocked(localStorage.getItem).mockImplementation(
    (key) => stored.get(key) ?? null,
  );
  vi.mocked(localStorage.setItem).mockImplementation((key, value) => {
    stored.set(key, String(value));
  });
  reportState.current = { data: atCost };
});

const filters = () =>
  filterProps.mock.calls.at(-1)![0] as {
    selectedDirectiveTypes: string[];
    selectedTransactionSubtypes: string[];
    selectedDocumentSubtypes: string[];
    selectedCustomSubtypes: string[];
    showMetadata: boolean;
    showPostings: boolean;
    onDirectiveTypesChange: (types: string[]) => void;
    onTransactionSubtypesChange: (subtypes: string[]) => void;
    onDocumentSubtypesChange: (subtypes: string[]) => void;
    onCustomSubtypesChange: (subtypes: string[]) => void;
    onShowMetadataChange: (show: boolean) => void;
    onShowPostingsChange: (show: boolean) => void;
  };

/**
 * A shared Time edit replaces the ledger layout's Outlet, unmounting this
 * page; the journal's choices come back with it (w4/1000).
 */
describe("Account Journal choices across a scope remount", () => {
  it("keeps the entry types, subtypes and display toggles", () => {
    const first = render(<AccountPage />);
    expect(filters()).toMatchObject({
      selectedDirectiveTypes: ["Transaction"],
      showMetadata: true,
      showPostings: false,
    });

    act(() => {
      filters().onDirectiveTypesChange(["Balance"]);
      filters().onTransactionSubtypesChange(["pending"]);
      filters().onDocumentSubtypesChange(["linked"]);
      filters().onCustomSubtypesChange(["budget"]);
      filters().onShowMetadataChange(false);
      filters().onShowPostingsChange(true);
    });
    expect(journalReads.at(-1)).toMatchObject({ directiveTypes: ["Balance"] });

    first.unmount();
    journalReads.length = 0;
    render(<AccountPage />);

    expect(filters()).toMatchObject({
      selectedDirectiveTypes: ["Balance"],
      selectedTransactionSubtypes: ["pending"],
      selectedDocumentSubtypes: ["linked"],
      selectedCustomSubtypes: ["budget"],
      showMetadata: false,
      showPostings: true,
    });
    // The first read after the remount asks for the chosen entries.
    expect(journalReads[0]).toMatchObject({
      directiveTypes: ["Balance"],
      transactionSubtypes: ["pending"],
      documentSubtypes: ["linked"],
      customSubtypes: ["budget"],
    });
  });

  it("starts from the defaults for a fresh account", () => {
    render(<AccountPage />);
    expect(filters()).toMatchObject({
      selectedDirectiveTypes: ["Transaction"],
      selectedTransactionSubtypes: [],
      showMetadata: true,
      showPostings: false,
    });
  });
});
