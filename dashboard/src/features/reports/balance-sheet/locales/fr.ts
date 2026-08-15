export interface TranslationEntry {
  message: string;
  description: string;
}

const frBalanceSheet: Record<string, TranslationEntry> = {
  "page.balanceSheet.assetsBreakdown": {
    message: "Hiérarchie des actifs",
    description: "Tab label for assets hierarchy section",
  },
  "page.balanceSheet.assetsDescription": {
    message:
      "Suivre {ledgerName} actifs à travers différentes devises dans le temps",
    description: "Description for assets chart",
  },
  "page.balanceSheet.equityBreakdown": {
    message: "Hiérarchie des capitaux propres",
    description: "Tab label for equity hierarchy section",
  },
  "page.balanceSheet.equityDescription": {
    message:
      "Suivre {ledgerName} capitaux propres à travers différentes devises dans le temps",
    description: "Description for equity chart",
  },
  "page.balanceSheet.liabilitiesBreakdown": {
    message: "Hiérarchie des passifs",
    description: "Tab label for liabilities hierarchy section",
  },
  "page.balanceSheet.liabilitiesDescription": {
    message:
      "Suivre {ledgerName} passifs à travers différentes devises dans le temps",
    description: "Description for liabilities chart",
  },
  "page.balanceSheet.netWorthDescription": {
    message:
      "Suivre {ledgerName} patrimoine net à travers différentes devises dans le temps",
    description: "Description for net worth chart",
  },
  "page.balanceSheet.noData": {
    message: "Aucune donnée de bilan trouvée pour ce grand livre.",
    description: "Empty state message for balance sheet",
  },
};

export default frBalanceSheet;
