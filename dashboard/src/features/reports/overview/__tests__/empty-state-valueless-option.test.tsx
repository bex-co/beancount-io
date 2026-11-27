import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useQuery } from "@apollo/client/react";
import LedgerOverviewPage from "../index";

const searchParamsMock = vi.hoisted(() => ({
  account: "",
  filter: "",
  time: "",
}));

const ledgerDataMock = vi.hoisted(() => ({
  bcioOptions: {
    transactionFile: "",
    defaultFile: "books/2026.bean",
  },
}));

vi.mock("@apollo/client/react", () => ({ useQuery: vi.fn() }));

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  Link: ({
    children,
    to,
    params,
    search,
    activeOptions: _activeOptions,
    ...props
  }: React.ComponentProps<"a"> & {
    to: string;
    activeOptions?: unknown;
    params?: Record<string, string>;
    search?: Record<string, unknown>;
  }) => (
    <a
      href="#"
      data-to={to}
      data-params={params ? JSON.stringify(params) : undefined}
      data-search={search ? JSON.stringify(search) : undefined}
      {...props}
    >
      {children}
    </a>
  ),
  useSearch: () => ({}),
  useNavigate: () => vi.fn(),
  useParams: () => ({ ledgerOwner: "demo", ledgerName: "empty" }),
  useLoaderData: () => ({}),
}));

vi.mock("@/common/hooks/use-ledger-search-params", () => ({
  useLedgerSearchParams: () => ({
    searchParams: searchParamsMock,
  }),
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({
    primaryCurrency: "USD",
    ledgerName: "Empty ledger",
    ledgerData: {
      isStarred: false,
      options: { nameIncome: "Income", nameExpenses: "Expenses" },
      bcioOptions: ledgerDataMock.bcioOptions,
    },
  }),
}));

vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({ isAdmin: true, canWrite: true }),
}));

vi.mock("@/common/lib/fava-options", () => ({
  getInvertIncomeLiabilitiesEquity: () => false,
}));

vi.mock("../hooks/use-dashboard-layout", () => ({
  useDashboardLayout: () => ({
    layout: { order: ["financial-position"], hidden: [] },
    setVisible: vi.fn(),
    move: vi.fn(),
    reset: vi.fn(),
  }),
}));

vi.mock("../components/dashboard-customizer", () => ({
  DashboardCustomizer: () => null,
}));

vi.mock("@/features/ai-agent/components/quick-ask-input", () => ({
  QuickAskInput: () => null,
}));

vi.mock("@/common/components/ledger-permission/write", () => ({
  LedgerWritePermission: () => null,
}));

function mockEmptyOverview() {
  vi.mocked(useQuery).mockReturnValue({
    data: {
      getLedgerOverview: {
        netWorthData: [{ date: "2026-07-31", balance: { USD: 0 } }],
        assetsData: [],
        liabilitiesData: [],
        incomeIntervalData: [],
        incomeData: [],
        expensesIntervalData: [],
        expensesData: [],
        assetsHierarchyData: {
          account: "Assets",
          balance: { USD: 0 },
          hasTxns: false,
          children: [],
        },
        liabilitiesHierarchyData: {
          account: "Liabilities",
          balance: {},
          hasTxns: false,
          children: [],
        },
        incomeHierarchyData: {
          account: "Income",
          balance: {},
          hasTxns: false,
          children: [],
        },
        expensesHierarchyData: {
          account: "Expenses",
          balance: {},
          hasTxns: false,
          children: [],
        },
      },
    },
    loading: false,
    error: undefined,
  } as never);
}

describe("LedgerOverviewPage empty state with valueless file options", () => {
  beforeEach(() => {
    searchParamsMock.account = "";
    searchParamsMock.filter = "";
    searchParamsMock.time = "";
    mockEmptyOverview();
  });

  it("falls through a valueless transaction_file to the default file", () => {
    // A valueless `custom "beancountio-option" "transaction_file"` parses as
    // `""`, which means unset — not a file named "". The setup screen must
    // link the default file, matching resolveEntryFile's routing order.
    ledgerDataMock.bcioOptions.transactionFile = "";
    ledgerDataMock.bcioOptions.defaultFile = "books/2026.bean";

    render(<LedgerOverviewPage />);

    const editLink = screen.getByRole("link", { name: "Edit ledger file" });
    expect(editLink).toHaveAttribute(
      "data-params",
      expect.stringContaining("books/2026.bean"),
    );
  });

  it("falls through valueless transaction_file and default_file to main.bean", () => {
    ledgerDataMock.bcioOptions.transactionFile = "";
    ledgerDataMock.bcioOptions.defaultFile = "";

    render(<LedgerOverviewPage />);

    const editLink = screen.getByRole("link", { name: "Edit ledger file" });
    expect(editLink).toHaveAttribute(
      "data-params",
      expect.stringContaining("main.bean"),
    );
  });
});
