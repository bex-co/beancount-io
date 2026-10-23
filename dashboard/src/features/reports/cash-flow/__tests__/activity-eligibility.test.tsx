import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useQuery } from "@apollo/client/react";
import {
  GetLedgerCashFlowAccountsDocument,
  GetLedgerCashFlowDocument,
} from "@/graphql/definitions";
import LedgerCashFlowPage from "../index";

/**
 * The page reads cash membership first, from every account the ledger
 * defines, and only then the activity intervals, narrowed to transactions
 * with a cash posting (w4/m56). The closing balances keep the reader's own
 * filter, and an unknown membership never falls back to every transaction.
 */
const state = vi.hoisted(() => ({
  filter: "",
  accounts: {} as Record<string, unknown>,
  report: {} as Record<string, unknown>,
  calls: [] as Array<{ document: unknown; options: unknown }>,
}));

vi.mock("@apollo/client/react", () => ({ useQuery: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ ledgerOwner: "open_ledger", ledgerName: "example" }),
  useSearch: () => ({}),
  useNavigate: () => () => {},
  ClientOnly: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({
    ledgerName: "Example",
    primaryCurrency: "USD",
    ledgerData: {
      options: { title: "" },
      favaOptions: {
        showClosedAccounts: false,
        fiscalYearEnd: { month: 12, day: 31 },
      },
    },
  }),
}));
vi.mock("@/common/hooks/use-ledger-search-params", () => ({
  useLedgerSearchParams: () => ({
    searchParams: { account: "", filter: state.filter, time: "2016-04" },
  }),
}));
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => key,
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));
vi.mock("../cash-flow-content", () => ({
  CashFlowContent: () => <div>cash-flow-content</div>,
}));

const settled = (data: unknown) => ({
  data,
  loading: false,
  error: undefined,
  refetch: vi.fn(),
});
const directives = (...accounts: string[]) => ({
  getLedgerAccountDirectives: accounts.map((account) => ({
    account,
    meta: null,
  })),
});
/** What the narrowed read returns for the 20 card-only purchases: nothing. */
const noActivity = {
  incomeIntervals: [],
  expenseIntervals: [],
  assetIntervals: [],
  liabilityIntervals: [],
  equityIntervals: [],
  getLedgerBalanceSheet: {
    assetsHierarchyData: {
      account: "Assets",
      balance: {},
      balanceChildren: {},
      children: [],
    },
  },
};

type ReportOptions = {
  skip: boolean;
  variables: { filter: string; activityFilter: string };
};
const reportCall = () =>
  state.calls.findLast(
    ({ document }) => document === GetLedgerCashFlowDocument,
  )!.options as ReportOptions;

beforeEach(() => {
  state.filter = "#trip-los-angeles-2016";
  state.calls = [];
  vi.mocked(useQuery).mockImplementation(((
    document: unknown,
    options: unknown,
  ) => {
    state.calls.push({ document, options });
    if (document === GetLedgerCashFlowAccountsDocument) return state.accounts;
    return (options as ReportOptions).skip
      ? { data: undefined, loading: false, error: undefined }
      : state.report;
  }) as never);
});

describe("Cash Flow activity eligibility", () => {
  it("waits for cash membership instead of reading every transaction", () => {
    state.accounts = { data: undefined, loading: true, error: undefined };
    render(<LedgerCashFlowPage />);

    expect(reportCall().skip).toBe(true);
    expect(screen.queryByText("cash-flow-content")).not.toBeInTheDocument();
    expect(screen.queryByText("page.cashFlow.noData")).not.toBeInTheDocument();
  });

  it("offers Try Again on the membership read when it fails", async () => {
    const refetchAccounts = vi.fn(() => Promise.resolve());
    state.accounts = {
      data: undefined,
      loading: false,
      error: new Error("network"),
      refetch: refetchAccounts,
    };
    render(<LedgerCashFlowPage />);

    expect(reportCall().skip).toBe(true);
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "common.tryAgain" }));
    expect(refetchAccounts).toHaveBeenCalledTimes(1);
  });

  it("narrows only the activity reads to transactions with a cash posting", () => {
    state.accounts = settled(
      directives(
        "Assets:US:BofA:Checking",
        "Assets:US:ETrade:Cash",
        "Assets:US:ETrade:ITOT",
        "Assets:US:Vanguard:Cash",
        "Liabilities:US:Chase:Slate",
      ),
    );
    state.report = settled(noActivity);
    render(<LedgerCashFlowPage />);

    const { skip, variables } = reportCall();
    expect(skip).toBe(false);
    // The closing balances keep the reader's filter as written.
    expect(variables.filter).toBe("#trip-los-angeles-2016");
    expect(variables.activityFilter).toBe(
      '(#trip-los-angeles-2016) any(account:"^Assets:US:BofA:Checking$", ' +
        'account:"^Assets:US:ETrade:Cash$", account:"^Assets:US:Vanguard:Cash$")',
    );
    // No cash moved, so there is no statement to show or export.
    expect(screen.getByText("page.cashFlow.noData")).toBeInTheDocument();
    expect(screen.queryByText("cash-flow-content")).not.toBeInTheDocument();
  });

  it("reads no activity for a ledger without cash accounts", () => {
    state.filter = "";
    state.accounts = settled(directives("Assets:House", "Liabilities:Loan"));
    state.report = settled(noActivity);
    render(<LedgerCashFlowPage />);

    expect(reportCall().variables.activityFilter).toBe('any(account:"^$")');
  });
});
