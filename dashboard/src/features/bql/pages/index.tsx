import { PageHeader } from "@/common/components/page-header";
import { RelatedLinks } from "@/common/components/related-links";
import {
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
  useRef,
} from "react";
import { QueryShellDocument } from "@/graphql/definitions";
import {
  type QueryShellQuery,
  type QueryShellQueryVariables,
} from "@/graphql/definitions";
import { useLazyQuery } from "@apollo/client/react";
import { useParams, useNavigate, useSearch } from "@tanstack/react-router";
import { Button } from "@/common/components/ui/button";
import { MonacoEditor as Editor } from "@/common/components/monaco-editor";
import type * as monacoType from "monaco-editor";
import { useIsDarkTheme } from "@/common/hooks/use-theme";
import { createLedgerId } from "@/common/lib/utils/encode";
import { useTranslations } from "@/common/hooks/use-translations";
import { useQueryHistory } from "../hooks/use-query-history";
import { QueryResultCard } from "../components/query-result-card";
import { BQL_LANGUAGE_ID, registerBqlLanguage } from "../lib/bql-language";
import { useLedger } from "@/common/hooks/use-ledger";
import { track } from "@/common/analytics";
import {
  BQL_QUERY_SNIPPETS,
  bqlQuerySnippetRange,
  shouldOfferBqlQuerySnippets,
} from "../lib/bql-completion-snippets";

const DEFAULT_QUERY = "select * from accounts";

