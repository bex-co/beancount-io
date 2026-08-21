import { PageHeader } from "@/common/components/page-header";
import { RelatedLinks } from "@/common/components/related-links";
import { useState, useEffect, useCallback, useRef } from "react";
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
import { useLedger } from "@/common/hooks/use-ledger";
import { track } from "@/common/analytics";
import { LedgerPageSEO } from "@/common/components/seo/ledger-page-seo";

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

  const [queryText, setQueryText] = useState("select * from accounts");
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
  >(QueryShellDocument);

  // Track all in-flight queries to prevent double execution and show loading state
  const [executingQueries, setExecutingQueries] = useState<Set<string>>(
    new Set(),
  );

  const executeQueryAndCache = useCallback(
    async (query: string) => {
      if (!query.trim()) return;

      track("bql_query_executed", {});

      // Add to history and mark as executing atomically before the async call.
      // This prevents the onToggle handler from firing a duplicate execution
      // when isInitiallyOpen opens the <details> element.
      addQuery(query);
      setExecutingQueries((prev) => new Set(prev).add(query));

      try {
        const result = await executeQuery({
          variables: {
            ledgerId: ledgerId,
            query: query.trim(),
          },
        });

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
        setResultsCache((prev) => ({
          ...prev,
          [query]: {
            data: null,
            error: err as Error,
          },
        }));
      } finally {
        setExecutingQueries((prev) => {
          const next = new Set(prev);
          next.delete(query);
          return next;
        });
      }
    },
    [executeQuery, ledgerId, addQuery],
  );

  // Use a ref so the useEffect doesn't depend on executeQueryAndCache's identity
  const executeRef = useRef(executeQueryAndCache);
  executeRef.current = executeQueryAndCache;

  // Auto-execute query from URL on mount or when URL query changes externally
  useEffect(() => {
    if (urlQuery && urlQuery.trim()) {
      const q = urlQuery.trim();
      // Skip if this query was already executed by handleSubmit
      if (executedQueriesRef.current.has(q)) {
        executedQueriesRef.current.delete(q);
        return;
      }
      void executeRef.current(q);
    }
  }, [urlQuery]);

  // Track queries we've already executed to prevent double-firing from URL sync
  const executedQueriesRef = useRef<Set<string>>(new Set());

  const handleSubmit = () => {
    if (queryText.trim()) {
      const q = queryText.trim();
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
    }
  };

  const handleExecuteFromHistory = (query: string) => {
    void executeQueryAndCache(query);
  };

  const handleDeleteQuery = (query: string) => {
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
      <LedgerPageSEO seoKey="ledgerQuery" noIndex />
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
              defaultLanguage="sql"
              value={queryText}
              onChange={(value) => setQueryText(value || "")}
              onMount={(editor, monaco: typeof monacoType) => {
                // Add keyboard shortcut for executing query
                editor.addCommand(
                  monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
                  () => {
                    handleSubmit();
                  },
                );

                // Configure Beancount/SQL syntax highlighting
                monaco.languages.setLanguageConfiguration("sql", {
                  comments: {
                    lineComment: "--",
                    blockComment: ["/*", "*/"],
                  },
                  brackets: [
                    ["{", "}"],
                    ["[", "]"],
                    ["(", ")"],
                  ],
                  autoClosingPairs: [
                    { open: "{", close: "}" },
                    { open: "[", close: "]" },
                    { open: "(", close: ")" },
                    { open: '"', close: '"' },
                    { open: "'", close: "'" },
                  ],
                  surroundingPairs: [
                    { open: "{", close: "}" },
                    { open: "[", close: "]" },
                    { open: "(", close: ")" },
                    { open: '"', close: '"' },
                    { open: "'", close: "'" },
                  ],
                });

                // Add Beancount-specific keywords
                monaco.languages.registerCompletionItemProvider("sql", {
                  provideCompletionItems: (_model, position) => {
                    const suggestions = [
                      {
                        label: "select * from accounts",
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: "select * from accounts",
                        documentation: "Select all accounts",
                        range: {
                          startLineNumber: position.lineNumber,
                          endLineNumber: position.lineNumber,
                          startColumn: position.column,
                          endColumn: position.column,
                        },
                      },
                      {
                        label: "select * from entries",
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: "select * from entries",
                        documentation: "Select all entries",
                        range: {
                          startLineNumber: position.lineNumber,
                          endLineNumber: position.lineNumber,
                          startColumn: position.column,
                          endColumn: position.column,
                        },
                      },
                      {
                        label: "select * from transactions",
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: "select * from transactions",
                        documentation: "Select all transactions",
                        range: {
                          startLineNumber: position.lineNumber,
                          endLineNumber: position.lineNumber,
                          startColumn: position.column,
                          endColumn: position.column,
                        },
                      },
                      {
                        label: "select * from balances",
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: "select * from balances",
                        documentation: "Select all balances",
                        range: {
                          startLineNumber: position.lineNumber,
                          endLineNumber: position.lineNumber,
                          startColumn: position.column,
                          endColumn: position.column,
                        },
                      },
                    ];
                    return { suggestions };
                  },
                });

                editor.focus();
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
          <div className="space-y-3">
            {history.map((query, index) => {
              const cached = resultsCache[query];

              return (
                <QueryResultCard
                  key={`${query}-${index}`}
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
