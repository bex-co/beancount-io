import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GraphQLError } from "graphql";
import { ServerError } from "@apollo/client/errors";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  GetPlaidItemsQuery,
  GetUnsyncedPlaidTransactionsQuery,
} from "@/graphql/definitions";
import { fetchUserProfile, toAuthContext } from "@/common/server-fn/user";
import { PlaidConnectionsPage } from "../plaid-connections";
import { PlaidSettingsPage } from "../plaid-settings";

type Permissions = { admin: boolean; pull: boolean; push: boolean } | null;
const access = vi.hoisted(() => ({
  authenticated: true,
  authUnavailable: false,
  permissions: { admin: true, pull: true, push: true } as Permissions,
}));

// Keep the real permission hook and every Plaid Apollo query. Only its ledger
// and authentication inputs are controlled at the surrounding shell boundary.
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerData: { permissions: access.permissions } }),
}));
vi.mock("@/common/hooks/use-is-authenticated", () => ({
  useIsAuthenticated: () => access.authenticated,
}));
vi.mock("@/common/apollo/client", () => ({ getClient: vi.fn() }));
vi.mock("react-plaid-link", () => ({
  usePlaidLink: () => ({ open: vi.fn(), ready: false, error: null }),
}));
vi.mock("../plaid-connections/components/bank-item", () => ({
  BankItem: ({
    item,
    ledgerId,
  }: {
    item: GetPlaidItemsQuery["getPlaidItems"][number];
    ledgerId: string;
  }) => (
    <section aria-label={item.institutionName}>
      {item.id} — {ledgerId}
    </section>
  ),
}));
vi.mock("@/common/components/ledger-comboboxes", () => ({
  AccountCombobox: () => <input aria-label="Ledger account" />,
  SourceFileCombobox: () => <input aria-label="Target file" />,
}));

const ledgerId = "open_ledger/example";
const notice =
  "Only the ledger’s owner or an administrator can connect and manage banks.";
const item: GetPlaidItemsQuery["getPlaidItems"][number] = {
  __typename: "PlaidItemType",
  id: "pitem_synthetic",
  institutionName: "Synthetic Bank",
  status: "active",
  errorMessage: null,
  createdAt: "2026-10-15T00:00:00Z",
  lastSync: null,
};
const transaction: GetUnsyncedPlaidTransactionsQuery["getUnsyncedPlaidTransactions"][number] =
  {
    __typename: "PlaidTransactionType",
    id: "ptxn_synthetic",
    plaidAccountId: "pacc_synthetic",
    transactionId: "tx_synthetic",
    date: "2026-10-15",
    amount: "12.50",
    merchantName: "Synthetic Café",
    name: "SYNTHETIC CAFE",
    isPending: false,
    accountName: "Checking",
    institutionName: item.institutionName,
    ledgerAccount: "Assets:Checking",
  };
interface Request {
  name: string;
  variables: Record<string, unknown>;
  resolve: (data: Record<string, unknown>) => void;
  deny: (code: string) => void;
  fail: () => void;
}
const clients: ApolloClient[] = [];

beforeEach(() => {
  access.authenticated = true;
  access.authUnavailable = false;
  access.permissions = { admin: true, pull: true, push: true };
});
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.stop());
});

