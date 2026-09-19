import { act, cleanup } from "@testing-library/react";
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
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
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

type ReportData = { netWorth: string; rows: [string, string][] };

/** Stands in for the overview's populated server-rendered sections. */
function Overview() {
  const { netWorth } = useLoaderData({ strict: false }) as ReportData;
  const { searchParams } = useLedgerSearchParams();
  return (
    <div className="space-y-4">
      <section aria-labelledby="financial-position">
        <h2 id="financial-position">Financial position</h2>
        <output aria-label="Net Worth">{netWorth}</output>
      </section>
      <section aria-labelledby="money-movement">
        <h2 id="money-movement">Money movement</h2>
      </section>
      <section aria-labelledby="recent-activity">
        <h2 id="recent-activity">Recent activity</h2>
      </section>
      <p data-testid="overview-time">{searchParams.time}</p>
    </div>
  );
}

/** Stands in for a populated Income Statement table. */
function IncomeStatement() {
  const { rows } = useLoaderData({ strict: false }) as ReportData;
  const { searchParams } = useLedgerSearchParams();
  return (
    <div className="space-y-4">
      <table>
        <caption>Income Statement</caption>
        <tbody>
          {rows.map(([account, amount]) => (
            <tr key={account}>
              <th scope="row">{account}</th>
              <td>{amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p data-testid="statement-time">{searchParams.time}</p>
    </div>
  );
}

const REPORT: ReportData = {
  netWorth: "61,963.25 USD",
  rows: [
    ["Income", "-637,334 MUSD"],
    ["OtherNet", "-572 MUSD"],
    ["Revenue", "-636,762 MUSD"],
  ],
};

function buildRouter(initialEntry: string) {
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
  const overview = createRoute({
    getParentRoute: () => ledgerRoute,
    path: "/",
    loaderDeps: ({ search }) => ledgerFilterLoaderDeps(search),
    loader: () => REPORT,
    shouldReload: true,
    component: Overview,
  });
  const incomeStatement = createRoute({
    getParentRoute: () => ledgerRoute,
    path: "/income-statement",
    loaderDeps: ({ search }) => ledgerFilterLoaderDeps(search),
    loader: () => REPORT,
    shouldReload: true,
    component: IncomeStatement,
  });

  return createRouter({
    routeTree: rootRoute.addChildren([
      ledgerRoute.addChildren([overview, incomeStatement]),
    ]),
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
    // Hold the router's own delayed fallback out of the observation: this test
    // watches the ledger boundary during the first client render.
    defaultPendingMs: Infinity,
    defaultStaleReloadMode: "blocking",
  });
}

/**
 * Render the URL on a server router, then hydrate the same markup with a
 * client router that is still ingesting its matches — the state the router
 * reports for an initial load, and the one that replaced the server's report
 * with a loading card before this boundary compared scopes.
 */
async function hydrateAt(url: string) {
  const serverRouter = buildRouter(url);
  await serverRouter.load();
  const container = document.createElement("div");
  document.body.appendChild(container);
  container.innerHTML = renderToString(
    <RouterProvider router={serverRouter} />,
  );

  const clientRouter = buildRouter(url);
  await clientRouter.load();
  act(() => {
    clientRouter.__store.setState((state) => ({
      ...state,
      isLoading: true,
      status: "pending",
      // A server-rendered first load has no resolved location yet, and the
      // ingested matches are equivalent copies rather than the same objects.
      resolvedLocation: undefined,
      pendingMatches: state.matches.map((match) => ({
        ...match,
        pathname: `${match.pathname.replace(/\/$/, "")}/`,
      })),
    }));
  });

  const onRecoverableError = vi.fn();
  const root = hydrateRoot(
    container,
    <RouterProvider router={clientRouter} />,
    {
      onRecoverableError,
    },
  );

  return {
    container,
    onRecoverableError,
    async settle() {
      await act(async () => {});
    },
    async dispose() {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

const SPACES = [
  { name: "percent-space", space: "%20" },
  { name: "plus-space", space: "+" },
];

afterEach(cleanup);

describe("LedgerLayout hydration with real route loaders", () => {
  it.each(SPACES)(
    "keeps the populated overview nodes through hydration of a $name date range",
    async ({ space }) => {
      const { container, onRecoverableError, settle, dispose } =
        await hydrateAt(
          `/ledger/alice/books?time=2026-02-01${space}-${space}2026-03-31`,
        );

      const headings = [
        "financial-position",
        "money-movement",
        "recent-activity",
      ].map((id) => {
        const node = container.querySelector(`#${id}`);
        expect(node).not.toBeNull();
        return node!;
      });
      const netWorth = container.querySelector('[aria-label="Net Worth"]')!;
      expect(netWorth.textContent).toBe(REPORT.netWorth);

      try {
        await settle();

        for (const heading of headings) {
          expect(heading.isConnected).toBe(true);
          expect(container.contains(heading)).toBe(true);
        }
        expect(netWorth.isConnected).toBe(true);
        expect(netWorth.textContent).toBe(REPORT.netWorth);
        expect(
          container.querySelector('[data-testid="overview-time"]')!.textContent,
        ).toBe("2026-02-01 - 2026-03-31");
        expect(onRecoverableError).not.toHaveBeenCalled();
        expect(container.querySelector('[role="status"]')).toBeNull();
        expect(
          container.querySelector("main")!.getAttribute("aria-busy"),
        ).toBeNull();
      } finally {
        await dispose();
      }
    },
  );

  it.each(SPACES)(
    "keeps the populated Income Statement table through hydration of a $name date range",
    async ({ space }) => {
      const { container, onRecoverableError, settle, dispose } =
        await hydrateAt(
          `/ledger/alice/books/income-statement?time=2025-09${space}-${space}2026-06`,
        );

      const table = container.querySelector("table")!;
      expect(table).not.toBeNull();
      const amounts = () =>
        Array.from(table.querySelectorAll("td")).map(
          (cell) => cell.textContent,
        );
      expect(amounts()).toEqual(REPORT.rows.map(([, amount]) => amount));

      try {
        await settle();

        expect(table.isConnected).toBe(true);
        expect(container.contains(table)).toBe(true);
        expect(container.querySelector("table")).toBe(table);
        expect(amounts()).toEqual(REPORT.rows.map(([, amount]) => amount));
        expect(
          container.querySelector('[data-testid="statement-time"]')!
            .textContent,
        ).toBe("2025-09 - 2026-06");
        expect(onRecoverableError).not.toHaveBeenCalled();
        expect(container.querySelector('[role="status"]')).toBeNull();
        expect(
          container.querySelector("main")!.getAttribute("aria-busy"),
        ).toBeNull();
      } finally {
        await dispose();
      }
    },
  );
});
