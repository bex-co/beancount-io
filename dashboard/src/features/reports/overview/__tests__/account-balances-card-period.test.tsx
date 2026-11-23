import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
import { MoneyMovementSection } from "../components/money-movement-section";

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerData: { options: { renderCommas: true } } }),
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
async function renderCard(
  time?: string,
  urlTime: string | null = time ?? null,
  showMovement = false,
) {
  const root = createRootRoute({ component: () => <Outlet /> });
  const ledger = createRoute({
    getParentRoute: () => root,
    path: "/ledger/$ledgerOwner/$ledgerName",
    search: {
      middlewares: [retainSearchParams(["account", "filter", "time"])],
    },
    component: () => <Outlet />,
  });
  const overview = createRoute({
    getParentRoute: () => ledger,
    path: "/",
    component: () => (
      <>
        <AccountBalancesCard
          assets={assets}
          primaryCurrency="USD"
          invertLiabilities={false}
          ledgerOwner="alice"
          ledgerName="books"
          time={time}
        />
        {showMovement && (
          <MoneyMovementSection
            ledgerOwner="alice"
            ledgerName="books"
            primaryCurrency="USD"
            income={[]}
            expenses={[
              {
                date: "2026-07-31",
                balance: { USD: "1200.00" },
                accountBalances: {
                  "Expenses:Housing:Rent": { USD: "1200.00" },
                },
              },
            ]}
            dates={["2026-07-31"]}
            selectedDate="2026-07-31"
            onSelectDate={() => {}}
            timeFilter="2026-07"
            dataThrough="2026-07-31"
            history={false}
          />
        )}
      </>
    ),
  });
  const leaves = ["accounts", "balance-sheet", "account/$accountName"].map(
    (path) =>
      createRoute({
        getParentRoute: () => ledger,
        path,
        component: () => null,
      }),
  );
  const router = createRouter({
    routeTree: root.addChildren([ledger.addChildren([overview, ...leaves])]),
    history: createMemoryHistory({
      initialEntries: [
        `/ledger/alice/books/${urlTime ? `?time=${urlTime}` : ""}${showMovement ? "&account=Assets&filter=sample" : ""}`,
      ],
    }),
  });
  await act(async () => {
    await router.load();
  });
  render(<RouterProvider router={router} />);
  await screen.findByText("Accounts");
  return router;
}

describe("Overview Accounts card under a Time filter (w3/568)", () => {
  it("links Money movement to the selected month and keeps account and filter", async () => {
    const router = await renderCard("2026-01", "2026-01", true);
    const link = screen.getByRole("link", { name: /Expenses:Housing:Rent/ });
    const url =
      "/ledger/alice/books/account/Expenses%3AHousing%3ARent?time=2026-07&account=Assets&filter=sample";
    expect(link).toHaveAttribute("href", url);
    await userEvent.click(link);
    await waitFor(() => expect(router.state.location.href).toBe(url));
  });

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
    expect(
      screen.getByRole("link", { name: /Assets:Checking/ }),
    ).toHaveAttribute(
      "href",
      "/ledger/alice/books/account/Assets%3AChecking?time=2026-07",
    );
  });

  it("speaks of the period end when a relative filter has no fixed date", async () => {
    await renderCard("month");

    expect(
      screen.getByText(
        "Asset and liability balances at the end of the selected period",
      ),
    ).toBeInTheDocument();
  });

  it("carries the stepped month the card names, with no URL filter (w5/1147)", async () => {
    // The stepper keeps the month in component state, not in the URL, so
    // the card's own `time` is the only thing that can carry it onward.
    await renderCard("2026-05", null);

    expect(
      screen.getByRole("link", {
        name: "Open the balance sheet for this period",
      }),
    ).toHaveAttribute("href", "/ledger/alice/books/balance-sheet?time=2026-05");
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
