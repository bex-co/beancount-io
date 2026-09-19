import { act, render, screen, waitFor } from "@testing-library/react";
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
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLedgerSearchParams } from "@/common/hooks/use-ledger-search-params";
import { ledgerFilterSearchSchema } from "@/common/lib/ledger-search-params";
import { LedgerSearchParamsProvider } from "@/common/providers/ledger-search-params-provider";
import { accountJournalSearchSchema } from "../search";
import { AccountJournalTable } from "../index";

/**
 * The account journal's page offset has to survive the table being unmounted —
 * opening a transaction's source does exactly that. These cases drive a real
 * router over a real history and read the offsets the GraphQL query actually
 * asked for, rather than trusting a pagination control.
 */

interface AccountJournalRequest {
  ledgerId: string;
  query: { offset: number; limit: number; filter?: string; time?: string };
}

const queryState = vi.hoisted(() => ({
  total: 275,
  variables: [] as AccountJournalRequest[],
}));

vi.mock("@apollo/client/react", () => ({
  useQuery: (
    _document: unknown,
    options: { variables: AccountJournalRequest },
  ) => {
    queryState.variables.push(options.variables);
    const { offset, limit } = options.variables.query;
    const count = Math.max(0, Math.min(limit, queryState.total - offset));
    return {
      data: {
        getLedgerAccountJournal: {
          items: Array.from({ length: count }, (_, index) => ({
            entry: { id: `entry-${offset + index}`, __typename: "Transaction" },
            change: {},
            balance: {},
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

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerData: {} }),
}));
vi.mock("@/common/components/authenticated", () => ({
  Authenticated: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/features/journal/components/journal-filters", () => ({
  JournalFilters: () => null,
}));
vi.mock("@/features/journal/components/entry-context-dialog", () => ({
  EntryContextDialog: () => null,
}));
vi.mock("@/features/journal/components/journal-table", () => ({
  JournalTable: ({ data }: { data: { directive: { id: string } }[] }) => (
    <>
      <span data-testid="first-row">{data[0]?.directive.id}</span>
      {/* Opening a transaction's source leaves the account page entirely. */}
      <Link
        to="/ledger/$ledgerOwner/$ledgerName/files/blob"
        params={{ ledgerOwner: "alice", ledgerName: "books" }}
      >
        open-source
      </Link>
    </>
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

function SharedFilterControls() {
  const { searchParams, setSearchParams } = useLedgerSearchParams();
  return (
    <button onClick={() => setSearchParams({ ...searchParams, time: "2016" })}>
      shared-time
    </button>
  );
}

function AccountPage() {
  return (
    <AccountJournalTable
      ledgerId="alice/books"
      ledgerOwner="alice"
      ledgerName="books"
      accountName="Assets:US:BofA:Checking"
      ledgerFilters={{}}
      conversion="AT_VALUE"
    />
  );
}

function buildRouter(initialEntry: string) {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const ledgerRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/ledger/$ledgerOwner/$ledgerName",
    validateSearch: (search) => ledgerFilterSearchSchema.parse(search),
    search: {
      middlewares: [retainSearchParams(["account", "filter", "time"])],
    },
    component: () => (
      <LedgerSearchParamsProvider>
        <SharedFilterControls />
        <Outlet />
      </LedgerSearchParamsProvider>
    ),
  });
  const accountRoute = createRoute({
    getParentRoute: () => ledgerRoute,
    path: "/account/$accountName",
    validateSearch: (search) => accountJournalSearchSchema.parse(search),
    component: AccountPage,
  });
  const blobRoute = createRoute({
    getParentRoute: () => ledgerRoute,
    path: "/files/blob",
    component: () => <div data-testid="source-page">source</div>,
  });

  return createRouter({
    routeTree: rootRoute.addChildren([
      ledgerRoute.addChildren([accountRoute, blobRoute]),
    ]),
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  });
}

async function mountAt(initialEntry: string) {
  const router = buildRouter(initialEntry);
  render(<RouterProvider router={router as never} />);
  await waitFor(() => expect(screen.getByTestId("offset")).toBeInTheDocument());
  return router;
}

const lastQueryOffset = () =>
  queryState.variables[queryState.variables.length - 1]?.query.offset;

beforeEach(() => {
  queryState.variables.length = 0;
  queryState.total = 275;
});

const ACCOUNT_URL = "/ledger/alice/books/account/Assets%3AUS%3ABofA%3AChecking";

describe("account journal pagination in the URL", () => {
  it("restores the page after opening a transaction's source and going back", async () => {
    const user = userEvent.setup();
    const router = await mountAt(ACCOUNT_URL);

    expect(lastQueryOffset()).toBe(0);
    expect(screen.getByTestId("first-row")).toHaveTextContent("entry-0");

    await user.click(screen.getByText("next-page"));
    await waitFor(() => expect(lastQueryOffset()).toBe(20));
    expect(router.state.location.search).toMatchObject({ offset: 20 });
    expect(screen.getByTestId("first-row")).toHaveTextContent("entry-20");

    // Leave the account entirely: the table unmounts.
    await user.click(screen.getByText("open-source"));
    await waitFor(() =>
      expect(screen.getByTestId("source-page")).toBeInTheDocument(),
    );

    await act(async () => router.history.back());
    await waitFor(() =>
      expect(screen.getByTestId("first-row")).toHaveTextContent("entry-20"),
    );
    expect(lastQueryOffset()).toBe(20);
  });

  it("reads the page an explicit link asks for", async () => {
    await mountAt(`${ACCOUNT_URL}?offset=40`);
    expect(lastQueryOffset()).toBe(40);
    expect(screen.getByTestId("first-row")).toHaveTextContent("entry-40");
  });

  it.each([
    ["?offset=-5", 0],
    ["?offset=abc", 0],
    ["?offset=2.7", 2],
  ])("keeps a %s URL bounded", async (search, expected) => {
    await mountAt(`${ACCOUNT_URL}${search}`);
    expect(lastQueryOffset()).toBe(expected);
  });

  it("falls back to the last page when the URL asks past the end", async () => {
    await mountAt(`${ACCOUNT_URL}?offset=99999`);
    // 275 entries in pages of 20: the last page starts at 260.
    await waitFor(() => expect(lastQueryOffset()).toBe(260));
  });

  it("starts again at the first page when a shared filter changes", async () => {
    const user = userEvent.setup();
    const router = await mountAt(`${ACCOUNT_URL}?offset=40`);
    expect(lastQueryOffset()).toBe(40);

    await user.click(screen.getByText("shared-time"));

    await waitFor(() => expect(lastQueryOffset()).toBe(0));
    expect(router.state.location.search).toMatchObject({ time: 2016 });
    expect(router.state.location.search).not.toHaveProperty("offset");
  });
});
