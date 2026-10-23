import { render, screen, waitFor, within } from "@testing-library/react";
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

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ ledgerOwner: "open_ledger", ledgerName: "example" }),
  useSearch: () => ({ query: undefined }),
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
const [A, B, C] = ["A", "B", "C"].map(query);

/** A QueryShell that answers every query with its label, and counts runs. */
function shellClient() {
  const runs: string[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          const text = String(operation.variables.query);
          runs.push(text);
          observer.next({
            data: {
              queryShell: {
                __typename: "QueryShellResult",
                resultType: "table",
                table: {
                  __typename: "QueryTable",
                  types: [
                    { __typename: "QueryColumn", name: "label", dtype: "str" },
                  ],
                  rows: [[text.match(/history-(\w)/)![1]!]],
                  t: null,
                },
                text: null,
                chart: null,
              },
            },
          });
          observer.complete();
        }),
    ),
  });
  return { client, runs };
}

function renderPage() {
  const { client, runs } = shellClient();
  render(
    <ApolloProvider client={client}>
      <LedgerQueryPage />
    </ApolloProvider>,
  );
  return { runs };
}

/** The history card whose summary shows this query. */
const card = (text: string) =>
  screen.getByText(text, { selector: "pre" }).closest("details")!
    .parentElement!;
const summary = (text: string) =>
  within(card(text)).getByText(text, { selector: "pre" }).closest("summary")!;
const deleteButton = (text: string) =>
  within(card(text)).getByRole("button", { name: "bql.deleteQuery" });
const shown = () =>
  Array.from(document.querySelectorAll("summary pre")).map(
    (pre) => pre.textContent,
  );

/** Deleting a history card leaves focus on a query control (w4/988). */
describe("BQL history deletion focus", () => {
  beforeEach(() => {
    seededHistory = [C, B, A];
  });

  it("moves to the card that takes the deleted one's place, then the one before, then the editor", async () => {
    const user = userEvent.setup();
    const { runs } = renderPage();
    // The newest card opens and reads its result.
    await waitFor(() => expect(runs).toEqual([C.trim()]));
    const openC = card(C).querySelector("details")!;
    await waitFor(() => expect(openC.open).toBe(true));

    deleteButton(B).focus();
    await user.keyboard("{Enter}");
    expect(shown()).toEqual([C, A]);
    expect(summary(A)).toHaveFocus();
    // The remaining cards keep their nodes and state.
    expect(card(C).querySelector("details")).toBe(openC);
    expect(openC.open).toBe(true);

    // The last card: the one before it.
    deleteButton(A).focus();
    await user.keyboard("{Enter}");
    expect(shown()).toEqual([C]);
    expect(summary(C)).toHaveFocus();

    // The only card: back to the editor, its draft untouched.
    const editor = screen.getByRole("textbox", { name: "bql-editor" });
    const draft = (editor as HTMLTextAreaElement).value;
    deleteButton(C).focus();
    await user.keyboard("{Enter}");
    expect(shown()).toEqual([]);
    expect(editor).toHaveFocus();
    expect(editor).toHaveValue(draft);
    // Deleting ran nothing.
    expect(runs).toEqual([C.trim()]);
  });

  it("moves to the next card when the first is deleted", async () => {
    const user = userEvent.setup();
    renderPage();
    deleteButton(C).focus();
    await user.keyboard("{Enter}");
    expect(shown()).toEqual([B, A]);
    expect(summary(B)).toHaveFocus();
  });
});
