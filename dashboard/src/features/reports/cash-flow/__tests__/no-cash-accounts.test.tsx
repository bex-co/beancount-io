import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useQuery } from "@apollo/client/react";
import {
  GetLedgerCashFlowAccountsDocument,
  GetLedgerCashFlowDocument,
} from "@/graphql/definitions";
import en from "@/i18n/locales/en";
import LedgerCashFlowPage from "../index";

/**
 * A ledger whose only bank is `Assets:Revolut` moved money, but no account
 * matches the cash rule, so no transaction is cash activity and the
 * statement is empty. The page says that, names the rule and the
 * declaration that fixes it, instead of "No cash flow data" (w1/321, the
 * dashboard side of w1/319). The English catalog renders through the shared
 * translation mock.
 */
const state = vi.hoisted(() => ({
  options: {} as Record<string, unknown>,
  directives: [] as { account: string; meta: Record<string, string> | null }[],
  hierarchy: [] as { account: string; balance: Record<string, string> }[],
  calls: [] as { document: unknown; options: unknown }[],
}));

vi.mock("@apollo/client/react", () => ({ useQuery: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ ledgerOwner: "demo", ledgerName: "books" }),
  useSearch: () => ({}),
  useNavigate: () => () => {},
  ClientOnly: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({
    ledgerName: "Books",
    primaryCurrency: "USD",
    ledgerData: {
      options: { title: "", ...state.options },
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
vi.mock("../cash-flow-content", () => ({
  CashFlowContent: () => <div>cash-flow-content</div>,
}));

const settled = (data: unknown) => ({
  data,
  loading: false,
  error: undefined,
  refetch: vi.fn(),
});

/** No transaction posts to a cash account, so every activity read is empty. */
function noActivity(root: string) {
  const node = (account: string, balance: Record<string, string>) => ({
    account,
    balance,
    balanceChildren: balance,
    children: [],
  });
  return {
    incomeIntervals: [],
    expenseIntervals: [],
    assetIntervals: [],
    liabilityIntervals: [],
    equityIntervals: [],
    getLedgerBalanceSheet: {
      assetsHierarchyData: {
        ...node(root, {}),
        children: state.hierarchy.map(({ account, balance }) =>
          node(account, balance),
        ),
      },
      liabilitiesHierarchyData: node("Liabilities", {}),
      equityHierarchyData: node("Equity", {}),
    },
  };
}

const activityFilter = () =>
  (
    state.calls.findLast(
      ({ document }) => document === GetLedgerCashFlowDocument,
    )!.options as { variables: { activityFilter: string } }
  ).variables.activityFilter;

const noCashMessage = (assets: string) =>
  `No ${assets} account is named like Cash, Checking, Savings, or Bank, ` +
  'and none declares cash-flow-role: "cash" on its open directive. ' +
  'Add cash-flow-role: "cash" under the open directive of each bank or ' +
  "wallet account.";

function expectNoCashState(assets: string) {
  expect(
    screen.getByRole("heading", {
      name: en["page.cashFlow.noCashAccountsTitle"],
    }),
  ).toBeVisible();
  expect(screen.getByText(noCashMessage(assets))).toBeVisible();
  expect(
    screen.getByRole("link", {
      name: en["page.cashFlow.classificationDocLink"],
    }),
  ).toHaveAttribute("href", "https://beancount.io/docs/cash-flow-roles");
  expect(screen.queryByText(en["page.cashFlow.noData"])).toBeNull();
  expect(screen.queryByText("cash-flow-content")).toBeNull();
}

beforeEach(() => {
  state.options = {};
  state.hierarchy = [];
  state.calls = [];
  vi.mocked(useQuery).mockImplementation(((
    document: unknown,
    options: { skip?: boolean },
  ) => {
    state.calls.push({ document, options });
    if (document === GetLedgerCashFlowAccountsDocument) {
      return settled({ getLedgerAccountDirectives: state.directives });
    }
    if (options.skip) return { data: undefined, loading: false };
    return settled(noActivity(String(state.options.nameAssets ?? "Assets")));
  }) as never);
});

const open = (account: string, meta: Record<string, string> | null = null) => ({
  account,
  meta,
});

describe("Cash Flow when no account counts as cash", () => {
  it("names the cash rule and the declaration for a bank named after its institution", () => {
    state.directives = [
      open("Assets:Revolut"),
      open("Income:Salary"),
      open("Expenses:Rent"),
    ];
    state.hierarchy = [{ account: "Assets:Revolut", balance: { USD: "1800" } }];
    render(<LedgerCashFlowPage />);

    expect(activityFilter()).toBe('any(account:"^$")');
    expectNoCashState("Assets");
  });

  it("names the ledger's own assets root when the roots are renamed", () => {
    state.options = {
      nameAssets: "Activos",
      nameIncome: "Ingresos",
      nameExpenses: "Gastos",
    };
    state.directives = [
      open("Activos:Banco:Cuenta"),
      open("Ingresos:Salario"),
      open("Gastos:Alquiler"),
    ];
    render(<LedgerCashFlowPage />);

    expectNoCashState("Activos");
  });

  it("keeps the quiet-period state once an account declares itself cash", () => {
    state.directives = [
      open("Assets:Revolut", { "cash-flow-role": "cash" }),
      open("Income:Salary"),
    ];
    render(<LedgerCashFlowPage />);

    expect(activityFilter()).toBe('any(account:"^Assets:Revolut$")');
    expect(screen.getByText(en["page.cashFlow.noData"])).toBeVisible();
    expect(
      screen.queryByText(en["page.cashFlow.noCashAccountsTitle"]),
    ).toBeNull();
  });

  it("keeps the quiet-period state for an account the name rule counts", () => {
    state.directives = [open("Assets:Chase:Checking"), open("Income:Salary")];
    render(<LedgerCashFlowPage />);

    expect(screen.getByText(en["page.cashFlow.noData"])).toBeVisible();
    expect(
      screen.queryByText(en["page.cashFlow.noCashAccountsTitle"]),
    ).toBeNull();
  });

  it("keeps the no-data state for a ledger with no accounts to declare", () => {
    state.directives = [];
    render(<LedgerCashFlowPage />);

    expect(screen.getByText(en["page.cashFlow.noData"])).toBeVisible();
    expect(
      screen.queryByText(en["page.cashFlow.noCashAccountsTitle"]),
    ).toBeNull();
  });
});
