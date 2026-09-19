import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  retainSearchParams,
  useLoaderData,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useLedger } from "@/common/hooks/use-ledger";
import { useLedgerSearchParams } from "@/common/hooks/use-ledger-search-params";
import {
  ledgerFilterLoaderDeps,
  ledgerFilterSearchSchema,
} from "@/common/lib/ledger-search-params";
import { LedgerLayout } from "../index";

vi.mock("@apollo/client/react", () => ({
  useQuery: (
    _query: unknown,
    { variables }: { variables: { ledgerId: string } },
  ) => ({
    data: {
      getLedger: {
        id: variables.ledgerId,
        name: variables.ledgerId,
        options: { operatingCurrency: ["USD"] },
      },
    },
    loading: false,
    error: undefined,
  }),
}));

vi.mock("@/common/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock(
  "@/common/providers/react-native-bridge-provider/react-native-bridge",
  () => ({ isReactNative: () => false }),
);
vi.mock("../ledger-sidebar", () => ({ LedgerSidebar: () => null }));
vi.mock("../ledger-layout-background-queries", () => ({
  LedgerLayoutBackgroundQueries: () => null,
}));
vi.mock("../layout-header", () => ({ LayoutHeader: () => null }));
vi.mock("@/common/components/ui/sidebar", () => ({
  SidebarProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

function Report() {
  const { amount } = useLoaderData({ strict: false }) as { amount: string };
  const { ledgerOwner, ledgerName } = useLedger();
  const { searchParams } = useLedgerSearchParams();
  return (
    <section aria-label="Report">
      <p data-testid="report-ledger">{`${ledgerOwner}/${ledgerName}`}</p>
      <p data-testid="report-filters">{JSON.stringify(searchParams)}</p>
      <output aria-label="Amount">{amount}</output>
      <button type="button">Export</button>
    </section>
  );
}

async function mountReport(initialEntry: string) {
  let settledAmount = "100 USD";
  let heldAmount: Promise<string> | undefined;
  const readReport = vi.fn(async () => ({
    amount: heldAmount ? await heldAmount : settledAmount,
  }));
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const ledgerRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/ledger/$ledgerOwner/$ledgerName",
    validateSearch: (search) => ledgerFilterSearchSchema.parse(search),
    search: {
      middlewares: [retainSearchParams(["account", "filter", "time"])],
    },
    component: LedgerLayout,
  });
  const balanceSheet = createRoute({
    getParentRoute: () => ledgerRoute,
    path: "/balance-sheet",
    loaderDeps: ({ search }) => ledgerFilterLoaderDeps(search),
    loader: readReport,
    shouldReload: true,
    component: Report,
  });
  const incomeStatement = createRoute({
    getParentRoute: () => ledgerRoute,
    path: "/income-statement",
    loaderDeps: ({ search }) => ledgerFilterLoaderDeps(search),
    loader: readReport,
    shouldReload: true,
    component: Report,
  });
  const account = createRoute({
    getParentRoute: () => ledgerRoute,
    path: "/account/$accountName",
    loaderDeps: ({ search }) => ledgerFilterLoaderDeps(search),
    loader: readReport,
    shouldReload: true,
    component: Report,
  });
  const file = createRoute({
    getParentRoute: () => ledgerRoute,
    path: "/files/blob/$branch/$",
    loaderDeps: ({ search }) => ledgerFilterLoaderDeps(search),
    loader: readReport,
    shouldReload: true,
    component: Report,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      ledgerRoute.addChildren([balanceSheet, incomeStatement, account, file]),
    ]),
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
    // Keep the router's own delayed pending fallback out of the observation:
    // this test verifies the ledger boundary while an actual loader is held.
    defaultPendingMs: Infinity,
    defaultStaleReloadMode: "blocking",
  });

  await router.load();
  render(<RouterProvider router={router} />);
  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Export" })).toBeVisible();
    expect(router.state.status).toBe("idle");
  });
  // Fully server-rendered routes hydrate matches before resolvedLocation is
  // populated. Model that state without replacing any real matched data.
  act(() => {
    router.__store.setState((state) => ({
      ...state,
      resolvedLocation: undefined,
    }));
  });

  return {
    router,
    readReport,
    holdNextRead() {
      let release!: (amount: string) => void;
      heldAmount = new Promise<string>((resolve) => {
        release = (amount) => {
          settledAmount = amount;
          heldAmount = undefined;
          resolve(amount);
        };
      });
      return release;
    },
  };
}

afterEach(cleanup);

