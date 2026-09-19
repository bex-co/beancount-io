import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useEffect, useRef, type ReactNode } from "react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from "vitest";
import { LedgerLayout } from "@/common/components/ledger-layout";
import {
  GetLedgerDocument,
  type GetLedgerQuery,
  type QueryShellQuery,
} from "@/graphql/definitions";
import LedgerQueryPage from "../index";

vi.mock("@/common/components/ledger-layout/ledger-sidebar", () => ({
  LedgerSidebar: () => null,
}));
vi.mock("@/common/components/ledger-layout/layout-header", () => ({
  LayoutHeader: () => null,
}));
vi.mock(
  "@/common/components/ledger-layout/ledger-layout-background-queries",
  () => ({ LedgerLayoutBackgroundQueries: () => null }),
);
vi.mock("@/common/components/ui/sidebar.tsx", () => ({
  SidebarProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/common/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));
vi.mock("@/common/analytics", () => ({ track: vi.fn() }));

// Keep the real page's onChange and one-shot Cmd+Enter registration. Only the
// browser-only editor is replaced; no page, history, router or Apollo hooks are.
vi.mock("@/common/components/monaco-editor", () => ({
  MonacoEditor: function TestEditor({
    value,
    onChange,
    onMount,
  }: {
    value: string;
    onChange: (value: string) => void;
    onMount: (
      editor: {
        addCommand: (key: number, run: () => void) => void;
        getValue: () => string;
        focus: () => void;
        onDidDispose: (callback: () => void) => void;
      },
      monaco: {
        KeyMod: { CtrlCmd: number };
        KeyCode: { Enter: number };
        languages: {
          setLanguageConfiguration: () => { dispose: () => void };
          registerCompletionItemProvider: () => { dispose: () => void };
        };
      },
    ) => void;
  }) {
    const editorRef = useRef<HTMLTextAreaElement>(null);
    const commandRef = useRef<(() => void) | undefined>(undefined);
    const mountRef = useRef(onMount);

    useEffect(() => {
      let dispose: (() => void) | undefined;
      mountRef.current(
        {
          addCommand: (_key, run) => {
            commandRef.current = run;
          },
          getValue: () => editorRef.current?.value ?? "",
          focus: () => editorRef.current?.focus(),
          onDidDispose: (callback) => {
            dispose = callback;
          },
        },
        {
          KeyMod: { CtrlCmd: 2048 },
          KeyCode: { Enter: 3 },
          languages: {
            setLanguageConfiguration: () => ({ dispose: vi.fn() }),
            registerCompletionItemProvider: () => ({ dispose: vi.fn() }),
          },
        },
      );
      return () => dispose?.();
    }, []);

    return (
      <textarea
        ref={editorRef}
        aria-label="BQL editor"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            commandRef.current?.();
          }
        }}
      />
    );
  },
}));

const LEDGER_A = "open_ledger/example";
const LEDGER_B = "open_ledger/other";
const QUERY_A = "SELECT 303 AS held LIMIT 1";
const QUERY_B = "SELECT 404 AS later LIMIT 1";

function ledgerData(id: string): GetLedgerQuery {
  return {
    getLedger: {
      __typename: "Ledger",
      id,
      name: id.split("/")[1],
      fullName: id,
      httpUrl: "",
      sshUrl: "",
      private: false,
      empty: false,
      size: 1,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
      description: null,
      isStarred: false,
      permissions: {
        __typename: "Permission",
        admin: false,
        pull: true,
        push: false,
      },
      options: {
        __typename: "LedgerOptions",
        title: id,
        nameAssets: "Assets",
        nameEquity: "Equity",
        nameExpenses: "Expenses",
        nameIncome: "Income",
        nameLiabilities: "Liabilities",
        accountCurrentConversions: "Conversions",
        accountCurrentEarnings: "Earnings",
        renderCommas: false,
        operatingCurrency: ["USD"],
      },
      favaOptions: {
        __typename: "FavaOptions",
        accountJournalIncludeChildren: true,
        autoReload: false,
        collapsePattern: [],
        conversionCurrencies: [],
        currencyColumn: 1,
        defaultPage: "income-statement",
        fiscalYearEnd: { __typename: "FiscalYearEnd", month: 12, day: 31 },
        indent: 2,
        invertIncomeLiabilitiesEquity: true,
        language: "en",
        locale: "en-US",
        showAccountsWithZeroBalance: true,
        showAccountsWithZeroTransactions: true,
        showClosedAccounts: false,
        sidebarShowQueries: 5,
        unrealized: "Unrealized",
        upcomingEvents: 7,
        uptodateIndicatorGreyLookbackDays: 7,
        useExternalEditor: false,
      },
      bcioOptions: {
        __typename: "BcioOptions",
        defaultFile: "main.bean",
        transactionFile: null,
        accountFile: null,
        priceFile: null,
        balanceFile: null,
        noteFile: null,
        padFile: null,
      },
    },
  };
}

