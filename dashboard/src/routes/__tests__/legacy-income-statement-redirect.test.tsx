import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Link,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { afterEach, describe, expect, it } from "vitest";
import type { RouterContext } from "@/common/types/router-context";
import { createLocalization } from "@/i18n/init";
import { Route as LegacyRoute } from "../ledger.0.income_statement";

const legacyPath = "/ledger/0/income_statement";
const ledger = (id: string) => ({
  __typename: "Ledger",
  id,
  name: id.split("/").at(-1),
  fullName: id,
  updatedAt: "2026-10-01T00:00:00Z",
  createdAt: "2026-01-01T00:00:00Z",
  sshUrl: `ssh://example.test/${id}`,
  httpUrl: `https://example.test/${id}`,
  size: 1,
  empty: false,
  private: false,
  description: null,
  permissions: null,
});
const signedInUser: NonNullable<RouterContext["userProfile"]> = {
  __typename: "UserProfileResponse",
  id: "fixture",
  username: "alice",
  email: "alice@example.test",
  firstName: "Alice",
  lastName: "Example",
  defaultCurrency: "USD",
  locale: "en",
  emailReportStatus: null,
  tier: "FREE",
  hasEverSubscribed: false,
  limits: {
    __typename: "UserLimits",
    ledgersUsed: 2,
    ledgersMax: 3,
    collaboratorsPerLedgerMax: 2,
    maxDirectives: 1000,
  },
};

const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.stop());
});

async function setup({
  owned = [ledger("alice/books"), ledger("alice/second")],
  available = [ledger("shared/books")],
  initialPath = "/ledger",
  loadOverview,
}: {
  owned?: ReturnType<typeof ledger>[];
  available?: ReturnType<typeof ledger>[];
  initialPath?: string;
  loadOverview?: () => Promise<void>;
} = {}) {
  const requests: string[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          const { operationName } = operation;
          requests.push(operationName);
          observer.next({
            data:
              operationName === "ListUserOwnedLedgers"
                ? { listUserOwnedLedgers: owned }
                : { listLedgers: available },
          });
          observer.complete();
        }),
    ),
  });
  clients.push(client);
  const root = createRootRouteWithContext<RouterContext>()({
    component: () => (
      <ApolloProvider client={client}>
        <Outlet />
      </ApolloProvider>
    ),
  });
  const previous = createRoute({
    getParentRoute: () => root,
    path: "/before",
    component: () => (
      <>
        <h1>Previous page</h1>
        <Link to={legacyPath}>Old link</Link>
      </>
    ),
  });
  const list = createRoute({
    getParentRoute: () => root,
    path: "/ledger",
    component: () => (
      <>
        <h1>Ledger list</h1>
        <Link to={legacyPath}>Old link</Link>
      </>
    ),
  });
  const overview = createRoute({
    getParentRoute: () => root,
    path: "/ledger/$ledgerOwner/$ledgerName",
    loader: loadOverview,
    component: () => <h1>Ledger Overview</h1>,
  });
  const legacy = createRoute({
    ...LegacyRoute.options,
    getParentRoute: () => root,
    path: legacyPath,
  });
  const history = createMemoryHistory({ initialEntries: [initialPath] });
  const router = createRouter({
    routeTree: root.addChildren([previous, list, overview, legacy]),
    context: {
      client,
      localization: createLocalization(),
      userProfile: signedInUser,
    },
    history,
    isServer: false,
  });
  await router.load();
  render(<RouterProvider router={router} />);
  return { router, history, requests };
}

describe("legacy income statement redirect", () => {
  it("replaces the legacy entry with the first owned ledger's Overview", async () => {
    const { router, history, requests } = await setup();
    await userEvent.click(
      await screen.findByRole("link", { name: "Old link" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Ledger Overview" }),
    ).toBeVisible();
    expect(router.state.location.href).toBe("/ledger/alice/books");
    expect(requests).toEqual(["ListUserOwnedLedgers"]);
    expect(history.length).toBe(2);

    await act(async () => history.back());
    expect(
      await screen.findByRole("heading", { name: "Ledger list" }),
    ).toBeVisible();
    expect(router.state.location.href).toBe("/ledger");
  });

  it("replaces the legacy entry with the ledger list when there are no ledgers", async () => {
    const { router, history, requests } = await setup({
      owned: [],
      available: [],
      initialPath: "/before?source=old-bookmark",
    });
    await userEvent.click(
      await screen.findByRole("link", { name: "Old link" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Ledger list" }),
    ).toBeVisible();
    expect(router.state.location.href).toBe("/ledger");
    expect(requests).toEqual(["ListUserOwnedLedgers", "ListLedgers"]);
    expect(history.length).toBe(2);

    await act(async () => history.back());
    expect(
      await screen.findByRole("heading", { name: "Previous page" }),
    ).toBeVisible();
    expect(router.state.location.href).toBe("/before?source=old-bookmark");
  });

  it("returns to the previous page if Back is pressed while Overview loads", async () => {
    let finishOverview!: () => void;
    const pendingOverview = new Promise<void>((resolve) => {
      finishOverview = resolve;
    });
    const { router, history } = await setup({
      loadOverview: () => pendingOverview,
    });
    try {
      await userEvent.click(
        await screen.findByRole("link", { name: "Old link" }),
      );
      await waitFor(() =>
        expect(history.location.pathname).toBe("/ledger/alice/books"),
      );
      expect(
        screen.queryByRole("heading", { name: "Ledger Overview" }),
      ).toBeNull();
      await act(async () => history.back());
      expect(
        await screen.findByRole("heading", { name: "Ledger list" }),
      ).toBeVisible();
      expect(router.state.location.href).toBe("/ledger");
      expect(history.length).toBe(2);
    } finally {
      await act(async () => finishOverview());
    }
  });
});