export default function LedgerQueryPage() {
  const { t } = useTranslations();
  const { ledgerOwner, ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/query",
  });
  const ledgerId = createLedgerId(ledgerOwner, ledgerName);
  const { ledgerName: ledgerDisplayName } = useLedger();
  const navigate = useNavigate({
    from: "/ledger/$ledgerOwner/$ledgerName/query",
  });
  const searchParams = useSearch({
    from: "/ledger/$ledgerOwner/$ledgerName/query",
  });
  const urlQuery = searchParams.query;

  const [queryText, setQueryText] = useState(() =>
    urlQuery?.trim() ? urlQuery.trim() : DEFAULT_QUERY,
  );
  const isDarkTheme = useIsDarkTheme();
  const { history, addQuery, removeQuery } = useQueryHistory();

  // Cache for query results
  const [resultsCache, setResultsCache] = useState<
    Record<
      string,
      {
        data: QueryShellQuery["queryShell"];
        error?: Error;
      }
    >
  >({});

  const [executeQuery] = useLazyQuery<
    QueryShellQuery,
    QueryShellQueryVariables
  >(QueryShellDocument, {
    // An explicit run reads the ledger now; another editor may have changed
    // it since the last identical query (w4/234).
    fetchPolicy: "network-only",
  });

  // Track all in-flight queries to prevent double execution and show loading state
  const [executingQueries, setExecutingQueries] = useState<Set<string>>(
    new Set(),
  );

  const ledgerIdRef = useRef(ledgerId);
  ledgerIdRef.current = ledgerId;

  // Monaco language features are process-global; dispose page registrations
  // when this editor goes away so Journal→Back does not stack duplicate snippets.
  const monacoDisposablesRef = useRef<monacoType.IDisposable[]>([]);

  useEffect(() => {
    return () => {
      for (const disposable of monacoDisposablesRef.current) {
        disposable.dispose();
      }
      monacoDisposablesRef.current = [];
    };
  }, []);

  // Track queries we've already executed to prevent double-firing from URL sync
  const executedQueriesRef = useRef<Set<string>>(new Set());

  const executeQueryAndCache = useCallback(
    async (query: string) => {
      if (!query.trim()) return;

      const requestLedgerId = ledgerId;
      track("bql_query_executed", {});

      // Add to history and mark as executing atomically before the async call.
      // This prevents the onToggle handler from firing a duplicate execution
      // when isInitiallyOpen opens the <details> element.
      addQuery(query);
      setExecutingQueries((prev) => new Set(prev).add(query));

      try {
        const result = await executeQuery({
          variables: {
            ledgerId: requestLedgerId,
            query: query.trim(),
          },
        }).retain();

        // A ledger switch (or remount) must not accept a late previous result.
        if (ledgerIdRef.current !== requestLedgerId) {
          return;
        }

        if (result.data?.queryShell) {
          setResultsCache((prev) => ({
            ...prev,
            [query]: { data: result.data!.queryShell },
          }));
        }

        if (result.error) {
          setResultsCache((prev) => ({
            ...prev,
            [query]: {
              data: null,
              error: result.error as Error,
            },
          }));
        }
      } catch (err) {
        if (ledgerIdRef.current !== requestLedgerId) {
          return;
        }
        setResultsCache((prev) => ({
          ...prev,
          [query]: {
            data: null,
            error: err as Error,
          },
        }));
      } finally {
        if (ledgerIdRef.current === requestLedgerId) {
          setExecutingQueries((prev) => {
            const next = new Set(prev);
            next.delete(query);
            return next;
          });
        }
      }
    },
    [executeQuery, ledgerId, addQuery],
  );

  // Use a ref so the useEffect doesn't depend on executeQueryAndCache's identity
  const executeRef = useRef(executeQueryAndCache);
  executeRef.current = executeQueryAndCache;

  // Drop prior-ledger result/execution state when the ledger identity changes
  // (remountDeps also resets this on the route; keep the page self-contained).
  useEffect(() => {
    setResultsCache({});
    setExecutingQueries(new Set());
    executedQueriesRef.current = new Set();
  }, [ledgerId]);

  const submitQuery = useCallback(
    (rawQuery: string) => {
      if (!rawQuery.trim()) return;

      const q = rawQuery.trim();
      // Mark as executed so the URL useEffect won't re-execute it
      executedQueriesRef.current.add(q);

      // Update URL for bookmarkability
      void navigate({
        to: ".",
        search: { query: q },
        replace: true,
      });

      // Execute query
      void executeQueryAndCache(q);
    },
    [navigate, executeQueryAndCache],
  );

  // Keep the latest submitter for Monaco's one-shot onMount command registration
  const submitQueryRef = useRef(submitQuery);
  submitQueryRef.current = submitQuery;

  // Auto-execute query from URL on mount, when the bookmarked query changes,
  // or when the ledger identity changes while the query text is retained.
  useEffect(() => {
    if (urlQuery && urlQuery.trim()) {
      const q = urlQuery.trim();
      // This page's own submission reaching the URL: it already ran, and the
      // editor may hold a newer draft typed while the navigation finished.
      // Tidy only the submitted text itself (w4/989).
      if (executedQueriesRef.current.has(q)) {
        executedQueriesRef.current.delete(q);
        setQueryText((current) => (current.trim() === q ? q : current));
        return;
      }
      setQueryText(q);
      void executeRef.current(q);
    }
  }, [urlQuery, ledgerId]);

  const handleSubmit = () => {
    submitQuery(queryText);
  };

  // Returned, so a card's retry stays busy until its read settles.
  const handleExecuteFromHistory = (query: string) =>
    executeQueryAndCache(query);

  // Deleting a card unmounts the focused Delete button. Hand focus to the
  // card that takes its place, else the one before it, else the editor
  // (w4/988). Only a deletion arms this; running a query reorders history
  // without moving focus (w4/253).
  const editorRef = useRef<monacoType.editor.IStandaloneCodeEditor | null>(
    null,
  );
  const historyListRef = useRef<HTMLDivElement>(null);
  const focusAfterDelete = useRef<number | null>(null);
  useLayoutEffect(() => {
    const index = focusAfterDelete.current;
    if (index === null) return;
    focusAfterDelete.current = null;
    const active = document.activeElement;
    if (active && active !== document.body) return;
    const summaries =
      historyListRef.current?.querySelectorAll<HTMLElement>("summary") ?? [];
    const card = summaries[Math.min(index, summaries.length - 1)];
    if (card) card.focus();
    else editorRef.current?.focus();
  }, [history]);

  const handleDeleteQuery = (query: string) => {
    focusAfterDelete.current = history.indexOf(query);
    removeQuery(query);
    // Also remove from results cache
    setResultsCache((prev) => {
      const updated = { ...prev };
      delete updated[query];
      return updated;
    });
  };

  return (
    <div className="container mx-auto space-y-6">
      <PageHeader
        title={t("page.bql.query")}
        description={t("common.pageDescription.query", {
          ledgerName: ledgerDisplayName ?? ledgerName,
        })}
      />
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="border border-input rounded-md overflow-hidden">
            <Editor
              height="200px"
              defaultLanguage={BQL_LANGUAGE_ID}
              value={queryText}
              onChange={(value) => setQueryText(value || "")}
              onMount={(editor, monaco: typeof monacoType) => {
                editorRef.current = editor;
                // Add keyboard shortcut for executing query
                editor.addCommand(
                  monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
                  () => {
                    const text = editor.getValue();
                    setQueryText(text);
                    submitQueryRef.current(text);
                  },
                );

                // BQL's own language: block comments only, so the comment
                // shortcut never emits the `--` the engine rejects.
                const languageDisposables = registerBqlLanguage(monaco);

                // Add Beancount-specific keywords
                const completionProvider =
                  monaco.languages.registerCompletionItemProvider(
                    BQL_LANGUAGE_ID,
                    {
                      provideCompletionItems: (model, position) => {
                        const word = model.getWordUntilPosition(position);
                        const lineContent = model.getLineContent(
                          position.lineNumber,
                        );
                        if (!shouldOfferBqlQuerySnippets(lineContent, word)) {
                          return { suggestions: [] };
                        }
                        const range = bqlQuerySnippetRange(
                          position.lineNumber,
                          word,
                        );
                        const suggestions = BQL_QUERY_SNIPPETS.map(
                          (snippet) => ({
                            label: snippet.label,
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText: snippet.insertText,
                            documentation: snippet.documentation,
                            range,
                          }),
                        );
                        return { suggestions };
                      },
                    },
                  );

                for (const disposable of monacoDisposablesRef.current) {
                  disposable.dispose();
                }
                monacoDisposablesRef.current = [
                  ...languageDisposables,
                  completionProvider,
                ].filter(Boolean) as monacoType.IDisposable[];

                editor.onDidDispose(() => {
                  if (editorRef.current === editor) editorRef.current = null;
                  for (const disposable of monacoDisposablesRef.current) {
                    disposable.dispose();
                  }
                  monacoDisposablesRef.current = [];
                });

                // Monaco can finish loading after the reader has moved on, to
                // a bookmarked query's result, say; taking focus then sent
                // their next key to the editor (w4/974). Focus it only while
                // nothing else has focus.
                const active = document.activeElement;
                if (!active || active === document.body) editor.focus();
              }}
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: "on",
                lineNumbers: "on",
                folding: false,
                // lineDecorationsWidth: 0,
                // lineNumbersMinChars: 0,
                fontSize: 14,
                fontFamily:
                  "Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace",
                padding: { top: 16, bottom: 16 },
                suggest: {
                  showKeywords: true,
                  showSnippets: true,
                },
                quickSuggestions: {
                  other: true,
                  comments: false,
                  strings: false,
                },
              }}
              theme={isDarkTheme ? "vs-dark" : "light"}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {t("bql.queryShortcutHint")}
          </p>
        </div>

        <Button
          onClick={handleSubmit}
          loading={executingQueries.size > 0}
          disabled={!queryText.trim()}
          className="w-full"
        >
          {t("bql.executeQuery")}
        </Button>
      </div>

      {history.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{t("bql.queryHistory")}</h3>
          <div ref={historyListRef} className="space-y-3">
            {history.map((query, index) => {
              const cached = resultsCache[query];

              return (
                <QueryResultCard
                  // The query string is unique in history; keying by it keeps a card
                  // (and its focus and open state) when running it reorders the list
                  // (w4/253).
                  key={query}
                  query={query}
                  result={cached?.data || null}
                  error={cached?.error}
                  loading={executingQueries.has(query)}
                  isInitiallyOpen={index === 0}
                  onExecute={handleExecuteFromHistory}
                  onDelete={handleDeleteQuery}
                />
              );
            })}
          </div>
        </div>
      )}

      {history.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {t("bql.noQueryHistory")}
        </div>
      )}

      <RelatedLinks
        links={[
          {
            label: t("common.relatedLinks.journal"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/journal`,
          },
          {
            label: t("common.relatedLinks.import"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/import`,
          },
          {
            label: t("common.relatedLinks.statistics"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/statistics`,
          },
        ]}
      />
    </div>
  );
}
