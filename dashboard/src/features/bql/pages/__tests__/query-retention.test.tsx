import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { useState, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockNavigate = vi.fn();
let searchQuery: string | undefined;
let seededHistory: string[] = [];

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({
    ledgerOwner: "open_ledger",
    ledgerName: "example",
  }),
  useSearch: () => ({ query: searchQuery }),
  useNavigate: () => mockNavigate,
  ClientOnly: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/common/hooks/use-theme", () => ({
  useIsDarkTheme: () => false,
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerName: "example" }),
}));

vi.mock("@/common/hooks/use-root-context", () => ({
  useRootContext: () => ({ userProfile: null }),
}));

vi.mock("@/common/hooks/use-local-storage-state", () => ({
  useLocalStorageState: (_key: string, initial: unknown) => {
    const [state, setState] = useState(
      seededHistory.length > 0 ? seededHistory : initial,
    );
    return [state, setState, vi.fn()];
  },
}));

vi.mock("@/common/analytics", () => ({
  track: vi.fn(),
}));

vi.mock("@/common/components/page-header", () => ({
  PageHeader: () => null,
}));

vi.mock("@/common/components/related-links", () => ({
  RelatedLinks: () => null,
}));

vi.mock("@/common/components/monaco-editor", () => ({
  MonacoEditor: () => (
    <textarea
      data-testid="bql-editor"
      aria-label="bql-editor"
      defaultValue=""
    />
  ),
}));

vi.mock("@/features/bql/components/query-result-card", () => ({
  QueryResultCard: ({
    query,
    result,
    error,
    loading,
    onExecute,
  }: {
    query: string;
    result?: { table?: { rows?: Array<Array<string | number>> } } | null;
    error?: Error;
    loading?: boolean;
    onExecute: (query: string) => void;
  }) => {
    const rows = (result?.table?.rows ?? [])
      .map((row) => row.join("|"))
      .join(";");
    return (
      <div data-testid={`history-${query}`}>
        <button type="button" onClick={() => onExecute(query)}>
          open {query}
        </button>
        {loading ? <span data-testid={`loading-${query}`}>loading</span> : null}
        {rows ? <span data-testid={`result-rows-${query}`}>{rows}</span> : null}
        {error ? (
          <span role="alert" data-testid={`error-${query}`}>
            {error.message}
          </span>
        ) : null}
      </div>
    );
  },
}));

import LedgerQueryPage from "../index";

const QUERY_A = "SELECT account FROM accounts ORDER BY account LIMIT 2";
const QUERY_B = "SELECT account FROM accounts ORDER BY account LIMIT 3";

type PendingOp = {
  resolve: (rows: Array<Array<string>>) => void;
};

function createHoldingClient() {
  const pending = new Map<string, PendingOp>();

  const link = new ApolloLink((operation) => {
    const queryText = String(operation.variables.query ?? "");
    return new Observable((observer) => {
      let settled = false;
      pending.set(queryText, {
        resolve: (rows) => {
          if (settled) return;
          settled = true;
          observer.next({
            data: {
              queryShell: {
                resultType: "table",
                table: {
                  types: [{ name: "account", dtype: "str" }],
                  rows,
                  t: null,
                },
                chart: null,
                text: null,
                __typename: "QueryShellResult",
              },
            },
          });
          observer.complete();
          pending.delete(queryText);
        },
      });
      return () => {
        if (settled) return;
        settled = true;
        pending.delete(queryText);
        observer.error(
          new DOMException("The operation was aborted.", "AbortError"),
        );
      };
    });
  });

  return {
    client: new ApolloClient({
      link,
      cache: new InMemoryCache(),
    }),
    pending,
  };
}

