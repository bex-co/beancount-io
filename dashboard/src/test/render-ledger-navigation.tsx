import type { ReactNode } from "react";
import { render } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  retainSearchParams,
  RouterProvider,
} from "@tanstack/react-router";

/** Renders a navigation control inside a ledger with the real shared search middleware. */
export async function renderLedgerNavigation(
  content: ReactNode,
  source = "accounts",
  search = "",
) {
  const root = createRootRoute({ component: Outlet });
  const ledger = createRoute({
    getParentRoute: () => root,
    path: "/ledger/$ledgerOwner/$ledgerName",
    search: {
      middlewares: [retainSearchParams(["account", "filter", "time"])],
    },
    component: Outlet,
  });
  const sourceRoute = createRoute({
    getParentRoute: () => ledger,
    path: source,
    component: () => content,
  });
  const destinations = [
    "account/$accountName",
    "files/tree/$branch/$",
    "files/blob/$branch/$",
  ].map((path) => createRoute({ getParentRoute: () => ledger, path }));
  const router = createRouter({
    routeTree: root.addChildren([
      ledger.addChildren([sourceRoute, ...destinations]),
    ]),
    history: createMemoryHistory({
      initialEntries: [`/ledger/alice/books/${source}${search}`],
    }),
    isServer: false,
  });
  await router.load();
  return { ...render(<RouterProvider router={router} />), router };
}
