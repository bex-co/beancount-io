export interface TranslationEntry {
  message: string;
  description: string;
}

const ptBql: Record<string, TranslationEntry> = {
  "bql.executeQuery": {
    message: "Executar Consulta",
    description: "Button text to execute query",
  },
  "bql.executing": {
    message: "Executando...",
    description: "Button text when query is executing",
  },
  "bql.queryShortcutHint": {
    message:
      "Pressione Cmd+Enter (Mac) ou Ctrl+Enter (Windows/Linux) para executar a consulta",
    description: "Hint text for query keyboard shortcut",
  },
  "bql.queryHistory": {
    message: "Histórico de Consultas",
    description: "Section title for query history",
  },
  "bql.downloadCSV": {
    message: "Baixar CSV",
    description: "Button text to download query results as CSV",
  },
  "bql.noQueryHistory": {
    message:
      "Nenhuma consulta executada ainda. Digite uma consulta acima para começar.",
    description: "Empty state message when no queries have been executed",
  },
  "bql.deleteQuery": {
    message: "Excluir consulta",
    description: "Button text to delete a query from history",
  },
  "bql.rowCount": {
    message: "{count} linhas",
    description: "Row count for large query results",
  },
  "page.bql.query": {
    message: "Consulta",
    description: "Sidebar navigation label for the BQL query page",
  },
  "page.bql.queryResult": {
    message: "Resultado da Consulta",
    description: "Label for a query result section header",
  },
  "page.bql.unknownResultType": {
    message: "Tipo de resultado desconhecido",
    description: "Message when query result type is not recognized",
  },
  "page.bql.noDataReturnedFromQuery": {
    message: "Nenhum dado retornado da consulta",
    description: "Message when a query returns no data",
  },
};

export default ptBql;
