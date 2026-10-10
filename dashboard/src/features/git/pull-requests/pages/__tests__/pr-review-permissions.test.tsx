import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { LedgerProvider } from "@/common/providers/ledger-provider";
import type {
  GetLedgerQuery,
  GetPullRequestDetailsQuery,
} from "@/graphql/definitions";
import PRReviewPage from "../pr-review-page";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

type Permissions = GetLedgerQuery["getLedger"]["permissions"];
const reader: Permissions = {
  __typename: "Permission",
  admin: false,
  pull: true,
  push: false,
};
const writer: Permissions = { ...reader, push: true };
const admin: Permissions = { ...reader, admin: true };
const details: GetPullRequestDetailsQuery["getPullRequestDetails"] = {
  __typename: "PullRequestDetails",
  number: 1,
  title: "Simulated review request",
  description: "A synthetic request for permission regression tests",
  state: "open",
  author: "qa-synthetic-contributor",
  headBranch: "qa-browser-only",
  baseBranch: "main",
  files: [
    {
      __typename: "PRFileChange",
      filename: "ledger.txt",
      additions: 1,
      deletions: 1,
      changes: 2,
    },
  ],
  diff: "diff --git a/ledger.txt b/ledger.txt\nindex 1111111..2222222 100644\n--- a/ledger.txt\n+++ b/ledger.txt\n@@ -1 +1 @@\n-before\n+after\n",
};

function ledgerData(permissions: Permissions): GetLedgerQuery["getLedger"] {
  return {
    __typename: "Ledger",
    id: "open_ledger/example",
    name: "Example",
    fullName: "open_ledger/example",
    httpUrl: "",
    sshUrl: "",
    private: false,
    empty: false,
    size: 1,
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    description: "Synthetic public ledger",
    isStarred: false,
    permissions,
    options: {
      __typename: "LedgerOptions",
      title: "Example",
      nameAssets: "Assets",
      nameEquity: "Equity",
      nameExpenses: "Expenses",
      nameIncome: "Income",
      nameLiabilities: "Liabilities",
      accountCurrentConversions: "Equity:Conversions",
      accountCurrentEarnings: "Equity:Earnings",
      renderCommas: true,
      operatingCurrency: ["USD"],
    },
    favaOptions: {
      __typename: "FavaOptions",
      accountJournalIncludeChildren: true,
      autoReload: false,
      collapsePattern: [],
      conversionCurrencies: [],
      currencyColumn: 60,
      defaultPage: "overview",
      indent: 2,
      invertIncomeLiabilitiesEquity: true,
      language: "en",
      locale: "en",
      showAccountsWithZeroBalance: true,
      showAccountsWithZeroTransactions: true,
      showClosedAccounts: true,
      sidebarShowQueries: 5,
      unrealized: "Unrealized",
      upcomingEvents: 7,
      uptodateIndicatorGreyLookbackDays: 60,
      useExternalEditor: false,
      fiscalYearEnd: { __typename: "FiscalYearEnd", month: 12, day: 31 },
    },
    bcioOptions: {
      __typename: "BcioOptions",
      defaultFile: "main.bean",
      transactionFile: null,
      accountFile: null,
      priceFile: null,
      balanceFile: null,
      noteFile: null,
      padFile: null,
    },
  };
}

interface RequestRecord {
  name: string;
  variables: Record<string, unknown>;
  resolve: (data: Record<string, unknown>) => void;
  reject: () => void;
}
const clients: ApolloClient[] = [];
beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.stop());
});

async function mountPage({
  permissions = reader,
  authenticated = true,
  state = "open",
}: {
  permissions?: Permissions;
  authenticated?: boolean;
  state?: string;
} = {}) {
  const requests: RequestRecord[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          requests.push({
            name: operation.operationName,
            variables: { ...operation.variables },
            resolve: (data) => {
              observer.next({ data });
              observer.complete();
            },
            reject: () =>
              observer.error(new Error("Synthetic review network failure")),
          });
        }),
    ),
  });
  clients.push(client);
  // useIsAuthenticated reads this actual router context; permission policy,
  // ledger provider, action buttons, metadata, file list, and diff stay real.
  const rootRoute = createRootRouteWithContext<{
    userProfile: { id: string } | null;
  }>()({ component: Outlet });
  const reviewRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/ledger/$ledgerOwner/$ledgerName/pull/$prNumber",
    component: PRReviewPage,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([reviewRoute]),
    history: createMemoryHistory({
      initialEntries: ["/ledger/open_ledger/example/pull/1"],
    }),
    context: {
      userProfile: authenticated ? { id: "synthetic-reviewer" } : null,
    },
  });
  await router.load();
  const tree = (nextPermissions: Permissions) => (
    <ApolloProvider client={client}>
      <LedgerProvider
        ledgerOwner="open_ledger"
        ledgerName="example"
        ledgerData={ledgerData(nextPermissions)}
      >
        <RouterProvider router={router} />
      </LedgerProvider>
    </ApolloProvider>
  );
  const view = render(tree(permissions));
  await waitFor(() => expect(requests).toHaveLength(1));
  expect(requests[0]).toMatchObject({
    name: "GetPullRequestDetails",
    variables: {
      ledgerOwner: "open_ledger",
      ledgerName: "example",
      prNumber: 1,
    },
  });
  await act(async () =>
    requests[0].resolve({ getPullRequestDetails: { ...details, state } }),
  );
  await screen.findByText(details.title);
  return {
    requests,
    setPermissions: (next: Permissions) => view.rerender(tree(next)),
  };
}