async function mountPage(
  page: "settings" | "connections",
  { startOnJournal = false } = {},
) {
  const requests: Request[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          const request: Request = {
            name: operation.operationName,
            variables: { ...operation.variables },
            resolve: (data) => {
              observer.next({ data });
              observer.complete();
            },
            deny: (code) => {
              observer.next({
                errors: [
                  new GraphQLError("Authorization denied", {
                    extensions: { code },
                  }),
                ],
              });
              observer.complete();
            },
            fail: () =>
              observer.error(new Error("Synthetic bank network failure")),
          };
          requests.push(request);
          if (request.name === "GetUnsyncedPlaidTransactions") {
            request.resolve({ getUnsyncedPlaidTransactions: [transaction] });
          } else if (request.name === "GetPlaidAccountsForLedger") {
            request.resolve({ getPlaidAccountsForLedger: [] });
          } else if (request.name === "SyncPlaidTransactions") {
            request.resolve({
              syncPlaidTransactions: {
                __typename: "PlaidSyncResult",
                success: true,
                transactionsFetched: 1,
                transactionsAdded: 1,
                message: null,
              },
            });
          }
        }),
    ),
  });
  clients.push(client);
  const profileClient = {
    query: async () => {
      if (access.authUnavailable) {
        throw new ServerError("Synthetic 502", {
          response: new Response(null, { status: 502 }),
          bodyText: "Bad gateway",
        });
      }
      return {
        data: { userProfile: access.authenticated ? { id: "owner" } : null },
      };
    },
  };
  const root = createRootRoute({
    component: Outlet,
    beforeLoad: async () =>
      toAuthContext(await fetchUserProfile(profileClient as never)),
  });
  const journal = createRoute({
    getParentRoute: () => root,
    path: "/ledger/$ledgerOwner/$ledgerName/journal",
    component: () => <h1>Journal</h1>,
  });
  const settings = createRoute({
    getParentRoute: () => root,
    path: "/ledger/$ledgerOwner/$ledgerName/link",
    component: PlaidSettingsPage,
  });
  const connections = createRoute({
    getParentRoute: () => root,
    path: "/ledger/$ledgerOwner/$ledgerName/plaid-connections",
    component: PlaidConnectionsPage,
  });
  const path = `/ledger/${ledgerId}/${page === "settings" ? "link" : "plaid-connections"}`;
  const router = createRouter({
    routeTree: root.addChildren([journal, settings, connections]),
    history: createMemoryHistory({
      initialEntries: [startOnJournal ? `/ledger/${ledgerId}/journal` : path],
    }),
  });
  await router.load();
  render(
    <ApolloProvider client={client}>
      <RouterProvider router={router} />
    </ApolloProvider>,
  );
  await act(async () => {});
  const itemRequests = () =>
    requests.filter(({ name }) => name === "GetPlaidItems");
  return {
    router,
    path,
    requests,
    itemRequests,
    completeItems: async (items: GetPlaidItemsQuery["getPlaidItems"] = []) => {
      await waitFor(() => expect(itemRequests().length).toBeGreaterThan(0));
      await act(async () =>
        itemRequests().at(-1)!.resolve({ getPlaidItems: items }),
      );
    },
  };
}

function expectPageHeading() {
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  expect(
    screen.getByRole("heading", { level: 1, name: "Connected Accounts" }),
  ).toBeInTheDocument();
}
function expectAccessNotice() {
  expect(screen.getByRole("status")).toHaveTextContent(notice);
  expect(
    screen.queryByRole("button", { name: /retry/i }),
  ).not.toBeInTheDocument();
  expect(screen.queryByText("Failed to Load Data")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Journal" })).toHaveAttribute(
    "href",
    `/ledger/${ledgerId}/journal`,
  );
  expect(screen.getByRole("link", { name: "Import" })).toHaveAttribute(
    "href",
    `/ledger/${ledgerId}/import`,
  );
  expectPageHeading();
}

