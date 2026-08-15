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
    message: "{count}행",
    description: "Row count for large query results",
  },
  "page.bql.query": {
    message: "쿼리",
    description: "Sidebar navigation label for the BQL query page",
  },
  "page.bql.queryResult": {
    message: "쿼리 결과",
    description: "Label for a query result section header",
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
