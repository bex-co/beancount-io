import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useQuery } from "@apollo/client/react";
import LedgerCashFlowPage from "../index";
import type { CashFlowContent } from "../cash-flow-content";

const { captureProps } = vi.hoisted(() => ({ captureProps: vi.fn() }));

vi.mock("@apollo/client/react", () => ({ useQuery: vi.fn() }));

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ ledgerOwner: "demo", ledgerName: "books" }),
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({
    ledgerName: "Demo Books",
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
    searchParams: { account: "", filter: "", time: "" },
  }),
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => key,
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

vi.mock("../cash-flow-content", () => ({
  CashFlowContent: (props: Parameters<typeof CashFlowContent>[0]) => {
    captureProps(props);
    return <div>cash-flow-content</div>;
  },
}));

function hierarchyNode(
  account: string,
  balance: Record<string, unknown>,
  children: unknown[] = [],
) {
  return {
    __typename: "SerializableTreeNode",
    account,
    balance,
    balanceChildren: balance,
    children,
    hasTxns: true,
    cost: null,
    costChildren: null,
  };
}

function mockQuery(data: unknown) {
  vi.mocked(useQuery).mockReturnValue({
    data,
    previousData: undefined,
    loading: false,
    error: undefined,
  } as never);
}

const emptyPayload = {
  incomeIntervals: [],
  expenseIntervals: [],
  assetIntervals: [],
  liabilityIntervals: [],
  equityIntervals: [],
  getLedgerBalanceSheet: {
    assetsHierarchyData: hierarchyNode("Assets", {}),
  },
  getLedgerAccountDirectives: [],
};

const populatedPayload = {
  incomeIntervals: [
    {
      date: "2026-01-01",
      balance: { USD: "-5000.00" },
      accountBalances: { "Income:Salary": { USD: "-5000.00" } },
    },
  ],
  expenseIntervals: [
    {
      date: "2026-01-01",
      balance: { USD: "1500.00" },
      accountBalances: { "Expenses:Rent": { USD: "1500.00" } },
    },
  ],
  assetIntervals: [
    {
      date: "2026-01-01",
      balance: { USD: "3500.00" },
      accountBalances: { "Assets:Bank:Checking": { USD: "3500.00" } },
    },
  ],
  liabilityIntervals: [],
  equityIntervals: [],
  getLedgerBalanceSheet: {
    assetsHierarchyData: hierarchyNode("Assets", { USD: "3500.00" }, [
      hierarchyNode("Assets:Bank:Checking", { USD: "3500.00" }),
    ]),
  },
  getLedgerAccountDirectives: [
    {
      account: "Assets:Bank:Checking",
      openedAt: "2020-01-01",
      closedAt: null,
      balance: { USD: "3500.00" },
      entryCount: 7,
      entryHash: "abc",
      closeEntryHash: null,
    },
  ],
};

describe("LedgerCashFlowPage", () => {
  it("renders the empty state when the statement has no rows and no cash", () => {
    mockQuery(emptyPayload);

    render(<LedgerCashFlowPage />);

    expect(screen.getByText("page.cashFlow.noData")).toBeInTheDocument();
    expect(captureProps).not.toHaveBeenCalled();
  });

  it("builds the statement from interval totals and closing cash balances", () => {
    mockQuery(populatedPayload);

    render(<LedgerCashFlowPage />);

    expect(screen.getByText("cash-flow-content")).toBeInTheDocument();
    const props = captureProps.mock.calls[0][0];

    // Salary inflow +5000, rent outflow -1500 → operating +3500.
    expect(props.statement.totals.operating).toEqual({ USD: "3500.00" });
    expect(props.statement.netChange).toEqual({ USD: "3500.00" });
    expect(props.statement.closing).toEqual({ USD: "3500.00" });
    expect(props.statement.opening).toEqual({ USD: "0.00" });
    // The cash account itself never appears as a row (it is the explained cash).
    expect(
      props.statement.rows.map(
        (row: { accountPath: string }) => row.accountPath,
      ),
    ).toEqual(["Income:Salary", "Expenses:Rent"]);

    // The bottom-line table lists the real closing cash accounts.
    expect(
      props.closingCashAccounts.map(
        (snapshot: { account: string }) => snapshot.account,
      ),
    ).toEqual(["Assets:Bank:Checking"]);

    // Status panel rows join the directives by account name.
    expect(props.cashAccountRows).toEqual([
      {
        account: "Assets:Bank:Checking",
        openedAt: "2020-01-01",
        closedAt: null,
        balance: { USD: "3500.00" },
        entryCount: 7,
      },
    ]);
  });

  it("lets declared cash-flow roles drive sections, the CCE set, and the bottom line", () => {
    // Same shape as populatedPayload, plus a CD whose open directive declares
    // it investing — it must leave the cash set and become an investing row.
    const payload = {
      ...populatedPayload,
      assetIntervals: [
        {
          date: "2026-01-01",
          balance: { USD: "5000.00" },
          accountBalances: {
            "Assets:Bank:Checking": { USD: "3500.00" },
            "Assets:Bank:CD": { USD: "1500.00" },
          },
        },
      ],
      getLedgerBalanceSheet: {
        assetsHierarchyData: hierarchyNode("Assets", { USD: "5000.00" }, [
          hierarchyNode("Assets:Bank:Checking", { USD: "3500.00" }),
          hierarchyNode("Assets:Bank:CD", { USD: "1500.00" }),
        ]),
      },
    };
    // The declaration rides on the directives the page already fetches.
    mockQuery({
      ...payload,
      getLedgerAccountDirectives: [
        ...populatedPayload.getLedgerAccountDirectives,
        {
          account: "Assets:Bank:CD",
          openedAt: "2020-01-01",
          closedAt: null,
          balance: { USD: "1500.00" },
          entryCount: 1,
          entryHash: "cd",
          closeEntryHash: null,
          meta: { "cash-flow-role": "investing" },
        },
      ],
    });

    render(<LedgerCashFlowPage />);

    // captureProps is shared across tests in this file — take the latest.
    const props = captureProps.mock.calls.at(-1)[0];
    const rowByAccount = Object.fromEntries(
      props.statement.rows.map(
        (row: {
          accountPath: string;
          activity: string;
          roleSource: string;
          amounts: unknown;
        }) => [row.accountPath, row],
      ),
    );

    // The CD is now an investing outflow, resolved from the declaration.
    expect(rowByAccount["Assets:Bank:CD"].activity).toBe("investing");
    expect(rowByAccount["Assets:Bank:CD"].roleSource).toBe("declared");
    expect(rowByAccount["Assets:Bank:CD"].amounts).toEqual({
      USD: "-1500.00",
    });

    // The bottom line follows the reduced cash set (checking only):
    // +5000 salary, -1500 rent, -1500 CD purchase.
    expect(props.statement.totals.investing).toEqual({ USD: "-1500.00" });
    expect(props.statement.netChange).toEqual({ USD: "2000.00" });
    expect(props.statement.closing).toEqual({ USD: "3500.00" });
    expect(props.statement.opening).toEqual({ USD: "1500.00" });

    // Only the checking account remains in the status panel's cash set.
    expect(
      props.cashAccountRows.map((row: { account: string }) => row.account),
    ).toEqual(["Assets:Bank:Checking"]);
  });
});
