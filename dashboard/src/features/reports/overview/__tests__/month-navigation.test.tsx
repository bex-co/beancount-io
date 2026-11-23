import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
  retainSearchParams,
  RouterProvider,
} from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { ledgerFilterSearchSchema } from "@/common/lib/ledger-search-params";
import { LedgerSearchParamsProvider } from "@/common/providers/ledger-search-params-provider";
import { useOverviewMonth } from "../hooks/use-overview-month";
import { overviewSearchSchema } from "../search";

const ledgerUrl = "/ledger/demo/book";
const income = ["2025-01-31", "2025-02-28", "2025-03-31", "2025-04-30"].map(
  (date) => ({ date, balance: { USD: "-100" }, accountBalances: {} }),
);

function Overview() {
  const { dates, selectedDate, setSelectedDate, timeFilter } = useOverviewMonth(
    {
      income,
      expenses: [],
      preferActiveMonth: false,
      dataThrough: "2025-04-14",
      today: "2026-02-01",
    },
  );
  const previousDate = dates[dates.indexOf(selectedDate) - 1];
  return (
    <>
      <output aria-label="Selected month">{selectedDate}</output>
      <button
        disabled={!previousDate}
        onClick={() => setSelectedDate(previousDate)}
      >
        Previous
      </button>
      <Link
        to="/ledger/$ledgerOwner/$ledgerName/income-statement"
        params={{ ledgerOwner: "demo", ledgerName: "book" }}
        search={{ time: timeFilter }}
      >
        Income Statement
      </Link>
    </>
  );
}

async function renderOverview(url: string) {
  const root = createRootRoute({ component: Outlet });
  const ledger = createRoute({
    getParentRoute: () => root,
    path: "/ledger/$ledgerOwner/$ledgerName",
    validateSearch: (search) => ledgerFilterSearchSchema.parse(search),
    search: {
      middlewares: [retainSearchParams(["account", "filter", "time"])],
    },
    component: () => (
      <LedgerSearchParamsProvider>
        <Outlet />
      </LedgerSearchParamsProvider>
    ),
  });
  const overview = createRoute({
    getParentRoute: () => ledger,
    path: "/",
    validateSearch: (search) => overviewSearchSchema.parse(search),
    component: Overview,
  });
  const report = createRoute({
    getParentRoute: () => ledger,
    path: "income-statement",
    component: () => <h1>Income Statement</h1>,
  });
  const history = createMemoryHistory({ initialEntries: [url] });
  const router = createRouter({
    routeTree: root.addChildren([ledger.addChildren([overview, report])]),
    history,
  });
  await router.load();
  return { ...render(<RouterProvider router={router} />), history, router };
}

const shownMonth = () => screen.getByLabelText("Selected month");

describe("Overview month navigation", () => {
  it.each(["2024-11", "2025-13", "unrecognized"])(
    "falls back to the opening month for month=%s",
    async (month) => {
      await renderOverview(`${ledgerUrl}?month=${month}`);
      expect(shownMonth()).toHaveTextContent("2025-03-31");
    },
  );

  it("replaces the month in place and restores it on Back and reload", async () => {
    const user = userEvent.setup();
    const { history, router, unmount } = await renderOverview(
      `${ledgerUrl}?account=Assets%3ACash&time=2025&view=table`,
    );
    expect(shownMonth()).toHaveTextContent("2025-03-31");

    const previous = screen.getByRole("button", { name: "Previous" });
    await user.click(previous);
    await user.click(previous);
    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({
        account: "Assets:Cash",
        time: 2025,
        view: "table",
        month: "2025-01",
      }),
    );
    expect(shownMonth()).toHaveTextContent("2025-01-31");
    expect(history.length).toBe(1);

    await user.click(screen.getByRole("link", { name: "Income Statement" }));
    await screen.findByRole("heading", { name: "Income Statement" });
    expect(router.state.location.search).toMatchObject({ time: "2025-01" });
    expect(history.length).toBe(2);

    act(() => history.back());
    await waitFor(() => expect(shownMonth()).toHaveTextContent("2025-01-31"));

    const bookmark = router.state.location.href;
    unmount();
    await renderOverview(bookmark);
    expect(shownMonth()).toHaveTextContent("2025-01-31");
  });
});
