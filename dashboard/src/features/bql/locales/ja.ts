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
    message: "行数: {count}",
    description: "Row count for large query results",
  },
  "bql.errors.unknownColumn": {
    message:
      "不明な列「{column}」です。このクエリで選択できる列と綴りを照合してください。",
    description:
      "Query error naming a column the query referenced that does not exist; {column} is the identifier from the query",
  },
  "bql.errors.syntaxError": {
    message:
      "文字 {position} の「{token}」付近に構文エラーがあります。その位置からクエリを確認してください。",
    description:
      "Query error for a BQL parse failure; {token} is the unexpected token and {position} its 1-based character position in the query",
  },
  "bql.errors.ungroupedColumn": {
    message:
      "「{column}」は {groupBy} に含めるか、{sum} や {first} などの集計関数で囲む必要があります。",
    description:
      "Query error for a column that is neither in GROUP BY nor aggregated; {column} is the identifier, {groupBy}, {sum} and {first} are BQL keywords left untranslated",
  },
  "bql.errors.unknownFunction": {
    message: "「{name}」という BQL 関数はありません。綴りを確認してください。",
    description:
      "Query error naming a BQL function that does not exist; {name} is the function name from the query",
  },
  "bql.errors.unknownTable": {
    message:
      "「{table}」という名前のテーブルはありません。システムテーブルは {accounts} や {prices} のように # で始まります。",
    description:
      "Query error naming a table that does not exist; {table} is the name from the query, {accounts} and {prices} are example system table names left untranslated",
  },
  "bql.errors.argumentCount_other": {
    message: "{name}() の引数は {count} 個です（{got} 個ではありません）。",
    description:
      "Query error for a function called with the wrong number of arguments; {name} is the function, {count} the number it takes and {got} the number the query gave",
  },
  "bql.errors.typeError": {
    message:
      "この比較または関数に対して値の型が正しくありません。列または関数が返す値を確認してください。",
    description:
      "Query error when a value has the wrong type for a comparison or function",
  },
  "page.bql.query": {
    message: "クエリ",
    description: "Sidebar navigation label for the BQL query page",
  },
  "page.bql.queryResult": {
    message: "クエリ結果",
    description: "Label for a query result section header",
  },
  "page.bql.largeResultHint": {
    message:
      "ここでは表示中の行のみ利用できます。CSV ファイルにはすべての行が含まれます（合計：{count}）。",
    description:
      "Screen-reader note on a result too long to render every row; {count} is the total row count",
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