describe("LedgerQueryPage concurrent query retention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchQuery = undefined;
    seededHistory = [QUERY_A, QUERY_B];
  });

  it("lets a delayed history query finish after opening another", async () => {
    const { client, pending } = createHoldingClient();

    render(
      <ApolloProvider client={client}>
        <LedgerQueryPage />
      </ApolloProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: `open ${QUERY_A}` }));
    await waitFor(() => {
      expect(pending.has(QUERY_A)).toBe(true);
      expect(screen.getByTestId(`loading-${QUERY_A}`)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: `open ${QUERY_B}` }));
    await waitFor(() => {
      expect(pending.has(QUERY_B)).toBe(true);
    });
    expect(pending.has(QUERY_A)).toBe(true);

    await act(async () => {
      pending
        .get(QUERY_B)
        ?.resolve([["Assets:B1"], ["Assets:B2"], ["Assets:B3"]]);
    });
    await waitFor(() => {
      expect(screen.getByTestId(`result-rows-${QUERY_B}`)).toHaveTextContent(
        "Assets:B1;Assets:B2;Assets:B3",
      );
    });

    await act(async () => {
      pending.get(QUERY_A)?.resolve([["Assets:A1"], ["Assets:A2"]]);
    });
    await waitFor(() => {
      expect(screen.getByTestId(`result-rows-${QUERY_A}`)).toHaveTextContent(
        "Assets:A1;Assets:A2",
      );
    });
    expect(screen.queryByTestId(`error-${QUERY_A}`)).not.toBeInTheDocument();
  });
});

/**
 * Running the same query again must read the ledger again: another editor
 * may have changed it since the first result (w4/234).
 */
describe("LedgerQueryPage re-execution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchQuery = undefined;
    seededHistory = [QUERY_A];
  });

  it("sends a new request and shows the current result each time", async () => {
    const { client, pending } = createHoldingClient();
    render(
      <ApolloProvider client={client}>
        <LedgerQueryPage />
      </ApolloProvider>,
    );
    const run = () =>
      fireEvent.click(screen.getByRole("button", { name: `open ${QUERY_A}` }));

    run();
    await waitFor(() => expect(pending.has(QUERY_A)).toBe(true));
    await act(async () => pending.get(QUERY_A)?.resolve([["12"]]));
    await waitFor(() =>
      expect(screen.getByTestId(`result-rows-${QUERY_A}`)).toHaveTextContent(
        "12",
      ),
    );

    run();
    await waitFor(() => expect(pending.has(QUERY_A)).toBe(true));
    await act(async () => pending.get(QUERY_A)?.resolve([["13"]]));
    await waitFor(() =>
      expect(screen.getByTestId(`result-rows-${QUERY_A}`)).toHaveTextContent(
        "13",
      ),
    );
  });
});

/**
 * Running an older history query moves it to the top; its card and the
 * others must survive the reorder, keeping keyboard focus (w4/253).
 */
describe("LedgerQueryPage history reorder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchQuery = undefined;
    seededHistory = [QUERY_A, QUERY_B];
  });

  it("keeps each card mounted and the focused control focused", async () => {
    const { client, pending } = createHoldingClient();
    render(
      <ApolloProvider client={client}>
        <LedgerQueryPage />
      </ApolloProvider>,
    );
    const cardA = screen.getByTestId(`history-${QUERY_A}`);
    const openB = screen.getByRole("button", { name: `open ${QUERY_B}` });
    openB.focus();
    fireEvent.click(openB);
    await waitFor(() => expect(pending.has(QUERY_B)).toBe(true));
    await act(async () => pending.get(QUERY_B)?.resolve([["Assets:B1"]]));
    await waitFor(() =>
      expect(screen.getByTestId(`result-rows-${QUERY_B}`)).toHaveTextContent(
        "Assets:B1",
      ),
    );

    const cards = screen.getAllByTestId(/^history-/);
    expect(cards.map((card) => card.dataset.testid)).toEqual([
      `history-${QUERY_B}`,
      `history-${QUERY_A}`,
    ]);
    expect(screen.getByRole("button", { name: `open ${QUERY_B}` })).toBe(openB);
    expect(screen.getByTestId(`history-${QUERY_A}`)).toBe(cardA);
    expect(document.activeElement).toBe(openB);
  });
});
