import { act, render, screen } from "@testing-library/react";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  retainSearchParams,
} from "@tanstack/react-router";
import { describe, expect, it, vi } from "vitest";
import { AccountBalancesCard } from "../components/account-balances-card";

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerData: { options: { renderCommas: true } } }),
  useLedgerNavigateToAccount: () => vi.fn(),
}));

const assets = {
  account: "Assets",
  balance: {},
  balance_children: { USD: "4704.11" },
  children: [
    {
      account: "Assets:Checking",
      balance: { USD: "4564.11" },
      balance_children: { USD: "4564.11" },
      children: [],
      has_txns: true,
    },
  ],
  has_txns: false,
};

/** The card inside a ledger route that keeps filters, as the app's does. */
async function renderCard(time?: string) {
  const root = createRootRoute({ component: () => <Outlet /> });
  const ledger = createRoute({
    getParentRoute: () => root,
    path: "/ledger/$ledgerOwner/$ledgerName",
    validateSearch: (search: Record<string, unknown>) => ({
      time: typeof search.time === "string" ? search.time : undefined,
    }),
    search: { middlewares: [retainSearchParams(["time"])] },
    component: () => <Outlet />,
  });
  const overview = createRoute({
    getParentRoute: () => ledger,
    path: "/",
    component: () => (
      <AccountBalancesCard
        assets={assets}
        primaryCurrency="USD"
        invertLiabilities={false}
        ledgerOwner="alice"
        ledgerName="books"
        time={time}
      />
    ),
  });
  const leaves = ["accounts", "balance-sheet"].map((path) =>
    createRoute({ getParentRoute: () => ledger, path, component: () => null }),
  );
  const router = createRouter({
    routeTree: root.addChildren([ledger.addChildren([overview, ...leaves])]),
    history: createMemoryHistory({
      initialEntries: [`/ledger/alice/books/${time ? `?time=${time}` : ""}`],
    }),
  });
  await act(async () => {
    await router.load();
  });
  render(<RouterProvider router={router} />);
  return screen.findByText("Accounts");
}

describe("Overview Accounts card under a Time filter (w3/568)", () => {
  it("names the period end and drills into that period's Balance Sheet", async () => {
    await renderCard("2026-07");

    expect(
      screen.getByText("Asset and liability balances at July 31, 2026"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "Open the balance sheet for this period",
      }),
    ).toHaveAttribute("href", "/ledger/alice/books/balance-sheet?time=2026-07");
  });

  it("speaks of the period end when a relative filter has no fixed date", async () => {
    await renderCard("month");

    expect(
      screen.getByText(
        "Asset and liability balances at the end of the selected period",
      ),
    ).toBeInTheDocument();
  });

  it("keeps current balances and the Accounts link without a filter", async () => {
    await renderCard();

    // Today's balances need no caption; only a period is named.
    expect(
      screen.queryByText(/Asset and liability balances at/),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View all accounts" }),
    ).toHaveAttribute("href", "/ledger/alice/books/accounts");
  });
});