describe("LedgerLayout scope changes with real route loaders", () => {
  it.each([
    { name: "time", destination: "?time=2016", filters: { time: "2016" } },
    {
      name: "account",
      destination: "?account=Assets%3ACash",
      filters: { account: "Assets:Cash" },
    },
    {
      name: "filter",
      destination: "?filter=payee%3A%22Cafe%22",
      filters: { filter: 'payee:"Cafe"' },
    },
    {
      name: "ledger",
      destination: "/ledger/alice/other/balance-sheet",
      filters: {},
    },
    {
      name: "report path",
      destination: "/ledger/alice/books/income-statement",
      filters: {},
    },
  ])(
    "withholds the previous amount and Export during the first $name navigation",
    async ({ destination, filters }) => {
      const initialPath = "/ledger/alice/books/balance-sheet";
      const { router, readReport, holdNextRead } =
        await mountReport(initialPath);
      const originalReport = screen.getByRole("region", { name: "Report" });
      expect(screen.getByLabelText("Amount")).toHaveTextContent("100 USD");
      expect(router.state.resolvedLocation).toBeUndefined();
      const readsBefore = readReport.mock.calls.length;
      const release = holdNextRead();
      const href = destination.startsWith("?")
        ? `${initialPath}${destination}`
        : destination;

      try {
        act(() => router.history.push(href));
        await waitFor(() => {
          expect(readReport.mock.calls.length).toBeGreaterThan(readsBefore);
          expect(router.state.isLoading).toBe(true);
          expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
        });
        expect(screen.queryByText("100 USD")).not.toBeInTheDocument();
        expect(
          screen.queryByRole("button", { name: "Export" }),
        ).not.toBeInTheDocument();
        expect(originalReport).not.toBeInTheDocument();

        await act(async () => release("200 USD"));
        await waitFor(() => {
          expect(screen.getByLabelText("Amount")).toHaveTextContent("200 USD");
          expect(router.state.isLoading).toBe(false);
        });
        expect(screen.getByRole("button", { name: "Export" })).toBeVisible();
        expect(screen.getByRole("main")).not.toHaveAttribute("aria-busy");
        expect(screen.getByTestId("report-ledger")).toHaveTextContent(
          destination.includes("/other/") ? "alice/other" : "alice/books",
        );
        expect(
          JSON.parse(screen.getByTestId("report-filters").textContent!),
        ).toEqual({
          account: "",
          filter: "",
          time: "",
          ...filters,
        });
        expect(router.state.matches.at(-1)?.pathname).toBe(href.split("?")[0]);
      } finally {
        await act(async () => release("200 USD"));
      }
    },
  );

  it.each([
    {
      path: "/ledger/alice/books/account/Assets%3ABanque%C3%89pargne",
      localSearch: "?lang=en",
    },
    {
      path: "/ledger/alice/books/files/blob/main/my%20ledger.bean",
      localSearch: "?editMode=true",
    },
  ])(
    "retains the mounted report during local navigation on encoded path $path",
    async ({ path, localSearch }) => {
      const { router, readReport, holdNextRead } = await mountReport(path);
      const report = screen.getByRole("region", { name: "Report" });
      const readsBefore = readReport.mock.calls.length;
      const release = holdNextRead();

      try {
        act(() => router.history.push(`${path}${localSearch}`));
        await waitFor(() => {
          expect(readReport.mock.calls.length).toBeGreaterThan(readsBefore);
          expect(router.state.isLoading).toBe(true);
        });
        expect(report).toBeInTheDocument();
        expect(screen.getByRole("main")).not.toHaveAttribute("aria-busy");
        expect(screen.getByRole("button", { name: "Export" })).toBeVisible();

        await act(async () => release("100 USD"));
        await waitFor(() => expect(router.state.isLoading).toBe(false));
        expect(screen.getByRole("region", { name: "Report" })).toBe(report);
        expect(screen.getByLabelText("Amount")).toHaveTextContent("100 USD");
      } finally {
        await act(async () => release("100 USD"));
      }
    },
  );

  it.each([
    { before: "%20", after: "+" },
    { before: "+", after: "%20" },
  ])(
    "retains the report through a held load when date encoding changes from $before to $after",
    async ({ before, after }) => {
      const path = "/ledger/alice/books/balance-sheet";
      const url = (space: string) =>
        `${path}?time=2026-02-01${space}-${space}2026-03-31`;
      const { router, readReport, holdNextRead } = await mountReport(
        url(before),
      );
      // Initial mounting may canonicalize %20 to +. Restore the source
      // spelling through real history before observing the held transition.
      await act(async () => router.history.replace(url(before)));
      await waitFor(() => {
        expect(router.state.location.publicHref).toBe(url(before));
        expect(router.state.isLoading).toBe(false);
      });
      const report = screen.getByRole("region", { name: "Report" });
      const exportButton = screen.getByRole("button", { name: "Export" });
      const readsBefore = readReport.mock.calls.length;
      const release = holdNextRead();

      try {
        act(() => router.history.push(url(after)));
        await waitFor(() => {
          expect(readReport.mock.calls.length).toBeGreaterThan(readsBefore);
          expect(router.state.isLoading).toBe(true);
        });
        expect(screen.getByRole("region", { name: "Report" })).toBe(report);
        expect(screen.getByRole("button", { name: "Export" })).toBe(
          exportButton,
        );
        expect(screen.getByLabelText("Amount")).toHaveTextContent("100 USD");
        expect(screen.getByRole("main")).not.toHaveAttribute("aria-busy");
        expect(
          screen.queryByRole("status", { name: "" }),
        ).not.toBeInTheDocument();

        await act(async () => release("100 USD"));
        await waitFor(() => expect(router.state.isLoading).toBe(false));
        expect(screen.getByRole("region", { name: "Report" })).toBe(report);
        expect(screen.getByRole("button", { name: "Export" })).toBe(
          exportButton,
        );
        expect(screen.getByLabelText("Amount")).toHaveTextContent("100 USD");
      } finally {
        await act(async () => release("100 USD"));
      }
    },
  );
});