function operationKey(ledgerId: string, query: string) {
  return JSON.stringify([ledgerId, query]);
}

async function mountQueryPage() {
  const pending = new Map<string, (value: number) => void>();
  const requests: string[] = [];
  const cache = new InMemoryCache();
  for (const ledgerId of [LEDGER_A, LEDGER_B]) {
    cache.writeQuery({
      query: GetLedgerDocument,
      variables: { ledgerId },
      data: ledgerData(ledgerId),
    });
  }
  const client = new ApolloClient({
    cache,
    link: new ApolloLink((operation) => {
      expect(operation.operationName).toBe("QueryShell");
      const key = operationKey(
        String(operation.variables.ledgerId),
        String(operation.variables.query),
      );
      requests.push(key);
      return new Observable((observer) => {
        pending.set(key, (value) => {
          const data: QueryShellQuery = {
            queryShell: {
              __typename: "QueryResult",
              resultType: "table",
              table: {
                __typename: "QueryResultTable",
                types: [
                  {
                    __typename: "QueryColumn",
                    name: "value",
                    dtype: "int",
                  },
                ],
                rows: [[value]],
                t: "table",
              },
              text: null,
            },
          };
          observer.next({ data });
          observer.complete();
        });
        return () => pending.delete(key);
      });
    }),
  });

  let nextNavigation: Promise<void> | undefined;
  const rootRoute = createRootRoute({ component: Outlet });
  const ledgerRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/ledger/$ledgerOwner/$ledgerName",
    component: LedgerLayout,
  });
  const queryRoute = createRoute({
    getParentRoute: () => ledgerRoute,
    path: "/query",
    component: LedgerQueryPage,
    validateSearch: (search) => ({
      query: typeof search.query === "string" ? search.query : undefined,
    }),
    remountDeps: ({ params }) => ({
      ledgerOwner: params.ledgerOwner,
      ledgerName: params.ledgerName,
    }),
    beforeLoad: () => {
      const held = nextNavigation;
      nextNavigation = undefined;
      return held;
    },
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([ledgerRoute.addChildren([queryRoute])]),
    history: createMemoryHistory({
      initialEntries: [
        `/ledger/${LEDGER_A}/query?query=${encodeURIComponent(QUERY_A)}`,
      ],
    }),
  });
  await router.load();
  const view = render(
    <ApolloProvider client={client}>
      <RouterProvider router={router} />
    </ApolloProvider>,
  );
  onTestFinished(() => {
    view.unmount();
    client.stop();
  });
  await waitFor(() =>
    expect(pending.has(operationKey(LEDGER_A, QUERY_A))).toBe(true),
  );

  return {
    router,
    pending,
    requests,
    holdNextNavigation: () => {
      let release!: () => void;
      nextNavigation = new Promise<void>((resolve) => {
        release = resolve;
      });
      return release;
    },
    resolve: async (ledgerId: string, query: string, value: number) => {
      const complete = pending.get(operationKey(ledgerId, query));
      expect(complete).toBeDefined();
      await act(async () => complete!(value));
    },
  };
}

function queryCard(query: string) {
  const card = screen
    .getByText(query, { selector: "summary pre" })
    .closest("details");
  expect(card).not.toBeNull();
  return within(card!);
}

