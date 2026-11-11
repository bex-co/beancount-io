import type { TranslationEntry } from "@/i18n";

const koBql: Record<string, TranslationEntry> = {
  "bql.executeQuery": {
    message: "쿼리 실행",
    description: "Button text to execute query",
  },
  "bql.executing": {
    message: "실행 중...",
    description: "Button text when query is executing",
  },
  "bql.queryShortcutHint": {
    message: "Cmd+Enter(Mac) 또는 Ctrl+Enter(Windows/Linux)로 쿼리 실행",
    description: "Hint text for query keyboard shortcut",
  },
  "bql.queryHistory": {
    message: "쿼리 기록",
    description: "Section title for query history",
  },
  "bql.downloadCSV": {
    message: "CSV 다운로드",
    description: "Button text to download query results as CSV",
  },
  "bql.noQueryHistory": {
    message: "아직 실행된 쿼리가 없습니다. 위에 쿼리를 입력하여 시작하세요.",
    description: "Empty state message when no queries have been executed",
  },
  "bql.deleteQuery": {
    message: "쿼리 삭제",
    description: "Button text to delete a query from history",
  },
  "bql.rowCount": {
    message: "행: {count}",
    description: "Row count for large query results",
  },
  "bql.errors.unknownColumn": {
    message:
      "알 수 없는 열 “{column}”입니다. 이 쿼리에서 선택할 수 있는 열과 철자를 비교해 확인하세요.",
    description:
      "Query error naming a column the query referenced that does not exist; {column} is the identifier from the query",
  },
  "bql.errors.syntaxError": {
    message:
      "{position}번째 문자의 “{token}” 근처에 구문 오류가 있습니다. 그 위치부터 쿼리를 확인하세요.",
    description:
      "Query error for a BQL parse failure; {token} is the unexpected token and {position} its 1-based character position in the query",
  },
  "bql.errors.ungroupedColumn": {
    message:
      "“{column}”은(는) {groupBy}에 포함하거나 {sum} 또는 {first} 같은 집계 함수로 감싸야 합니다.",
    description:
      "Query error for a column that is neither in GROUP BY nor aggregated; {column} is the identifier, {groupBy}, {sum} and {first} are BQL keywords left untranslated",
  },
  "bql.errors.unknownFunction": {
    message: "“{name}”(이)라는 BQL 함수가 없습니다. 철자를 확인하세요.",
    description:
      "Query error naming a BQL function that does not exist; {name} is the function name from the query",
  },
  "bql.errors.unknownTable": {
    message:
      "“{table}”(이)라는 테이블이 없습니다. 시스템 테이블은 {accounts}나 {prices}처럼 #으로 시작합니다.",
    description:
      "Query error naming a table that does not exist; {table} is the name from the query, {accounts} and {prices} are example system table names left untranslated",
  },
  "bql.errors.argumentCount_other": {
    message: "{name}()의 인수는 {got}개가 아니라 {count}개입니다.",
    description:
      "Query error for a function called with the wrong number of arguments; {name} is the function, {count} the number it takes and {got} the number the query gave",
  },
  "bql.errors.typeError": {
    message:
      "이 비교 또는 함수에 맞지 않는 형식의 값이 있습니다. 열이나 함수가 반환하는 값을 확인하세요.",
    description:
      "Query error when a value has the wrong type for a comparison or function",
  },
  "page.bql.query": {
    message: "쿼리",
    description: "Sidebar navigation label for the BQL query page",
  },
  "page.bql.queryResult": {
    message: "쿼리 결과",
    description: "Label for a query result section header",
  },
  "page.bql.largeResultHint": {
    message:
      "여기에서는 보이는 행만 사용할 수 있습니다. CSV 파일에는 모든 행이 포함됩니다(총 {count}).",
    description:
      "Screen-reader note on a result too long to render every row; {count} is the total row count",
  },
  "page.bql.unknownResultType": {
    message: "알 수 없는 결과 유형",
    description: "Message when query result type is not recognized",
  },
  "page.bql.noDataReturnedFromQuery": {
    message: "쿼리에서 반환된 데이터가 없습니다",
    description: "Message when a query returns no data",
  },
};

export default koBql;
