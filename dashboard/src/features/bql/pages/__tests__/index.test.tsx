import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useEffect, useState, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as apolloClient from "@apollo/client/react";
import {
  createMockLazyQueryTuple,
  type MockLazyQueryTuple,
} from "@/test/apollo-test-utils";
import type { QueryShellQuery } from "@/graphql/definitions";

const mockNavigate = vi.fn();
const mockExecuteQuery = vi.fn();
let searchQuery: string | undefined;

const monacoHarness = vi.hoisted(() => ({
  commandHandler: null as null | (() => void),
  registeredKeybinding: null as null | number,
  editorValue: "select * from accounts",
  KeyModCtrlCmd: 2048,
  KeyCodeEnter: 3,
}));

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ ledgerOwner: "open_ledger", ledgerName: "example" }),
  useSearch: () => ({ query: searchQuery }),
  useNavigate: () => mockNavigate,
  ClientOnly: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@apollo/client/react", () => ({
  useLazyQuery: vi.fn(),
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

vi.mock("@/common/hooks/use-local-storage-state", () => ({
  useLocalStorageState: (_key: string, initial: unknown) => {
    const [state, setState] = useState(initial);
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

vi.mock("@/common/components/seo/ledger-page-seo", () => ({
  LedgerPageSEO: () => null,
}));

vi.mock("@/features/bql/components/query-result-card", () => ({
  QueryResultCard: ({ query, error }: { query: string; error?: Error }) => (
    <div data-testid={`history-${query}`}>
      <span>{query}</span>
      {error ? <span role="alert">{error.message}</span> : null}
      <button type="button" data-testid={`export-${query}`}>
        Export {query}
      </button>
    </div>
  ),
}));

vi.mock("@/common/components/monaco-editor", () => ({
  MonacoEditor: ({
    value,
    onChange,
    onMount,
  }: {
    value: string;
    onChange?: (value: string | undefined) => void;
    onMount?: (
      editor: {
        getValue: () => string;
        addCommand: (keybinding: number, handler: () => void) => void;
        focus: () => void;
      },
      monaco: {
        KeyMod: { CtrlCmd: number };
        KeyCode: { Enter: number };
        languages: {
          setLanguageConfiguration: () => void;
          registerCompletionItemProvider: () => void;
          CompletionItemKind: { Snippet: number };
        };
      },
    ) => void;
  }) => {
    useEffect(() => {
      const editor = {
        getValue: () => monacoHarness.editorValue,
        addCommand: (keybinding: number, handler: () => void) => {
          monacoHarness.registeredKeybinding = keybinding;
          monacoHarness.commandHandler = handler;
        },
        focus: vi.fn(),
      };
      const monaco = {
        KeyMod: { CtrlCmd: monacoHarness.KeyModCtrlCmd },
        KeyCode: { Enter: monacoHarness.KeyCodeEnter },
        languages: {
          setLanguageConfiguration: vi.fn(),
          registerCompletionItemProvider: vi.fn(),
          CompletionItemKind: { Snippet: 27 },
        },
      };
      onMount?.(editor, monaco);
      // Mount once, like the real Monaco editor.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <textarea
        data-testid="bql-editor"
        aria-label="bql-editor"
        value={value}
        onChange={(event) => {
          monacoHarness.editorValue = event.target.value;
          onChange?.(event.target.value);
        }}
      />
    );
  },
}));

import LedgerQueryPage from "../index";

type QueryShellTuple = MockLazyQueryTuple<QueryShellQuery>;

function tableResult(
  rows: Array<Array<string | number>>,
): QueryShellQuery["queryShell"] {
  return {
    resultType: "table",
    table: {
      types: [{ name: "account", dtype: "str" }],
      rows,
    },
    chart: null,
    text: null,
    __typename: "QueryShellResult",
  };
}

function mockSuccessfulQuery(
  query: string,
  rows: Array<Array<string | number>>,
) {
  mockExecuteQuery.mockImplementation(async (options?: unknown) => {
    const variables = (
      options as { variables?: { query?: string } } | undefined
    )?.variables;
    expect(variables?.query).toBe(query);
    return {
      data: {
        queryShell: tableResult(rows),
      },
    };
  });
}

function renderPage() {
  const tuple: QueryShellTuple = createMockLazyQueryTuple(mockExecuteQuery, {
    data: undefined,
    loading: false,
    error: undefined,
  });
  vi.mocked(apolloClient.useLazyQuery).mockReturnValue(tuple as never);
  return render(<LedgerQueryPage />);
}

describe("LedgerQueryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchQuery = undefined;
    monacoHarness.commandHandler = null;
    monacoHarness.registeredKeybinding = null;
    monacoHarness.editorValue = "select * from accounts";
    mockExecuteQuery.mockReset();
    mockExecuteQuery.mockResolvedValue({
      data: { queryShell: tableResult([["Assets:Cash"]]) },
    });
  });

  it("registers the Ctrl/Cmd+Enter shortcut", async () => {
    renderPage();

    await waitFor(() => {
      expect(monacoHarness.commandHandler).not.toBeNull();
    });

    expect(monacoHarness.registeredKeybinding).toBe(
      monacoHarness.KeyModCtrlCmd | monacoHarness.KeyCodeEnter,
    );
    expect(screen.getByText("bql.queryShortcutHint")).toBeInTheDocument();
  });

  it("executes the current editor text from the keyboard shortcut after edits", async () => {
    mockSuccessfulQuery("select account limit 2", [
      ["Assets:Cash"],
      ["Assets:Bank"],
    ]);
    renderPage();

    await waitFor(() => {
      expect(monacoHarness.commandHandler).not.toBeNull();
    });

    const editor = screen.getByTestId("bql-editor");
    fireEvent.change(editor, {
      target: { value: "select account limit 2" },
    });

    await act(async () => {
      monacoHarness.commandHandler?.();
    });

    await waitFor(() => {
      expect(mockExecuteQuery).toHaveBeenCalledTimes(1);
    });

    expect(mockExecuteQuery).toHaveBeenCalledWith({
      variables: {
        ledgerId: "open_ledger/example",
        query: "select account limit 2",
      },
    });
    expect(mockNavigate).toHaveBeenCalledWith({
      to: ".",
      search: { query: "select account limit 2" },
      replace: true,
    });
  });

  it("keeps using the latest editor text across successive shortcut runs", async () => {
    renderPage();

    await waitFor(() => {
      expect(monacoHarness.commandHandler).not.toBeNull();
    });

    const editor = screen.getByTestId("bql-editor");

    mockSuccessfulQuery("select account limit 2", [["Assets:Cash"]]);
    fireEvent.change(editor, {
      target: { value: "select account limit 2" },
    });
    await act(async () => {
      monacoHarness.commandHandler?.();
    });
    await waitFor(() => {
      expect(mockExecuteQuery).toHaveBeenCalledTimes(1);
    });

    mockSuccessfulQuery("select account limit 3", [
      ["Assets:Cash"],
      ["Assets:Bank"],
      ["Liabilities:Credit"],
    ]);
    fireEvent.change(editor, {
      target: { value: "select account limit 3" },
    });
    await act(async () => {
      monacoHarness.commandHandler?.();
    });

    await waitFor(() => {
      expect(mockExecuteQuery).toHaveBeenCalledTimes(2);
    });
    expect(mockExecuteQuery).toHaveBeenLastCalledWith({
      variables: {
        ledgerId: "open_ledger/example",
        query: "select account limit 3",
      },
    });
  });

  it("executes the same current text from the button", async () => {
    mockSuccessfulQuery("select account limit 2", [
      ["Assets:Cash"],
      ["Assets:Bank"],
    ]);
    renderPage();

    const editor = screen.getByTestId("bql-editor");
    fireEvent.change(editor, {
      target: { value: "select account limit 2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "bql.executeQuery" }));

    await waitFor(() => {
      expect(mockExecuteQuery).toHaveBeenCalledTimes(1);
    });
    expect(mockExecuteQuery).toHaveBeenCalledWith({
      variables: {
        ledgerId: "open_ledger/example",
        query: "select account limit 2",
      },
    });
  });

  it("treats empty editor text as a no-op for shortcut and button", async () => {
    renderPage();

    await waitFor(() => {
      expect(monacoHarness.commandHandler).not.toBeNull();
    });

    const editor = screen.getByTestId("bql-editor");
    fireEvent.change(editor, { target: { value: "   " } });

    expect(
      screen.getByRole("button", { name: "bql.executeQuery" }),
    ).toBeDisabled();

    await act(async () => {
      monacoHarness.commandHandler?.();
    });

    expect(mockExecuteQuery).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("restores editor text and executes from a bookmarked URL query", async () => {
    searchQuery = "select account limit 2";
    mockSuccessfulQuery("select account limit 2", [
      ["Assets:Cash"],
      ["Assets:Bank"],
    ]);

    renderPage();

    expect(screen.getByTestId("bql-editor")).toHaveValue(
      "select account limit 2",
    );

    await waitFor(() => {
      expect(mockExecuteQuery).toHaveBeenCalledTimes(1);
    });
    expect(mockExecuteQuery).toHaveBeenCalledWith({
      variables: {
        ledgerId: "open_ledger/example",
        query: "select account limit 2",
      },
    });

    await waitFor(() => {
      expect(
        screen.getByTestId("history-select account limit 2"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("export-select account limit 2"),
      ).toHaveTextContent("Export select account limit 2");
    });
  });

  it("does not duplicate execution when submit updates the URL", async () => {
    mockSuccessfulQuery("select account limit 2", [["Assets:Cash"]]);
    const { rerender } = renderPage();

    const editor = screen.getByTestId("bql-editor");
    fireEvent.change(editor, {
      target: { value: "select account limit 2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "bql.executeQuery" }));

    await waitFor(() => {
      expect(mockExecuteQuery).toHaveBeenCalledTimes(1);
    });

    searchQuery = "select account limit 2";
    rerender(<LedgerQueryPage />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockExecuteQuery).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("bql-editor")).toHaveValue(
      "select account limit 2",
    );
  });

  it("updates the editor when the URL query changes externally", async () => {
    mockSuccessfulQuery("select account limit 2", [["Assets:Cash"]]);
    const { rerender } = renderPage();

    await waitFor(() => {
      expect(monacoHarness.commandHandler).not.toBeNull();
    });

    expect(screen.getByTestId("bql-editor")).toHaveValue(
      "select * from accounts",
    );

    searchQuery = "select account limit 2";
    mockSuccessfulQuery("select account limit 2", [
      ["Assets:Cash"],
      ["Assets:Bank"],
    ]);
    rerender(<LedgerQueryPage />);

    await waitFor(() => {
      expect(screen.getByTestId("bql-editor")).toHaveValue(
        "select account limit 2",
      );
      expect(mockExecuteQuery).toHaveBeenCalledWith({
        variables: {
          ledgerId: "open_ledger/example",
          query: "select account limit 2",
        },
      });
    });
  });

  it("preserves an in-progress draft across unrelated rerenders", async () => {
    const { rerender } = renderPage();

    const editor = screen.getByTestId("bql-editor");
    fireEvent.change(editor, {
      target: { value: "select account limit 9" },
    });

    expect(editor).toHaveValue("select account limit 9");

    rerender(<LedgerQueryPage />);

    expect(screen.getByTestId("bql-editor")).toHaveValue(
      "select account limit 9",
    );
    expect(mockExecuteQuery).not.toHaveBeenCalled();
  });

  it("recovers from an invalid query and keeps history tied to each executed query", async () => {
    renderPage();

    const editor = screen.getByTestId("bql-editor");

    mockExecuteQuery.mockResolvedValueOnce({
      data: null,
      error: new Error("Invalid BQL"),
    });
    fireEvent.change(editor, { target: { value: "select from" } });
    fireEvent.click(screen.getByRole("button", { name: "bql.executeQuery" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Invalid BQL");
      expect(screen.getByTestId("history-select from")).toBeInTheDocument();
    });

    mockSuccessfulQuery("select account limit 2", [
      ["Assets:Cash"],
      ["Assets:Bank"],
    ]);
    fireEvent.change(editor, {
      target: { value: "select account limit 2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "bql.executeQuery" }));

    await waitFor(() => {
      expect(
        screen.getByTestId("history-select account limit 2"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("export-select account limit 2"),
      ).toHaveTextContent("Export select account limit 2");
      expect(screen.getByTestId("history-select from")).toBeInTheDocument();
    });
  });
});
