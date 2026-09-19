/**
 * Login continuations against a real router.
 *
 * The defect these cover was not in validating a `next` string but in building
 * one: the parsed `hash` has had its `#` sliced off, so producers that
 * reassembled `pathname + searchStr + hash` glued the fragment onto the query.
 * A test that hands a ready-made string to the producer cannot see that, so
 * every case here drives an actual TanStack router — memory history, real
 * route tree, real parser — and reads the `next` that reached `/auth/login`.
 */
import { describe, expect, it, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { requireAuth } from "../auth";
import { useLoginNextPath } from "@/common/hooks/use-login-next-path";

afterEach(cleanup);

/**
 * A route tree with the two ways a visitor reaches login: a guest action on a
 * public page that asks for the return path itself, and a guarded route that
 * redirects before rendering.
 */
function buildRouter(initialEntry: string, { signedIn = false } = {}) {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });

  const publicRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/ledger/$ledgerOwner/$ledgerName",
    validateSearch: (search: Record<string, unknown>) => search,
    component: function PublicRoute() {
      // What Star and Follow put in their login link.
      return <output data-testid="next">{useLoginNextPath() ?? ""}</output>;
    },
  });

  const guardedRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/settings",
    validateSearch: (search: Record<string, unknown>) => search,
    beforeLoad: requireAuth("/ledger"),
    component: () => <div data-testid="settings" />,
  });

  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/auth/login",
    validateSearch: (search: Record<string, unknown>) => search,
    component: function LoginRoute() {
      const search = loginRoute.useSearch() as { next?: string };
      return <output data-testid="login-next">{search.next ?? ""}</output>;
    },
  });

  const router = createRouter({
    routeTree: rootRoute.addChildren([publicRoute, guardedRoute, loginRoute]),
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
    context: { userProfile: signedIn ? { id: "u1" } : null },
  });
  return router;
}

/** Mount at `entry` and return the continuation the page would send. */
async function continuationFrom(entry: string) {
  const router = buildRouter(entry);
  render(<RouterProvider router={router as never} />);
  const output = await screen.findByTestId("next");
  await waitFor(() => expect(output.textContent).not.toBe(""));
  return output.textContent;
}

/** Mount a guarded route at `entry` and return the `next` login received. */
async function guardedNextFrom(entry: string) {
  const router = buildRouter(entry);
  render(<RouterProvider router={router as never} />);
  const output = await screen.findByTestId("login-next");
  return output.textContent;
}

describe("login continuations built from a real router location", () => {
  it("keeps the query and the fragment apart", async () => {
    expect(
      await continuationFrom("/ledger/open_ledger/example?time=2016#overview"),
    ).toBe("/ledger/open_ledger/example?time=2016#overview");
  });

  it("keeps a fragment that arrives without a query", async () => {
    expect(
      await continuationFrom("/ledger/open_ledger/example#collection"),
    ).toBe("/ledger/open_ledger/example#collection");
  });

  it("leaves a plain path alone", async () => {
    expect(await continuationFrom("/ledger/open_ledger/example")).toBe(
      "/ledger/open_ledger/example",
    );
  });

  it("leaves a query-only destination alone", async () => {
    expect(
      await continuationFrom("/ledger/open_ledger/example?time=2016"),
    ).toBe("/ledger/open_ledger/example?time=2016");
  });

  it("preserves an encoded fragment rather than decoding it into the URL", async () => {
    const next = await continuationFrom(
      "/ledger/open_ledger/example#a%20b%26c",
    );
    expect(next).toContain("#");
    // Whatever the encoding, the fragment must still parse back to itself and
    // must not have leaked its "&" into the query.
    const url = new URL(next as string, "https://example.test");
    expect(decodeURIComponent(url.hash.slice(1))).toBe("a b&c");
    expect(url.search).toBe("");
  });

  it("does not invent a delimiter for an empty fragment", async () => {
    expect(
      await continuationFrom("/ledger/open_ledger/example?time=2016#"),
    ).toBe("/ledger/open_ledger/example?time=2016");
  });

  it("sends a guarded route's query and fragment to login", async () => {
    expect(await guardedNextFrom("/settings?lang=en#profile")).toBe(
      "/settings?lang=en#profile",
    );
  });

  it("still sends a guarded plain path", async () => {
    expect(await guardedNextFrom("/settings")).toBe("/settings");
  });

  it("lets a signed-in visitor through the guard", async () => {
    const router = buildRouter("/settings?lang=en#profile", { signedIn: true });
    render(<RouterProvider router={router as never} />);
    expect(await screen.findByTestId("settings")).toBeInTheDocument();
  });
});
