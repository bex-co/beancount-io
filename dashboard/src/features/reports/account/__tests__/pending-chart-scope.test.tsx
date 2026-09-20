import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AccountPage from "../index";

/**
 * A retained report belongs to the conversion and interval that were selected
 * when it arrived. While a new read is in flight the chart must withhold it
 * rather than paint the old figures under the new basis — but only the chart:
 * the selectors and the journal below keep their own state.
 */

const { chartProps, reportState } = vi.hoisted(() => ({
  chartProps: vi.fn(),
  reportState: { current: {} as Record<string, unknown> },
}));

// The page runs two reads. Only the report's state is under test; the journal
// below owns its own, and must stay mounted while the chart is pending.
vi.mock("@apollo/client/react", () => ({
  useQuery: (document: { __reportQuery?: boolean }) => {
    if (document?.__reportQuery) {
      return {
        data: undefined,
        previousData: undefined,
        loading: false,
        error: undefined,
        ...reportState.current,
      };
    }
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
  JournalFilters: () => <div data-testid="journal-filters" />,
}));
vi.mock("@/features/journal/components/journal-pagination", () => ({
  JournalPagination: () => <div data-testid="journal-pagination" />,
}));
vi.mock("@/features/journal/components/entry-context-dialog", () => ({
  EntryContextDialog: () => null,
}));
vi.mock("@/common/components/seo/ledger-page-seo", () => ({
  LedgerPageSEO: () => null,
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

const units = {
  getLedgerAccountReport: {
    accountBalanceData: [{ date: "2016-01-31", balance: { SOL: "-60" } }],
    intervalTotalsData: [{ date: "2016-01-31", balance: { SOL: "-60" } }],
  },
  getLedgerAccountJournal: { items: [], total: 0 },
};

function mockQuery(override: Record<string, unknown>) {
  reportState.current = override;
}

describe("AccountPage chart pending scope", () => {
  it("withholds a retained report while the newly selected read is in flight", () => {
    mockQuery({ data: atCost });
    const { rerender } = render(<AccountPage />);
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    expect(chartProps.mock.calls.at(-1)![0].data).toEqual(
      atCost.getLedgerAccountReport.accountBalanceData,
    );

    // The new basis is selected; Apollo hands back the old result as
    // previousData while the request is in flight.
    chartProps.mockClear();
    mockQuery({ previousData: atCost, loading: true });
    rerender(<AccountPage />);

    expect(screen.queryByTestId("line-chart")).not.toBeInTheDocument();
    expect(chartProps).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");

    mockQuery({ data: units });
    rerender(<AccountPage />);
    expect(chartProps.mock.calls.at(-1)![0].data).toEqual(
      units.getLedgerAccountReport.accountBalanceData,
    );
  });

  it("keeps the selectors and the journal mounted while the chart is pending", () => {
    mockQuery({ data: atCost });
    const { rerender } = render(<AccountPage />);

    mockQuery({ previousData: atCost, loading: true });
    rerender(<AccountPage />);

    // The pending scope is the chart card, not the page.
    expect(screen.getByTestId("journal-table")).toBeInTheDocument();
    expect(screen.getByTestId("journal-filters")).toBeInTheDocument();
    expect(screen.getByTestId("journal-pagination")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Assets:US:BofA:Checking",
    );
  });

  it("still shows the initial loading page when nothing has arrived yet", () => {
    mockQuery({ loading: true });
    render(<AccountPage />);
    expect(screen.queryByTestId("journal-table")).not.toBeInTheDocument();
  });
});
