import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useQuery } from "@apollo/client/react";
import LedgerOverviewPage from "../index";

const searchParamsMock = vi.hoisted(() => ({
  account: "",
  filter: "",
  time: "",
}));

vi.mock("@apollo/client/react", () => ({ useQuery: vi.fn() }));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
    search,
    ...props
  }: React.ComponentProps<"a"> & {
    to: string;
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
  useParams: () => ({ ledgerOwner: "demo", ledgerName: "empty" }),
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
      bcioOptions: {
        transactionFile: null,
        defaultFile: "books/2026.bean",
      },
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

describe("LedgerOverviewPage empty state", () => {
  beforeEach(() => {
    searchParamsMock.account = "";
    searchParamsMock.filter = "";
    searchParamsMock.time = "";
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
  });

  it("renders the configured writer setup instead of overview chart cards", () => {
    render(<LedgerOverviewPage />);

    expect(screen.getByText("Set up your ledger")).toBeInTheDocument();
    expect(screen.queryByText("Financial position")).not.toBeInTheDocument();

    const editLink = screen.getByRole("link", { name: "Edit ledger file" });
    expect(editLink).toHaveAttribute(
      "data-params",
      expect.stringContaining("books/2026.bean"),
    );
    expect(editLink).toHaveAttribute(
      "data-search",
      JSON.stringify({ editMode: true }),
    );
  });

  it("uses Income Statement as the primary overview shortcut", () => {
    render(<LedgerOverviewPage />);

    const shortcuts = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("data-slot") === "button");
    const shortcutFor = (to: string) =>
      shortcuts.find((link) => link.getAttribute("data-to") === to);

    const incomeStatementShortcut = shortcutFor(
      "/ledger/$ledgerOwner/$ledgerName/income-statement",
    );
    expect(incomeStatementShortcut).toHaveTextContent("Income Statement");
    expect(incomeStatementShortcut).toHaveClass("bg-primary");

    const journalShortcut = shortcutFor(
      "/ledger/$ledgerOwner/$ledgerName/journal",
    );
    expect(journalShortcut).toHaveTextContent("Journal");
    expect(journalShortcut).toHaveClass("bg-secondary");

    expect(
      shortcutFor("/ledger/$ledgerOwner/$ledgerName/balance-sheet"),
    ).toBeUndefined();
  });
});

describe("LedgerOverviewPage filtered empty state", () => {
  beforeEach(() => {
    searchParamsMock.account = "";
    searchParamsMock.filter = "";
    searchParamsMock.time = "2020";
    vi.mocked(useQuery).mockReturnValue({
      data: {
        getLedgerOverview: {
          netWorthData: [{ date: "2020-01-31", balance: {} }],
          assetsData: [],
          liabilitiesData: [],
          incomeIntervalData: [],
          incomeData: [],
          expensesIntervalData: [],
          expensesData: [],
          assetsHierarchyData: {
            account: "Assets",
            balance: {},
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
  });

  it("does not claim the whole ledger is empty when filters exclude activity", () => {
    render(<LedgerOverviewPage />);

    expect(
      screen.getByText("No activity for the current filters"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/This ledger has no activity yet/),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Set up your ledger")).not.toBeInTheDocument();
  });
});
