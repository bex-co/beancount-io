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
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LedgerLayout } from "@/common/components/ledger-layout";
import { useLedgerSearchParams } from "@/common/hooks/use-ledger-search-params";
import { journalActionSearchSchema } from "@/common/lib/ledger-action-search";
import { ledgerFilterSearchSchema } from "@/common/lib/ledger-search-params";
import { GetLedgerDocument } from "@/graphql/definitions";
import LedgerJournalPage from "../journal-page";

interface JournalRequest {
  ledgerId: string;
  query: {
    offset: number;
    limit: number;
    time?: string;
    account?: string;
    filter?: string;
    transactionSubtypes?: string[];
  };
}

const latestSetOffset = vi.hoisted(() => ({
  current: undefined as
    | ((value: number | ((previous: number) => number)) => void)
    | undefined,
}));

const queryState = vi.hoisted(() => ({
  total: 300,
  variables: [] as JournalRequest[],
}));

vi.mock("@apollo/client/react", () => ({
  useLazyQuery: () => [vi.fn()],
  useQuery: (document: unknown, options: { variables: JournalRequest }) => {
    if (document === GetLedgerDocument) {
      return {
        data: {
          getLedger: {
            id: options.variables.ledgerId,
            name: "My books",
            options: { operatingCurrency: ["USD"] },
          },
        },
        loading: false,
        error: undefined,
      };
    }
    queryState.variables.push(options.variables);
    return {
      data: {
        getLedgerJournal: {
          data: Array.from({ length: 60 }, (_, index) => ({
            id: `entry-${options.variables.query.offset + index}`,
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

vi.mock("@/common/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock(
  "@/common/providers/react-native-bridge-provider/react-native-bridge",
  () => ({ isReactNative: () => false }),
);
vi.mock("@/common/components/ledger-layout/ledger-sidebar", () => ({
  LedgerSidebar: () => null,
}));
vi.mock(
  "@/common/components/ledger-layout/ledger-layout-background-queries",
  () => ({ LedgerLayoutBackgroundQueries: () => null }),
);
vi.mock("@/common/components/ledger-layout/layout-header", () => ({
  LayoutHeader: () => <SharedFilterControls />,
}));
vi.mock("@/common/components/ui/sidebar", () => ({
  SidebarProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
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

vi.mock("@/features/journal/components/journal-table", () => ({
  JournalTable: ({ data }: { data: { directive: { id: string } }[] }) => (
    <>
      <span data-testid="first-journal-row">{data[0]?.directive.id}</span>
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
      {((): null => {
        // Held so a case can drive the offset write after this page has been
        // replaced by a pending navigation, the way the new-directive dialog's
        // success callback does.
        latestSetOffset.current = setOffset;
        return null;
      })()}
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

vi.mock("@/features/journal/components/entry-context-dialog", () => ({
  EntryContextDialog: () => null,
}));

vi.mock("@/features/journal/components/new-directive-dialog", () => ({
  NewDirectiveDialog: () => null,
}));

function SharedFilterControls() {
  const { searchParams, setSearchParams } = useLedgerSearchParams();
  return (
    <div>
      <button
        onClick={() => setSearchParams({ ...searchParams, time: "2016" })}
      >
        shared-time
      </button>
      <button
        onClick={() =>
          setSearchParams({ ...searchParams, account: "Assets:Cash" })
        }
      >
        shared-account
      </button>
      <button
        onClick={() =>
          setSearchParams({ ...searchParams, filter: 'payee:"Cafe"' })
        }
      >
        shared-expression
      </button>
      <button
        onClick={() => setSearchParams({ account: "", filter: "", time: "" })}
      >
        clear-all
      </button>
    </div>
  );
}

let nextNavigation: Promise<void> | undefined;

function holdNextNavigation() {
  let release!: () => void;
  nextNavigation = new Promise<void>((resolve) => {
    release = resolve;
  });
  return release;
}

/** Resolves when a test lets the held profile navigation finish. */
let heldProfileLoad: Promise<void> | undefined;

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
  const journalRoute = createRoute({
    getParentRoute: () => ledgerRoute,
    path: "/journal",
    validateSearch: (search) => journalActionSearchSchema.parse(search),
    beforeLoad: () => {
      const held = nextNavigation;
      nextNavigation = undefined;
      return held;
    },
    component: LedgerJournalPage,
  });
  const accountRoute = createRoute({
    getParentRoute: () => ledgerRoute,
    path: "/account/$accountName",
    component: () => <div data-testid="account-page">account detail</div>,
  });
  // A destination whose params are nothing like the journal's. Its loader can
  // be held open, so a navigation toward it stays pending while the journal is
  // still on screen — which is when a relative write would inherit its params.
  const profileRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/ledger/$username",
    loader: () => heldProfileLoad,
    component: () => <div data-testid="profile-page">profile</div>,
  });

  return createRouter({
    routeTree: rootRoute.addChildren([
      ledgerRoute.addChildren([journalRoute, accountRoute]),
      profileRoute,
    ]),
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
    defaultPendingMs: Infinity,
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
  nextNavigation = undefined;
  const storage = new Map<string, string>();
  vi.mocked(localStorage.getItem).mockImplementation(
    (key) => storage.get(key) ?? null,
  );
  vi.mocked(localStorage.setItem).mockImplementation((key, value) => {
    storage.set(key, value);
  });
  vi.mocked(localStorage.removeItem).mockImplementation((key) => {
    storage.delete(key);
  });
});

afterEach(() => {
  cleanup();
});

describe("journal pagination in the URL", () => {
  it.each([
    { control: "shared-time", initial: "", expected: { time: "2016" } },
    {
      control: "shared-account",
      initial: "",
      expected: { account: "Assets:Cash" },
    },
    {
      control: "shared-expression",
      initial: "",
      expected: { filter: 'payee:"Cafe"' },
    },
    {
      control: "clear-all",
      initial: "&time=2016&account=Assets%3ACash&filter=payee%3A%22Cafe%22",
      expected: {},
    },
  ])(
    "atomically resets page two through $control without exposing pending results or Export",
    async ({ control, initial, expected }) => {
      const user = userEvent.setup();
      const router = await mountAt(
        `/ledger/alice/books/journal?offset=60&action=new-entry&directive=note${initial}`,
      );
      expect(queriedOffset()).toBe(60);
      expect(screen.getByTestId("first-journal-row")).toHaveTextContent(
        "entry-60",
      );
      expect(screen.getByRole("button", { name: "Export" })).toBeVisible();
      const firstNewRead = queryState.variables.length;
      const release = holdNextNavigation();

      try {
        await user.click(screen.getByRole("button", { name: control }));
        await waitFor(() => {
          expect(router.state.isLoading).toBe(true);
          expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
        });
        const pendingSearch = router.state.location.search;
        expect(
          screen.queryByTestId("first-journal-row"),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByRole("button", { name: "Export" }),
        ).not.toBeInTheDocument();

        await act(async () => release());
        await waitFor(() => {
          expect(router.state.isLoading).toBe(false);
          expect(screen.getByTestId("offset")).toBeInTheDocument();
        });
        const newScope = { time: "", account: "", filter: "", ...expected };
        const newReads = queryState.variables
          .slice(firstNewRead)
          .filter(
            ({ query }) =>
              query.time === newScope.time &&
              query.account === newScope.account &&
              query.filter === newScope.filter,
          );
        expect(newReads.length).toBeGreaterThan(0);
        for (const { query } of newReads) expect(query.offset).toBe(0);
        expect(pendingSearch).not.toHaveProperty("offset");
        expect(router.state.location.search).not.toHaveProperty("offset");
        expect(router.state.location.search).toMatchObject({
          action: "new-entry",
          directive: "note",
        });
        expect(screen.getByTestId("offset")).toHaveTextContent("0");
        expect(screen.getByTestId("first-journal-row")).toHaveTextContent(
          "entry-0",
        );
        expect(screen.getByText("1–60 / 300")).toBeVisible();
        expect(screen.getByRole("button", { name: "Export" })).toBeVisible();
      } finally {
        await act(async () => release());
      }
    },
  );

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
    await mountAt("/ledger/alice/books/journal?offset=180&time=2016");
    expect(queriedOffset()).toBe(180);
    expect(queryState.variables.at(-1)?.query.time).toBe("2016");
    expect(screen.getByTestId("offset")).toHaveTextContent("180");
  });

  it("preserves explicit scope and offset changes through same-Journal navigation and history", async () => {
    const router = await mountAt(
      "/ledger/alice/books/journal?time=2015&offset=60",
    );
    await act(async () => {
      await router.navigate({
        to: "/ledger/$ledgerOwner/$ledgerName/journal",
        params: { ledgerOwner: "alice", ledgerName: "books" },
        search: { time: 2016, offset: 120 },
      });
    });
    await waitFor(() => {
      expect(queryState.variables.at(-1)?.query).toMatchObject({
        time: "2016",
        offset: 120,
      });
    });

    await act(async () => router.history.back());
    await waitFor(() => {
      expect(queryState.variables.at(-1)?.query).toMatchObject({
        time: "2015",
        offset: 60,
      });
    });

    await act(async () => router.history.forward());
    await waitFor(() => {
      expect(queryState.variables.at(-1)?.query).toMatchObject({
        time: "2016",
        offset: 120,
      });
    });
  });

  it("resets to the first page when a filter changes, clearing the stale offset", async () => {
    const user = userEvent.setup();
    const router = await mountAt("/ledger/alice/books/journal?offset=120");
    expect(queriedOffset()).toBe(120);

    await user.click(screen.getByRole("button", { name: "Balance" }));

    await waitFor(() => {
      expect(queriedOffset()).toBe(0);
    });
    expect(router.state.location.search).not.toHaveProperty("offset");
  });

  it("resets pagination when a transaction subtype is selected and preserves the reset when cleared", async () => {
    const user = userEvent.setup();
    const router = await mountAt("/ledger/alice/books/journal?offset=60");
    await user.click(
      screen.getByRole("button", { name: "Pending transactions" }),
    );
    await waitFor(() => {
      expect(queryState.variables.at(-1)?.query).toMatchObject({
        offset: 0,
        transactionSubtypes: ["pending"],
      });
    });
    expect(router.state.location.search).not.toHaveProperty("offset");

    await user.click(
      screen.getByRole("button", { name: "Pending transactions" }),
    );
    await waitFor(() => {
      expect(
        queryState.variables.at(-1)?.query.transactionSubtypes,
      ).toBeUndefined();
    });
    expect(queriedOffset()).toBe(0);
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

  it("writes the offset to this journal even while another route is pending", async () => {
    // The offset write also runs from the new-directive dialog's success
    // callback, after an awaited mutation. If the reader has started toward a
    // route whose params are not this page's, a relative write inherits the
    // pending destination's params and lands on /ledger/undefined.
    let releaseProfile: () => void = () => {};
    heldProfileLoad = new Promise<void>((resolve) => {
      releaseProfile = resolve;
    });

    const router = await mountAt("/ledger/alice/books/journal");
    const setOffset = latestSetOffset.current!;
    expect(setOffset).toBeTypeOf("function");

    // Start leaving, and leave the navigation in flight.
    void router.navigate({
      to: "/ledger/$username",
      params: { username: "alice" },
    });
    await waitFor(() => {
      expect(router.state.isLoading).toBe(true);
    });

    await act(async () => {
      setOffset(50);
    });

    // The write supersedes the pending navigation, which is fine — what must
    // not happen is it resolving against that destination's params.
    expect(router.state.location.pathname).toBe("/ledger/alice/books/journal");
    expect(router.state.location.search).toMatchObject({ offset: 50 });

    releaseProfile();
    await waitFor(() => {
      expect(router.state.location.pathname).not.toContain("undefined");
    });

    heldProfileLoad = undefined;
  });
});
