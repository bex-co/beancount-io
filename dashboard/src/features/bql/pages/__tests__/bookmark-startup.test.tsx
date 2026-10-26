import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let seededHistory: string[] = [];
let urlQuery: string | undefined;

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ ledgerOwner: "open_ledger", ledgerName: "example" }),
  useSearch: () => ({ query: urlQuery }),
  useNavigate: () => vi.fn(),
  ClientOnly: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));
vi.mock("@/common/hooks/use-theme", () => ({ useIsDarkTheme: () => false }));
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerName: "example" }),
}));
vi.mock("@/common/hooks/use-local-storage-state", () => ({
  useLocalStorageState: () => {
    const [state, setState] = useState(seededHistory);
    return [state, setState, vi.fn()];
  },
}));
vi.mock("@/common/analytics", () => ({ track: vi.fn() }));
vi.mock("@/common/components/page-header", () => ({ PageHeader: () => null }));
vi.mock("@/common/components/related-links", () => ({
  RelatedLinks: () => <a href="#journal">Journal</a>,
}));
vi.mock("@/common/components/monaco-editor", () => ({
  MonacoEditor: ({
    value,
    onMount,
  }: {
    value: string;
    onMount?: (editor: unknown, monaco: unknown) => void;
  }) => {
    const input = useRef<HTMLTextAreaElement>(null);
    useEffect(() => {
      onMount?.(
        {
          getValue: () => input.current?.value ?? "",
          addCommand: vi.fn(),
          focus: () => input.current?.focus(),
          onDidDispose: vi.fn(),
        },
        {
          KeyMod: { CtrlCmd: 2048 },
          KeyCode: { Enter: 3 },
          languages: {
            getLanguages: () => [],
            register: vi.fn(),
            setMonarchTokensProvider: vi.fn(),
            setLanguageConfiguration: vi.fn(),
            registerCompletionItemProvider: vi.fn(),
            CompletionItemKind: { Snippet: 27 },
          },
        },
      );
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return (
      <textarea ref={input} aria-label="bql-editor" value={value} readOnly />
    );
  },
}));

import LedgerQueryPage from "../index";

const query = (label: string) =>
  `SELECT 'qa-20261022-history-${label}' AS label LIMIT 1`;
const [A, B] = ["A", "B"].map(query);

type Reply = "ok" | "fail" | "hold";

/**
 * A QueryShell that answers each query with its label and counts runs.
 * `reply` decides each run (default: answer at once); a held run waits for
 * `release`.
 */
function shellClient(reply: (text: string, run: number) => Reply = () => "ok") {
  const runs: string[] = [];
  const held: ((ok: boolean) => void)[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          const text = String(operation.variables.query);
          runs.push(text);
          const answer = (ok: boolean) => {
            if (!ok) return observer.error(new TypeError("Failed to fetch"));
            observer.next({
              data: {
                queryShell: {
                  __typename: "QueryShellResult",
                  resultType: "table",
                  table: {
                    __typename: "QueryTable",
                    types: [
                      {
                        __typename: "QueryColumn",
                        name: "label",
                        dtype: "str",
                      },
                    ],
                    rows: [[text.match(/history-(\w)/)?.[1] ?? "accounts"]],
                    t: null,
                  },
                  text: null,
                  chart: null,
                },
              },
            });
            observer.complete();
          };
          const decision = reply(text, runs.length);
          if (decision === "hold") held.push(answer);
          else answer(decision === "ok");
        }),
    ),
  });
  return {
    client,
    runs,
    /** Settles every held run (Apollo may send one execution twice). */
    release: (ok: boolean) =>
      act(() => held.splice(0).forEach((answer) => answer(ok))),
  };
}

function renderPage(reply?: (text: string, run: number) => Reply) {
  const { client, runs, release } = shellClient(reply);
  render(
    <ApolloProvider client={client}>
      <LedgerQueryPage />
    </ApolloProvider>,
  );
  return { runs, release };
}

/** The history card whose summary shows this query. */
const card = (text: string) =>
  screen.getByText(text, { selector: "pre" }).closest("details")!
    .parentElement!;
const summary = (text: string) =>
  within(card(text)).getByText(text, { selector: "pre" }).closest("summary")!;
const shown = () =>
  Array.from(document.querySelectorAll("summary pre")).map(
    (pre) => pre.textContent,
  );

/**
 * Opening a saved query URL runs that query — and only it. Opening a stored
 * card whose result is not loaded runs its query, so the newest stored card
 * must not open itself on startup when the URL asks for a different, older
 * query (w4/1098).
 */
describe("BQL bookmark startup", () => {
  beforeEach(() => {
    urlQuery = undefined;
    seededHistory = [];
  });

  const opened = (text: string) =>
    (card(text).querySelector("details") as HTMLDetailsElement).open;

  it("runs only an older bookmarked query, leaving the newer one closed", async () => {
    seededHistory = [A, B];
    urlQuery = B;
    const { runs } = renderPage();

    await waitFor(() => expect(shown()).toEqual([B, A]));
    await waitFor(() => expect(opened(B)).toBe(true));
    // Let any toggle-triggered run happen before counting.
    await act(async () => new Promise((resolve) => setTimeout(resolve, 20)));
    expect(runs).toEqual([B]);
    expect(opened(A)).toBe(false);

    // A still runs when the reader opens it.
    await userEvent.setup().click(summary(A));
    await waitFor(() => expect(runs).toEqual([B, A]));
  });

  it("runs the bookmarked query once when it already heads the history", async () => {
    seededHistory = [B, A];
    urlQuery = B;
    const { runs } = renderPage();
    await waitFor(() => expect(opened(B)).toBe(true));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 20)));
    expect(runs).toEqual([B]);
    expect(opened(A)).toBe(false);
  });

  it("runs a bookmarked query with no stored history", async () => {
    urlQuery = B;
    const { runs } = renderPage();
    await waitFor(() => expect(shown()).toEqual([B]));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 20)));
    expect(runs).toEqual([B]);
  });

  it("still opens and runs the newest stored query without a URL query", async () => {
    seededHistory = [A, B];
    const { runs } = renderPage();
    await waitFor(() => expect(runs).toEqual([A]));
    expect(opened(A)).toBe(true);
    expect(opened(B)).toBe(false);
  });
});
