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
    message: "行数：{count}",
    description: "Row count for large query results",
  },
  "bql.errors.unknownColumn": {
    message: "未知列“{column}”。请对照此查询可选择的列检查其拼写。",
    description:
      "Query error naming a column the query referenced that does not exist; {column} is the identifier from the query",
  },
  "bql.errors.syntaxError": {
    message:
      "第 {position} 个字符的“{token}”附近存在语法错误。请从该位置开始检查查询。",
    description:
      "Query error for a BQL parse failure; {token} is the unexpected token and {position} its 1-based character position in the query",
  },
  "bql.errors.ungroupedColumn": {
    message:
      "“{column}”必须写在 {groupBy} 中，或放在 {sum}、{first} 等聚合函数内。",
    description:
      "Query error for a column that is neither in GROUP BY nor aggregated; {column} is the identifier, {groupBy}, {sum} and {first} are BQL keywords left untranslated",
  },
  "bql.errors.unknownFunction": {
    message: "没有名为“{name}”的 BQL 函数。请检查拼写。",
    description:
      "Query error naming a BQL function that does not exist; {name} is the function name from the query",
  },
  "bql.errors.unknownTable": {
    message:
      "没有名为“{table}”的表。系统表以 # 开头，例如 {accounts} 或 {prices}。",
    description:
      "Query error naming a table that does not exist; {table} is the name from the query, {accounts} and {prices} are example system table names left untranslated",
  },
  "bql.errors.argumentCount_other": {
    message: "{name}() 接受 {count} 个参数，而不是 {got} 个。",
    description:
      "Query error for a function called with the wrong number of arguments; {name} is the function, {count} the number it takes and {got} the number the query gave",
  },
  "bql.errors.typeError": {
    message: "某个值的类型不适用于此比较或函数。请检查列或函数返回的内容。",
    description:
      "Query error when a value has the wrong type for a comparison or function",
  },
  "page.bql.query": {
    message: "查询",
    description: "Sidebar navigation label for the BQL query page",
  },
  "page.bql.queryResult": {
    message: "查询结果",
    description: "Label for a query result section header",
  },
  "page.bql.largeResultHint": {
    message: "此处仅提供可见的行。CSV 文件包含所有行（共 {count} 行）。",
    description:
      "Screen-reader note on a result too long to render every row; {count} is the total row count",
  },
  "page.bql.unknownResultType": {
    message: "未知结果类型",
    description: "Message when query result type is not recognized",
  },
  "page.bql.noDataReturnedFromQuery": {
    message: "查询未返回数据",
    description: "Message when a query returns no data",
  },
};

export default zhBql;
