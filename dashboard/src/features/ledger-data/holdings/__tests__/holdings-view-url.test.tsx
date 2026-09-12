import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ledgerFilterSearchSchema } from "@/common/lib/ledger-search-params";
import LedgerHoldingsPage from "../index";
import { holdingsSearchSchema } from "../search";

vi.mock("../holdings-table", () => ({
  DatasetTable: ({ query }: { query: string }) => (
    <div data-testid="dataset-table">{query}</div>
  ),
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerName: "My books" }),
}));

vi.mock("@/common/components/related-links", () => ({
  RelatedLinks: () => null,
}));

const TAB_LABELS = {
  holdings: "Holdings",
  "by-account": "Holdings by Account",
  "by-currency": "Holdings by Currency",
  "by-cost-currency": "Holdings by Cost Currency",
} as const;

function buildRouter(initialEntry: string) {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const ledgerRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/ledger/$ledgerOwner/$ledgerName",
    validateSearch: (search) => ledgerFilterSearchSchema.parse(search),
    component: () => <Outlet />,
  });
  const holdingsRoute = createRoute({
    getParentRoute: () => ledgerRoute,
    path: "/holdings",
    validateSearch: (search) => holdingsSearchSchema.parse(search),
    component: LedgerHoldingsPage,
  });
  const accountRoute = createRoute({
    getParentRoute: () => ledgerRoute,
    path: "/account/$accountName",
    component: () => <div data-testid="account-page">account detail</div>,
  });

  return createRouter({
    routeTree: rootRoute.addChildren([
      ledgerRoute.addChildren([holdingsRoute, accountRoute]),
    ]),
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  });
}

async function mountAt(initialEntry: string) {
  cleanup();
  const router = buildRouter(initialEntry);
  await router.load();
  render(<RouterProvider router={router} />);
  await waitFor(() => {
    expect(screen.getByTestId("dataset-table")).toBeInTheDocument();
  });
  return router;
}

function activeTab() {
  return screen
    .getAllByRole("tab")
    .find((tab) => tab.getAttribute("aria-selected") === "true")?.textContent;
}

/** Drills into an account the way a holdings row link would. */
async function openAccount(router: ReturnType<typeof buildRouter>) {
  await act(async () => {
    await router.navigate({
      to: "/ledger/$ledgerOwner/$ledgerName/account/$accountName",
      params: {
        ledgerOwner: "alice",
        ledgerName: "books",
        accountName: "Assets:Brokerage",
      },
    });
  });
  await waitFor(() => {
    expect(screen.getByTestId("account-page")).toBeInTheDocument();
  });
}

afterEach(() => {
  cleanup();
});

describe("holdings grouping in the URL", () => {
  it("defaults to the holdings grouping", async () => {
    await mountAt("/ledger/alice/books/holdings");
    expect(activeTab()).toBe(TAB_LABELS.holdings);
  });

  it("restores the selected grouping after an account drill-down and Back, then Forward", async () => {
    const user = userEvent.setup();
    const router = await mountAt("/ledger/alice/books/holdings");

    await user.click(
      screen.getByRole("tab", { name: TAB_LABELS["by-currency"] }),
    );
    await waitFor(() => {
      expect(router.state.location.search).toMatchObject({
        view: "by-currency",
      });
    });
    expect(activeTab()).toBe(TAB_LABELS["by-currency"]);

    await openAccount(router);

    await act(async () => {
      router.history.back();
    });
    await waitFor(() => {
      expect(screen.getByTestId("dataset-table")).toBeInTheDocument();
    });
    expect(activeTab()).toBe(TAB_LABELS["by-currency"]);

    await act(async () => {
      router.history.forward();
    });
    await waitFor(() => {
      expect(screen.getByTestId("account-page")).toBeInTheDocument();
    });
  });

  it("restores every grouping from a reloaded URL", async () => {
    for (const [view, label] of Object.entries(TAB_LABELS)) {
      await mountAt(`/ledger/alice/books/holdings?view=${view}`);
      expect(activeTab()).toBe(label);
    }
  });

  it("switches groupings without stacking history entries, and a rerender adds none", async () => {
    const user = userEvent.setup();
    const router = await mountAt("/ledger/alice/books/holdings");
    const startLength = router.history.length;

    await user.click(
      screen.getByRole("tab", { name: TAB_LABELS["by-account"] }),
    );
    await waitFor(() => {
      expect(activeTab()).toBe(TAB_LABELS["by-account"]);
    });
    await user.click(
      screen.getByRole("tab", { name: TAB_LABELS["by-cost-currency"] }),
    );
    await waitFor(() => {
      expect(activeTab()).toBe(TAB_LABELS["by-cost-currency"]);
    });
    expect(router.history.length).toBe(startLength);

    // Re-selecting the active grouping is a no-op, not a navigation.
    const locationKey = router.state.location.state.key;
    await user.click(
      screen.getByRole("tab", { name: TAB_LABELS["by-cost-currency"] }),
    );
    expect(router.history.length).toBe(startLength);
    expect(router.state.location.state.key).toBe(locationKey);
  });

  it("coerces an unknown or malformed grouping to the default", async () => {
    await mountAt("/ledger/alice/books/holdings?view=by-sunshine");
    expect(activeTab()).toBe(TAB_LABELS.holdings);

    await mountAt(
      `/ledger/alice/books/holdings?view=${encodeURIComponent('["by-account"]')}`,
    );
    expect(activeTab()).toBe(TAB_LABELS.holdings);

    await mountAt("/ledger/alice/books/holdings?view=");
    expect(activeTab()).toBe(TAB_LABELS.holdings);
  });
});