function expectReadableReview() {
  expect(screen.getByText(details.title)).toBeInTheDocument();
  expect(screen.getByText(details.description)).toBeInTheDocument();
  expect(screen.getByText(/qa-synthetic-contributor/)).toBeInTheDocument();
  expect(screen.getByText(/qa-browser-only/)).toBeInTheDocument();
  expect(screen.getByText(/main/)).toBeInTheDocument();
  expect(screen.getAllByText("ledger.txt")).toHaveLength(2);
  const diff = within(screen.getByTestId("diff-viewer"));
  expect(diff.getByText("before")).toBeInTheDocument();
  expect(diff.getByText("after")).toBeInTheDocument();
}

function expectNoActions() {
  expect(
    screen.queryByRole("button", { name: "Approve & Merge" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Reject & Close" }),
  ).not.toBeInTheDocument();
  expectReadableReview();
}

function actions() {
  return {
    approve: screen.getByRole("button", { name: "Approve & Merge" }),
    reject: screen.getByRole("button", { name: "Reject & Close" }),
  };
}

describe("pull-request review write permission on the owning page", () => {
  it.each([
    { role: "reader", permissions: reader, authenticated: true },
    { role: "unresolved permissions", permissions: null, authenticated: true },
    {
      role: "anonymous with writer-shaped metadata",
      permissions: writer,
      authenticated: false,
    },
    {
      role: "no permissions",
      permissions: { ...reader, pull: false },
      authenticated: true,
    },
  ])(
    "keeps open requests readable without review actions for $role",
    async (input) => {
      const { requests } = await mountPage(input);
      expectNoActions();
      expect(requests.map((request) => request.name)).toEqual([
        "GetPullRequestDetails",
      ]);
    },
  );

  it.each([
    { role: "ordinary writer", permissions: writer },
    { role: "admin without push", permissions: admin },
  ])(
    "retains enabled keyboard-reachable actions for an open $role request",
    async ({ permissions }) => {
      const user = userEvent.setup();
      const { requests } = await mountPage({ permissions });
      expectReadableReview();
      const { approve, reject } = actions();
      expect(approve).toBeEnabled();
      expect(reject).toBeEnabled();
      await user.tab();
      expect(reject).toHaveFocus();
      await user.tab();
      expect(approve).toHaveFocus();
      expect(requests).toHaveLength(1);
    },
  );

  it.each(["closed", "merged"])(
    "omits writer actions for %s requests while retaining the diff",
    async (state) => {
      await mountPage({ permissions: writer, state });
      expectNoActions();
      expect(screen.getByText(state)).toBeInTheDocument();
    },
  );

  it("responds to resolved and revoked permissions without replacing the read result", async () => {
    const { requests, setPermissions } = await mountPage({ permissions: null });
    expectNoActions();
    setPermissions(writer);
    expect(actions().approve).toBeEnabled();
    expect(actions().reject).toBeEnabled();
    setPermissions(reader);
    expectNoActions();
    setPermissions(admin);
    expect(actions().approve).toBeEnabled();
    setPermissions(null);
    expectNoActions();
    expect(requests).toHaveLength(1);
  });

  it.each([
    {
      operation: "ApprovePullRequest",
      field: "approvePullRequest",
      action: "approve" as const,
      finalState: "merged",
      error: "Failed to approve pull request",
      success: "Pull request approved and merged successfully",
    },
    {
      operation: "RejectPullRequest",
      field: "rejectPullRequest",
      action: "reject" as const,
      finalState: "closed",
      error: "Failed to close pull request",
      success: "Pull request closed successfully",
    },
  ])(
    "keeps both actions disabled during actual $operation requests and preserves retry/refetch behavior",
    async ({ operation, field, action, finalState, error, success }) => {
      const user = userEvent.setup();
      const { requests } = await mountPage({ permissions: writer });
      await user.click(actions()[action]);
      await waitFor(() => expect(requests).toHaveLength(2));
      expect(requests[1]).toMatchObject({
        name: operation,
        variables: {
          ledgerOwner: "open_ledger",
          ledgerName: "example",
          prNumber: 1,
        },
      });
      expect(actions().approve).toBeDisabled();
      expect(actions().reject).toBeDisabled();
      await user.click(actions().approve);
      await user.click(actions().reject);
      expect(requests).toHaveLength(2);
      expectReadableReview();

      await act(async () => requests[1].reject());
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith(error));
      expect(actions().approve).toBeEnabled();
      expect(actions().reject).toBeEnabled();
      await user.click(actions()[action]);
      await waitFor(() => expect(requests).toHaveLength(3));
      expect(requests[2].name).toBe(operation);
      await act(async () =>
        requests[2].resolve({
          [field]: { success: true, message: "Synthetic review success" },
        }),
      );
      await waitFor(() => expect(requests).toHaveLength(4));
      expect(requests[3].name).toBe("GetPullRequestDetails");
      expect(toast.success).toHaveBeenCalledWith(success);
      await act(async () =>
        requests[3].resolve({
          getPullRequestDetails: { ...details, state: finalState },
        }),
      );
      await screen.findByText(details.title);
      expectNoActions();
      expect(screen.getByText(finalState)).toBeInTheDocument();
    },
  );
});
