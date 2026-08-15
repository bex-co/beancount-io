export interface TranslationEntry {
  message: string;
  description: string;
}

const ptBalanceSheet: Record<string, TranslationEntry> = {
  "page.balanceSheet.assetsBreakdown": {
    message: "Hierarquia de ativos",
    description: "Tab label for assets hierarchy section",
  },
  "page.balanceSheet.assetsDescription": {
    message:
      "Acompanhe {ledgerName} ativos em diferentes commodities ao longo do tempo",
    description: "Description for assets chart",
  },
  "page.balanceSheet.equityBreakdown": {
    message: "Hierarquia de patrimônio líquido",
    description: "Tab label for equity hierarchy section",
  },
  "page.balanceSheet.equityDescription": {
    message:
      "Acompanhe {ledgerName} patrimônio líquido em diferentes moedas ao longo do tempo",
    description: "Description for equity chart",
  },
  "page.balanceSheet.liabilitiesBreakdown": {
    message: "Hierarquia de passivos",
    description: "Tab label for liabilities hierarchy section",
  },
  "page.balanceSheet.liabilitiesDescription": {
    message:
      "Acompanhe {ledgerName} passivos em diferentes commodities ao longo do tempo",
    description: "Description for liabilities chart",
  },
  "page.balanceSheet.netWorthDescription": {
    message:
      "Acompanhe {ledgerName} patrimônio líquido em diferentes commodities ao longo do tempo",
    description: "Description for net worth chart",
  },
  "page.balanceSheet.noData": {
    message:
      "Nenhum dado de balanço patrimonial encontrado para este livro-razão.",
    description: "Empty state message for balance sheet",
  },
};

export default ptBalanceSheet;