describe.each(["settings", "connections"] as const)("Plaid %s page", (page) => {
  it("retries a 502 from the sign-in probe in place without requesting bank data first", async () => {
    const user = userEvent.setup();
    const fixture = await mountPage(page, { startOnJournal: true });
    access.authUnavailable = true;
    access.authenticated = false;
    await act(async () => fixture.router.navigate({ to: fixture.path }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "The service is temporarily unavailable",
    );
    expect(screen.queryByText(notice)).toBeNull();
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
    expect(fixture.requests).toEqual([]);

    access.authUnavailable = false;
    access.authenticated = true;
    await user.click(screen.getByRole("button", { name: "Try Again" }));
    await fixture.completeItems();
    expect(
      await screen.findByRole("button", {
        name: page === "settings" ? "Get Started" : "Connect Bank",
      }),
    ).toBeEnabled();
    expect(fixture.router.state.location.pathname).toBe(fixture.path);
    expect(fixture.itemRequests()).toHaveLength(1);
  });
  it.each<{ name: string; permissions: Permissions; authenticated?: boolean }>([
    { name: "reader", permissions: { admin: false, pull: true, push: false } },
    {
      name: "collaborator with write access",
      permissions: { admin: false, pull: true, push: true },
    },
    { name: "unresolved permission", permissions: null },
    {
      name: "signed-out viewer with stale admin metadata",
      permissions: { admin: true, pull: true, push: true },
      authenticated: false,
    },
  ])(
    "does not request bank items for $name",
    async ({ permissions, authenticated = true }) => {
      access.permissions = permissions;
      access.authenticated = authenticated;
      const f = await mountPage(page);
      expect(f.requests).toEqual([]);
      expectAccessNotice();
    },
  );

  it("keeps the heading during the real admin query and empty onboarding", async () => {
    const f = await mountPage(page);
    await waitFor(() => expect(f.itemRequests()).toHaveLength(1));
    expect(f.itemRequests()[0].variables).toEqual({ ledgerId });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expectPageHeading();
    await f.completeItems();
    if (page === "settings") {
      expect(
        await screen.findByRole("button", { name: "Get Started" }),
      ).toBeEnabled();
      expect(
        screen.getByRole("heading", { level: 2, name: "Connect an Account" }),
      ).toBeInTheDocument();
    } else {
      expect(
        await screen.findByRole("button", { name: "Connect Bank" }),
      ).toBeEnabled();
      expect(screen.getByText("No Banks Connected")).toBeInTheDocument();
    }
    expectPageHeading();
    expect(f.itemRequests()).toHaveLength(1);
  });

  it.each(["FORBIDDEN", "UNAUTHENTICATED"])(
    "shows the access notice for an actual Apollo %s response",
    async (code) => {
      const f = await mountPage(page);
      await waitFor(() => expect(f.itemRequests()).toHaveLength(1));
      await act(async () => f.itemRequests()[0].deny(code));
      await screen.findByRole("status");
      expectAccessNotice();
      expect(f.itemRequests()).toHaveLength(1);
    },
  );

  it("keeps Retry for a network failure and refetches successfully", async () => {
    const f = await mountPage(page);
    await waitFor(() => expect(f.itemRequests()).toHaveLength(1));
    await act(async () => f.itemRequests()[0].fail());
    expect(await screen.findByText("Failed to Load Data")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expectPageHeading();
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    await waitFor(() => expect(f.itemRequests()).toHaveLength(2));
    expect(f.itemRequests()[1].variables).toEqual({ ledgerId });
    await f.completeItems();
    expect(
      await screen.findByRole("button", {
        name: page === "settings" ? "Get Started" : "Connect Bank",
      }),
    ).toBeEnabled();
    expect(screen.queryByText("Failed to Load Data")).not.toBeInTheDocument();
    expectPageHeading();
  });

  it("preserves administrator bank management and transaction review", async () => {
    const f = await mountPage(page);
    await f.completeItems([item]);
    if (page === "settings") {
      expect(
        await screen.findByText(transaction.merchantName!),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { level: 2, name: "Bank Transactions" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Manage Banks" }),
      ).toHaveAttribute("href", `/ledger/${ledgerId}/plaid-connections`);
      await userEvent.click(screen.getByRole("button", { name: "Sync" }));
      await waitFor(() =>
        expect(
          f.requests.find(({ name }) => name === "SyncPlaidTransactions"),
        ).toMatchObject({ variables: { ledgerId, itemId: item.id } }),
      );
      await waitFor(() => expect(f.itemRequests()).toHaveLength(2));
      await f.completeItems([item]);
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Sync" })).toBeEnabled(),
      );
    } else {
      expect(
        await screen.findByRole("region", { name: item.institutionName }),
      ).toHaveTextContent(`${item.id} — ${ledgerId}`);
      expect(
        screen.getByRole("button", { name: "Connect Another Bank" }),
      ).toBeEnabled();
      expect(
        screen.getByRole("link", { name: "Connected Accounts" }),
      ).toHaveAttribute("href", `/ledger/${ledgerId}/link`);
    }
    expectPageHeading();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    const user = userEvent.setup();
    const link = screen.getByRole("link", {
      name: page === "settings" ? "Manage Banks" : "Connected Accounts",
    });
    expect(link.querySelector("button")).toBeNull();
    if (page === "settings") {
      screen.getByRole("button", { name: "Sync" }).focus();
      await user.tab();
    } else {
      screen.getByRole("button", { name: "Connect Another Bank" }).focus();
      await user.tab({ shift: true });
    }
    expect(link).toHaveFocus();
    await user.keyboard("{Enter}");
    await waitFor(() =>
      expect(f.router.state.location.pathname).toBe(
        `/ledger/${ledgerId}/${page === "settings" ? "plaid-connections" : "link"}`,
      ),
    );
  });
});