beforeEach(() => {
  const storage = new Map<string, string>();
  vi.mocked(localStorage.getItem).mockImplementation(
    (key) => storage.get(key) ?? null,
  );
  vi.mocked(localStorage.setItem).mockImplementation((key, value) => {
    storage.set(key, value);
  });
});

afterEach(cleanup);

describe("BQL query navigation through LedgerLayout", () => {
  it("keeps the editor and both in-flight query owners across query URL changes", async () => {
    const app = await mountQueryPage();
    const editor = screen.getByRole("textbox", { name: "BQL editor" });
    expect(queryCard(QUERY_A).getByText(/^Executing/)).toBeInTheDocument();

    fireEvent.change(editor, { target: { value: QUERY_B } });
    const releaseNavigation = app.holdNextNavigation();
    fireEvent.keyDown(editor, { key: "Enter", metaKey: true });
    await waitFor(() => {
      expect(app.router.state.isLoading).toBe(true);
      expect(app.pending.has(operationKey(LEDGER_A, QUERY_B))).toBe(true);
    });

    // isLoading for a bookmark update must not destroy the executing page.
    expect(editor.isConnected).toBe(true);
    expect(editor).toHaveFocus();
    expect(queryCard(QUERY_A).getByText(/^Executing/)).toBeInTheDocument();
    await act(async () => releaseNavigation());
    await waitFor(() => expect(app.router.state.isLoading).toBe(false));
    expect(app.router.state.location.search).toMatchObject({ query: QUERY_B });
    expect(screen.getByRole("textbox", { name: "BQL editor" })).toBe(editor);

    await app.resolve(LEDGER_A, QUERY_B, 404);
    await waitFor(() => {
      expect(
        queryCard(QUERY_B).getByRole("cell", { name: "404" }),
      ).toBeInTheDocument();
    });
    expect(app.pending.has(operationKey(LEDGER_A, QUERY_A))).toBe(true);
    expect(queryCard(QUERY_A).getByText(/^Executing/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Execute Query" }),
    ).toBeDisabled();

    await app.resolve(LEDGER_A, QUERY_A, 303);
    await waitFor(() => {
      expect(
        queryCard(QUERY_A).getByRole("cell", { name: "303" }),
      ).toBeInTheDocument();
    });
    expect(
      queryCard(QUERY_B).getByRole("cell", { name: "404" }),
    ).toBeInTheDocument();
    expect(
      queryCard(QUERY_A).getByRole("button", { name: "Download CSV" }),
    ).toBeEnabled();
    expect(
      queryCard(QUERY_B).getByRole("button", { name: "Download CSV" }),
    ).toBeEnabled();
    expect(screen.getByRole("button", { name: "Execute Query" })).toBeEnabled();
    expect(screen.getByRole("textbox", { name: "BQL editor" })).toBe(editor);
    expect(app.requests).toEqual([
      operationKey(LEDGER_A, QUERY_A),
      operationKey(LEDGER_A, QUERY_B),
    ]);
  });

  it("ignores a previous ledger's delayed result after switching ledgers", async () => {
    const app = await mountQueryPage();
    const previousEditor = screen.getByRole("textbox", { name: "BQL editor" });

    await act(async () => {
      await app.router.navigate({
        to: "/ledger/$ledgerOwner/$ledgerName/query",
        params: { ledgerOwner: "open_ledger", ledgerName: "other" },
        search: { query: QUERY_A },
      });
    });
    await waitFor(() =>
      expect(app.pending.has(operationKey(LEDGER_B, QUERY_A))).toBe(true),
    );
    expect(previousEditor.isConnected).toBe(false);
    expect(app.router.state.location.pathname).toBe(
      `/ledger/${LEDGER_B}/query`,
    );

    await app.resolve(LEDGER_B, QUERY_A, 909);
    await waitFor(() => {
      expect(
        queryCard(QUERY_A).getByRole("cell", { name: "909" }),
      ).toBeInTheDocument();
    });
    await app.resolve(LEDGER_A, QUERY_A, 303);
    expect(
      queryCard(QUERY_A).getByRole("cell", { name: "909" }),
    ).toBeInTheDocument();
    expect(
      queryCard(QUERY_A).queryByRole("cell", { name: "303" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Execute Query" })).toBeEnabled();
  });
});
