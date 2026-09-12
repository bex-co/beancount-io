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
} from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { journalActionSearchSchema } from "@/common/lib/ledger-action-search";
import { ledgerFilterSearchSchema } from "@/common/lib/ledger-search-params";
import LedgerJournalPage from "../journal-page";

const queryState = vi.hoisted(() => ({
  total: 300,
  variables: [] as { query: { offset: number; limit: number } }[],
}));

vi.mock("@apollo/client/react", () => ({
  useQuery: (
    _document: unknown,
    options: { variables: { query: { offset: number; limit: number } } },
  ) => {
    queryState.variables.push(options.variables);
    return {
      data: {
        getLedgerJournal: {
          data: Array.from({ length: 60 }, (_, index) => ({
            id: `entry-${index}`,
          })),
          total: queryState.total,
        },
      },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    };
  },
}));

const EMPTY_LEDGER_SEARCH = { searchParams: {} };
vi.mock("@/common/hooks/use-ledger-search-params", () => ({
  useLedgerSearchParams: () => EMPTY_LEDGER_SEARCH,
}));

vi.mock("@/common/hooks/use-local-storage-state", async () => {
  const { useState } = await import("react");
  return {
    useLocalStorageState: <T,>(_key: string, initial: T) =>
      useState<T>(initial),
  };
});

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerName: "My books" }),
}));

vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({ canWrite: true }),
}));

vi.mock("@/common/components/authenticated", () => ({
  Authenticated: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/common/components/related-links", () => ({
  RelatedLinks: () => null,
}));

vi.mock("@/features/journal/components/journal-filters", () => ({
  JournalFilters: ({
    onDirectiveTypesChange,
  }: {
    onDirectiveTypesChange: (types: string[]) => void;
  }) => (
    <button type="button" onClick={() => onDirectiveTypesChange(["BALANCE"])}>
      change-directive-filter
    </button>
  ),
}));

vi.mock("@/features/journal/components/journal-table", () => ({
  JournalTable: () => (
    <Link
      to="/ledger/$ledgerOwner/$ledgerName/account/$accountName"
      params={{
        ledgerOwner: "alice",
        ledgerName: "books",
        accountName: "Assets:Cash",
      }}
    >
      drill-into-account
    </Link>
  ),
}));

vi.mock("@/features/journal/components/journal-pagination", () => ({
  JournalPagination: ({
    offset,
    limit,
    setOffset,
  }: {
    offset: number;
    limit: number;
    setOffset: (value: number | ((previous: number) => number)) => void;
  }) => (
    <div>
      <span data-testid="offset">{offset}</span>
      <button
        type="button"
        onClick={() => setOffset((previous) => previous + limit)}
      >
        next-page
      </button>
    </div>
  ),
}));

vi.mock("@/features/journal/components/export-journal-button", () => ({
  ExportJournalButton: () => null,
}));

vi.mock("@/features/journal/components/entry-context-dialog", () => ({
  EntryContextDialog: () => null,
}));

vi.mock("@/features/journal/components/new-directive-dialog", () => ({
  NewDirectiveDialog: () => null,
}));

function buildRouter(initialEntry: string) {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const ledgerRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/ledger/$ledgerOwner/$ledgerName",
    validateSearch: (search) => ledgerFilterSearchSchema.parse(search),
    component: () => <Outlet />,
  });
  const journalRoute = createRoute({
    getParentRoute: () => ledgerRoute,
    path: "/journal",
    validateSearch: (search) => journalActionSearchSchema.parse(search),
    component: LedgerJournalPage,
  });
  const accountRoute = createRoute({
    getParentRoute: () => ledgerRoute,
    path: "/account/$accountName",
    component: () => <div data-testid="account-page">account detail</div>,
  });

  return createRouter({
    routeTree: rootRoute.addChildren([
      ledgerRoute.addChildren([journalRoute, accountRoute]),
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
    expect(screen.getByTestId("offset")).toBeInTheDocument();
  });
  return router;
}

/** The offset the journal query actually received on its latest render. */
function queriedOffset() {
  return queryState.variables.at(-1)?.query.offset;
}

beforeEach(() => {
  queryState.total = 300;
  queryState.variables = [];
});

afterEach(() => {
  cleanup();
});

describe("journal pagination in the URL", () => {
  it("restores the current page after an account drill-down and Back", async () => {
    const user = userEvent.setup();
    const router = await mountAt("/ledger/alice/books/journal");
    expect(queriedOffset()).toBe(0);

    await user.click(screen.getByRole("button", { name: "next-page" }));
    await waitFor(() => {
      expect(queriedOffset()).toBe(60);
    });
    expect(router.state.location.search).toMatchObject({ offset: 60 });

    await user.click(screen.getByRole("link", { name: "drill-into-account" }));
    await waitFor(() => {
      expect(screen.getByTestId("account-page")).toBeInTheDocument();
    });

    await act(async () => {
      router.history.back();
    });

    await waitFor(() => {
      expect(screen.getByTestId("offset")).toHaveTextContent("60");
    });
    expect(queriedOffset()).toBe(60);
    expect(router.state.location.search).toMatchObject({ offset: 60 });
  });

  it("paginates by replacing the entry, so Back leaves the journal once", async () => {
    const user = userEvent.setup();
    const router = await mountAt("/ledger/alice/books/journal");
    const startLength = router.history.length;

    await user.click(screen.getByRole("button", { name: "next-page" }));
    await waitFor(() => {
      expect(queriedOffset()).toBe(60);
    });
    await user.click(screen.getByRole("button", { name: "next-page" }));
    await waitFor(() => {
      expect(queriedOffset()).toBe(120);
    });

    expect(router.history.length).toBe(startLength);
  });

  it("restores a deep page from a reloaded URL", async () => {
    await mountAt("/ledger/alice/books/journal?offset=180");
    expect(queriedOffset()).toBe(180);
    expect(screen.getByTestId("offset")).toHaveTextContent("180");
  });

  it("resets to the first page when a filter changes, clearing the stale offset", async () => {
    const user = userEvent.setup();
    const router = await mountAt("/ledger/alice/books/journal?offset=120");
    expect(queriedOffset()).toBe(120);

    await user.click(
      screen.getByRole("button", { name: "change-directive-filter" }),
    );

    await waitFor(() => {
      expect(queriedOffset()).toBe(0);
    });
    expect(router.state.location.search).not.toHaveProperty("offset");
  });

  it("coerces hostile offsets instead of querying them", async () => {
    // Past the end of the result set: falls back to the last page.
    const router = await mountAt("/ledger/alice/books/journal?offset=999999");
    await waitFor(() => {
      expect(queriedOffset()).toBe(240);
    });
    expect(router.state.location.search).toMatchObject({ offset: 240 });

    // Negative, fractional, and non-numeric offsets are the first page.
    for (const raw of ["-5", "abc", "12.7", encodeURIComponent('["60"]')]) {
      await mountAt(`/ledger/alice/books/journal?offset=${raw}`);
      expect(queriedOffset()).toBe(raw === "12.7" ? 12 : 0);
    }
  });
});
