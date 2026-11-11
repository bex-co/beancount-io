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
    message: "Linhas: {count}",
    description: "Row count for large query results",
  },
  "bql.errors.unknownColumn": {
    message:
      "Coluna desconhecida “{column}”. Verifique a grafia em relação às colunas que esta consulta pode selecionar.",
    description:
      "Query error naming a column the query referenced that does not exist; {column} is the identifier from the query",
  },
  "bql.errors.syntaxError": {
    message:
      "Erro de sintaxe perto de “{token}” no caractere {position}. Verifique a consulta a partir desse ponto.",
    description:
      "Query error for a BQL parse failure; {token} is the unexpected token and {position} its 1-based character position in the query",
  },
  "bql.errors.invalidRegex": {
    message:
      "O padrão após ~ não é uma expressão regular válida. Verifique os colchetes e os escapes.",
    description:
      "Query error when the pattern after ~ is not a valid regular expression",
  },
  "bql.errors.dateArithmetic": {
    message:
      "Este mecanismo de consultas não consegue somar ou subtrair dias com + ou -. Use {dateAdd} para deslocar uma data e {dateDiff} para contar os dias entre duas datas.",
    description:
      "Query error for date arithmetic with + or -; {dateAdd} and {dateDiff} are BQL functions left untranslated",
  },
  "bql.errors.stringConcat": {
    message:
      "Este mecanismo de consultas não consegue unir texto com +. Combine os valores fora da consulta.",
    description:
      "Query error for joining text with +, which this query engine does not support",
  },
  "bql.errors.idColumn": {
    message:
      "A coluna “{column}” não é suportada aqui. Filtre pela data, descrição ou conta do lançamento.",
    description:
      "Query error for the id column, which this query engine does not support; {column} is the column name",
  },
  "bql.errors.ungroupedColumn": {
    message:
      "“{column}” deve constar em {groupBy} ou dentro de uma função de agregação como {sum} ou {first}.",
    description:
      "Query error for a column that is neither in GROUP BY nor aggregated; {column} is the identifier, {groupBy}, {sum} and {first} are BQL keywords left untranslated",
  },
  "bql.errors.unknownFunction": {
    message:
      "Não existe nenhuma função BQL chamada “{name}”. Verifique a grafia.",
    description:
      "Query error naming a BQL function that does not exist; {name} is the function name from the query",
  },
  "bql.errors.unknownTable": {
    message:
      "Não existe nenhuma tabela chamada “{table}”. As tabelas do sistema começam com #, como {accounts} ou {prices}.",
    description:
      "Query error naming a table that does not exist; {table} is the name from the query, {accounts} and {prices} are example system table names left untranslated",
  },
  "bql.errors.argumentCount_one": {
    message: "{name}() recebe {count} argumento, não {got}.",
    description:
      "Query error for a function called with the wrong number of arguments; {name} is the function, {count} the number it takes and {got} the number the query gave",
  },
  "bql.errors.argumentCount_many": {
    message: "{name}() recebe {count} argumentos, não {got}.",
    description:
      "Query error for a function called with the wrong number of arguments; {name} is the function, {count} the number it takes and {got} the number the query gave",
  },
  "bql.errors.argumentCount_other": {
    message: "{name}() recebe {count} argumentos, não {got}.",
    description:
      "Query error for a function called with the wrong number of arguments; {name} is the function, {count} the number it takes and {got} the number the query gave",
  },
  "bql.errors.typeError": {
    message:
      "Um valor tem o tipo errado para esta comparação ou função. Verifique o que a coluna ou a função retorna.",
    description:
      "Query error when a value has the wrong type for a comparison or function",
  },
  "page.bql.query": {
    message: "Consulta",
    description: "Sidebar navigation label for the BQL query page",
  },
  "page.bql.queryResult": {
    message: "Resultado da Consulta",
    description: "Label for a query result section header",
  },
  "page.bql.largeResultHint": {
    message:
      "Aqui só estão disponíveis as linhas visíveis. O arquivo CSV contém todas as linhas (total: {count}).",
    description:
      "Screen-reader note on a result too long to render every row; {count} is the total row count",
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
