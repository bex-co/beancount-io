import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Link,
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  retainSearchParams,
  useRouterState,
} from "@tanstack/react-router";
import { afterEach, describe, expect, it } from "vitest";
import {
  clearLedgerFilterSearch,
  ledgerFilterSearchSchema,
} from "@/common/lib/ledger-search-params";
import { LedgerSearchParamsProvider } from "@/common/providers/ledger-search-params-provider";
import { useLedgerSearchParams } from "@/common/providers/ledger-search-params-provider/use-ledger-search-params";

function FilterControls() {
  const { searchParams, setSearchParams } = useLedgerSearchParams();
  const href = useRouterState({ select: (s) => s.location.href });

  return (
    <div>
      <div data-testid="href">{href}</div>
      <div data-testid="time">{searchParams.time}</div>
      <div data-testid="account">{searchParams.account}</div>
      <div data-testid="filter">{searchParams.filter}</div>
      <button
        type="button"
        onClick={() => setSearchParams({ ...searchParams, time: "2017-09" })}
      >
        set-time-2017
      </button>
      <button
        type="button"
        onClick={() =>
          setSearchParams({
            account: "",
            filter: "",
            time: "",
          })
        }
      >
        clear-all
      </button>
      <Link
        to="/ledger/$ledgerOwner/$ledgerName/balance-sheet"
        params={{ ledgerOwner: "open_ledger", ledgerName: "example" }}
      >
        related-balance-sheet
      </Link>
      <Link
        to="/ledger/$ledgerOwner/$ledgerName/journal"
        params={{ ledgerOwner: "other", ledgerName: "books" }}
        search={(prev) =>
          clearLedgerFilterSearch(
            prev as Record<string, unknown>,
          ) as typeof prev
        }
      >
        switch-ledger
      </Link>
      <Outlet />
    </div>
  );
}

function JournalPage() {
  return <div data-testid="page">journal</div>;
}

function BalanceSheetPage() {
  return <div data-testid="page">balance-sheet</div>;
}

async function mountAt(initialEntry: string) {
  cleanup();

  const rootRoute = createRootRoute({
    component: () => <Outlet />,
  });

  const ledgerRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/ledger/$ledgerOwner/$ledgerName",
    validateSearch: (search) => ledgerFilterSearchSchema.parse(search),
    search: {
      middlewares: [retainSearchParams(["account", "filter", "time"])],
    },
    component: () => (
      <LedgerSearchParamsProvider>
        <FilterControls />
      </LedgerSearchParamsProvider>
    ),
  });

  const journalRoute = createRoute({
    getParentRoute: () => ledgerRoute,
    path: "/journal",
    component: JournalPage,
  });

  const balanceSheetRoute = createRoute({
    getParentRoute: () => ledgerRoute,
    path: "/balance-sheet",
    component: BalanceSheetPage,
  });

  const routeTree = rootRoute.addChildren([
    ledgerRoute.addChildren([journalRoute, balanceSheetRoute]),
  ]);

  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  });

  await router.load();

  render(<RouterProvider router={router} />);

  await waitFor(() => {
    expect(screen.getByTestId("href")).toBeInTheDocument();
  });

  return router;
}

afterEach(() => {
  cleanup();
});

describe("ledger filter navigation and history", () => {
  it("retains time across Related Pages navigation and after reload-equivalent remount", async () => {
    const user = userEvent.setup();
    const router = await mountAt(
      "/ledger/open_ledger/example/journal?time=2016",
    );

    expect(screen.getByTestId("time")).toHaveTextContent("2016");
    expect(screen.getByTestId("href").textContent).toMatch(
      /[?&]time=2016(?:&|$)/,
    );

    await user.click(screen.getByText("related-balance-sheet"));

    await waitFor(() => {
      expect(screen.getByTestId("page")).toHaveTextContent("balance-sheet");
    });
    expect(screen.getByTestId("time")).toHaveTextContent("2016");
    expect(screen.getByTestId("href").textContent).toMatch(
      /[?&]time=2016(?:&|$)/,
    );
    expect(router.state.location.search).toMatchObject({ time: 2016 });

    // Simulate opening the destination URL in a new tab / hard reload.
    const destination = router.state.location.href;
    const remounted = await mountAt(destination);
    expect(screen.getByTestId("time")).toHaveTextContent("2016");
    expect(remounted.state.location.search).toMatchObject({ time: 2016 });
  });

  it("restores filter state on Back and Forward without a reload", async () => {
    const user = userEvent.setup();
    const router = await mountAt(
      "/ledger/open_ledger/example/journal?time=2016",
    );

    await user.click(screen.getByText("related-balance-sheet"));
    await waitFor(() => {
      expect(screen.getByTestId("page")).toHaveTextContent("balance-sheet");
    });

    await user.click(screen.getByText("set-time-2017"));
    await waitFor(() => {
      expect(screen.getByTestId("time")).toHaveTextContent("2017-09");
    });

    await act(async () => {
      router.history.back();
    });

    await waitFor(() => {
      expect(screen.getByTestId("time")).toHaveTextContent("2016");
      expect(screen.getByTestId("href").textContent).toMatch(
        /[?&]time=2016(?:&|$)/,
      );
    });

    await act(async () => {
      router.history.forward();
    });

    await waitFor(() => {
      expect(screen.getByTestId("time")).toHaveTextContent("2017-09");
    });
  });

  it("clears shared filters without dropping unrelated route search state", async () => {
    const user = userEvent.setup();
    await mountAt(
      "/ledger/open_ledger/example/journal?time=2016&account=Assets:Cash",
    );

    await user.click(screen.getByText("clear-all"));

    await waitFor(() => {
      expect(screen.getByTestId("time")).toHaveTextContent("");
      expect(screen.getByTestId("account")).toHaveTextContent("");
      expect(screen.getByTestId("href").textContent).not.toMatch(/[?&]time=/);
      expect(screen.getByTestId("href").textContent).not.toMatch(
        /[?&]account=/,
      );
    });
  });

  it("accepts standard and double-encoded percent filters without crashing", async () => {
    await mountAt(
      "/ledger/open_ledger/example/journal?filter=payee%3A%22100%25%22",
    );
    expect(screen.getByTestId("filter")).toHaveTextContent('payee:"100%"');

    await mountAt(
      "/ledger/open_ledger/example/journal?filter=payee%253A%2522100%2525%2522",
    );
    expect(screen.getByTestId("filter")).toHaveTextContent('payee:"100%"');
  });

  it("resets filters when switching ledgers", async () => {
    const user = userEvent.setup();
    const router = await mountAt(
      "/ledger/open_ledger/example/journal?time=2016",
    );

    await user.click(screen.getByText("switch-ledger"));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(
        "/ledger/other/books/journal",
      );
      expect(screen.getByTestId("time")).toHaveTextContent("");
      expect(screen.getByTestId("href").textContent).not.toMatch(/[?&]time=/);
    });
  });
});
