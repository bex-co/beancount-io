import type { TranslationEntry } from "@/i18n";

const jaBql: Record<string, TranslationEntry> = {
  "bql.executeQuery": {
    message: "クエリを実行",
    description: "Button text to execute query",
  },
  "bql.executing": {
    message: "実行中...",
    description: "Button text when query is executing",
  },
  "bql.queryExecutionError": {
    message: "クエリの実行中にエラーが発生しました",
    description: "Generic error message for query execution",
  },
  "bql.queryResults": {
    message: "クエリ結果",
    description: "Section title for query results",
  },
  "bql.queryShortcutHint": {
    message: "Cmd+Enter（Mac）またはCtrl+Enter（Windows/Linux）でクエリを実行",
    description: "Hint text for query keyboard shortcut",
  },
  "bql.queryHistory": {
    message: "クエリ履歴",
    description: "Section title for query history",
  },
  "bql.downloadCSV": {
    message: "CSVをダウンロード",
    description: "Button text to download query results as CSV",
  },
  "bql.noQueryHistory": {
    message:
      "まだクエリが実行されていません。上にクエリを入力して始めてください。",
    description: "Empty state message when no queries have been executed",
  },
  "bql.deleteQuery": {
    message: "クエリを削除",
    description: "Button text to delete a query from history",
  },
  "bql.rowCount": {
    message: "{count}行",
    description: "Row count for large query results",
  },
  "page.bql.query": {
    message: "クエリ",
    description: "Sidebar navigation label for the BQL query page",
  },
  "page.bql.queryResult": {
    message: "クエリ結果",
    description: "Label for a query result section header",
  },
  "page.bql.unknownResultType": {
    message: "不明な結果タイプ",
    description: "Message when query result type is not recognized",
  },
  "page.bql.noDataReturnedFromQuery": {
    message: "クエリからデータが返されませんでした",
    description: "Message when a query returns no data",
  },
};

export default jaBql;
