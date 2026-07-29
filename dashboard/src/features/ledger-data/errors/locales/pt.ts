export interface TranslationEntry {
  message: string;
  description: string;
}

const ptErrors: Record<string, TranslationEntry> = {
  "page.errors.allEntriesParsedSuccessfully": {
    message: "Todos os lançamentos foram analisados com sucesso.",
    description: "Empty state description for no errors",
  },
  "page.errors.errorMessage": {
    message: "Mensagem de Erro",
    description: "Table column header for error message",
  },
  "page.errors.errors": {
    message: "Erros",
    description: "Errors in ledger file parsing",
  },
  "page.errors.failedToLoadErrors": {
    message: "Falha ao Carregar Erros",
    description: "Error title when errors fail to load",
  },
  "page.errors.failedToLoadErrorsDescription": {
    message:
      "Ocorreu um erro ao carregar os dados de erros. Por favor, tente novamente mais tarde.",
    description: "Error description when errors fail to load",
  },
  "page.errors.line": {
    message: "Line",
    description: "Table column header for line number",
  },
  "page.errors.noErrorsFound": {
    message: "Nenhum Erro Encontrado",
    description: "Empty state title when no errors exist",
  },
  "page.errors.unknownFile": {
    message: "Arquivo desconhecido",
    description: "Text shown when filename is unknown",
  },
};

export default ptErrors;
