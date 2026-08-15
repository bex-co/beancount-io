export interface TranslationEntry {
  message: string;
  description: string;
}

const zhBql: Record<string, TranslationEntry> = {
  "bql.executeQuery": {
    message: "执行查询",
    description: "Button text to execute query",
  },
  "bql.executing": {
    message: "执行中...",
    description: "Button text when query is executing",
  },
  "bql.queryShortcutHint": {
    message: "按 Cmd+Enter（Mac）或 Ctrl+Enter（Windows/Linux）执行查询",
    description: "Hint text for query keyboard shortcut",
  },
  "bql.queryHistory": {
    message: "查询历史",
    description: "Section title for query history",
  },
  "bql.downloadCSV": {
    message: "下载 CSV",
    description: "Button text to download query results as CSV",
  },
  "bql.noQueryHistory": {
    message: "还没有执行过查询。在上方输入查询开始使用。",
    description: "Empty state message when no queries have been executed",
  },
  "bql.deleteQuery": {
    message: "删除查询",
    description: "Button text to delete a query from history",
  },
  "bql.rowCount": {
    message: "{count} 行",
    description: "Row count for large query results",
  },
  "page.bql.query": {
    message: "查询",
    description: "Sidebar navigation label for the BQL query page",
  },
  "page.bql.queryResult": {
    message: "查询结果",
    description: "Label for a query result section header",
  },
  "page.bql.unknownResultType": {
    message: "未知结果类型",
    description: "Message when query result type is not recognized",
  },
  "page.bql.noDataReturnedFromQuery": {
    message: "无数据 returned from query",
    description: "Message when a query returns no data",
  },
};

export default zhBql;
