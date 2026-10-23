import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
  type Operation,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FieldNode, OperationDefinitionNode } from "graphql";
import type { ComponentType, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import AccountPage from "@/features/reports/account";
import BalanceSheetPage from "@/features/reports/balance-sheet";
import CashFlowPage from "@/features/reports/cash-flow";
import IncomeStatementPage from "@/features/reports/income-statement";
import TrialBalancePage from "@/features/reports/trial-balance";

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({
    ledgerOwner: "demo",
    ledgerName: "books",
    accountName: "Assets:Cash",
  }),
  useSearch: () => ({}),
  useNavigate: () => vi.fn(),
  ClientOnly: ({ children }: { children: ReactNode }) => <>{children}</>,
  Link: ({ children }: { children: ReactNode }) => <a href="#">{children}</a>,
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
    searchParams: { account: "", filter: "", time: "2016" },
  }),
}));
vi.mock("@/common/components/related-links", () => ({
  RelatedLinks: () => null,
}));
vi.mock("@/features/reports/balance-sheet/line-chart", () => ({
  LineChart: () => null,
}));
vi.mock("@/features/reports/income-statement/date-balance-chart", () => ({
  DateBalanceChart: () => null,
}));

/**
 * Each read answered empty: the reads these pages assume are present get
 * their smallest real shape, every other root field `null`.
 */
const EMPTY: Record<string, Record<string, unknown>> = {
  // The Account page needs its report before it shows the journal.
  GetLedgerAccountReport: {
    getLedgerAccountReport: {
      linechartData: [],
      intervalTotalsData: [],
      accountBalanceData: [],
    },
  },
  GetLedgerAccountJournal: {
    getLedgerAccountJournal: {
      with_children: false,
      total: 0,
      items: [],
      account: "Assets:Cash",
    },
  },
  GetLedgerCashFlow: {
    incomeIntervals: [],
    expenseIntervals: [],
    assetIntervals: [],
    liabilityIntervals: [],
    equityIntervals: [],
    getLedgerBalanceSheet: {
      assetsHierarchyData: {
        __typename: "SerializableTreeNode",
        account: "Assets",
        balance: {},
        balanceChildren: {},
        children: [],
        hasTxns: false,
        cost: null,
        costChildren: null,
      },
    },
    getLedgerAccountDirectives: [],
  },
};

function emptyAnswer(operation: Operation) {
  const known = EMPTY[operation.operationName ?? ""];
  if (known) return known;
  const definition = operation.query.definitions.find(
    (d): d is OperationDefinitionNode => d.kind === "OperationDefinition",
  )!;
  return Object.fromEntries(
    definition.selectionSet.selections.map((s) => {
      const field = s as FieldNode;
      return [(field.alias ?? field.name).value, null];
    }),
  );
}

/**
 * Fails the first `target` read, holds every later one until the test
 * settles it, and answers every other read empty.
 */
function readClient(target: string) {
  const reads: Record<string, unknown>[] = [];
  const held: ((ok: boolean) => void)[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          if (operation.operationName !== target) {
            observer.next({ data: emptyAnswer(operation) });
            observer.complete();
            return;
          }
          reads.push(operation.variables);
          const settle = (ok: boolean) => {
            if (!ok) return observer.error(new TypeError("Failed to fetch"));
            observer.next({ data: emptyAnswer(operation) });
            observer.complete();
          };
          if (reads.length === 1) settle(false);
          else held.push(settle);
        }),
    ),
  });
  return { client, reads, settle: (ok: boolean) => held.shift()?.(ok) };
}

/** The browser drops focus from the control it disables; jsdom keeps it. */
function dropFocus() {
  const away = document.createElement("button");
  document.body.appendChild(away);
  away.focus();
  away.remove();
}

/**
 * The reason each page gives for a failed fetch: the classified connection
 * problem, or the page's own message. Either must stay while a retry runs.
 */
const CONNECTION_PROBLEM = /connection problem/i;

/**
 * Each failed observer offers Try Again on its own read (w4/m50), and a
 * successful retry renders that read's own content (w4/999).
 */
describe.each<[string, ComponentType, string, string, RegExp?]>([
  [
    "Trial Balance",
    TrialBalancePage,
    "GetLedgerTrialBalance",
    "No trial balance data found for this ledger.",
  ],
  [
    "Balance Sheet",
    BalanceSheetPage,
    "GetLedgerBalanceSheet",
    "No balance sheet data found for this ledger.",
  ],
  [
    "Income Statement",
    IncomeStatementPage,
    "GetLedgerIncomeStatement",
    "No income statement data found for this ledger.",
  ],
  [
    "Cash Flow",
    CashFlowPage,
    "GetLedgerCashFlow",
    "No cash flow data found for this ledger.",
  ],
  [
    "Account Journal",
    AccountPage,
    "GetLedgerAccountJournal",
    "No journal entries found for this account.",
    /error loading journal data/i,
  ],
])("%s read failure", (_name, Page, target, success, reason) => {
  const failure = reason ?? CONNECTION_PROBLEM;
  it("retries its own read in place until it succeeds", async () => {
    const user = userEvent.setup();
    const { client, reads, settle } = readClient(target);
    render(
      <ApolloProvider client={client}>
        <Page />
      </ApolloProvider>,
    );

    const retry = await screen.findByRole("button", { name: "Try Again" });
    expect(screen.getByText(failure)).toBeVisible();
    retry.focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(reads).toHaveLength(2));
    // A pending retry stays where it was, busy, still saying why it failed.
    expect(retry).toBeDisabled();
    expect(screen.getByText(failure)).toBeVisible();
    dropFocus();

    // Another rejection is handled and hands the retry its focus back.
    settle(false);
    await waitFor(() => expect(retry).toHaveFocus());
    expect(retry).toBeEnabled();

    await user.keyboard("{Enter}");
    await waitFor(() => expect(reads).toHaveLength(3));
    settle(true);
    // The retried read itself renders: the page's own success content.
    expect(await screen.findByText(success)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Try Again" })).toBeNull();
    // Every retry asked for the same requested scope.
    expect(reads[1]).toEqual(reads[0]);
    expect(reads[2]).toEqual(reads[0]);
  });
});
