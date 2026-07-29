export interface TranslationEntry {
  message: string;
  description: string;
}

const deBalanceSheet: Record<string, TranslationEntry> = {
  "page.balanceSheet.assetsBreakdown": {
    message: "Vermögenshierarchie",
    description: "Tab label for assets hierarchy section",
  },
  "page.balanceSheet.assetsDescription": {
    message:
      "Verfolgen Sie {ledgerName} Vermögen über verschiedene Währungen im Zeitverlauf",
    description: "Description for assets chart",
  },
  "page.balanceSheet.equityBreakdown": {
    message: "Eigenkapitalhierarchie",
    description: "Tab label for equity hierarchy section",
  },
  "page.balanceSheet.equityDescription": {
    message:
      "Verfolgen Sie {ledgerName} Eigenkapital über verschiedene Währungen im Zeitverlauf",
    description: "Description for equity chart",
  },
  "page.balanceSheet.liabilitiesBreakdown": {
    message: "Verbindlichkeitenhierarchie",
    description: "Tab label for liabilities hierarchy section",
  },
  "page.balanceSheet.liabilitiesDescription": {
    message:
      "Verfolgen Sie {ledgerName} Verbindlichkeiten über verschiedene Währungen im Zeitverlauf",
    description: "Description for liabilities chart",
  },
  "page.balanceSheet.monthlyNetWorth": {
    message: "Monatliches Nettovermögen",
    description: "Net worth calculated monthly",
  },
  "page.balanceSheet.netWorthDescription": {
    message:
      "Verfolgen Sie {ledgerName} Nettowert über verschiedene Währungen im Zeitverlauf",
    description: "Description for net worth chart",
  },
  "page.balanceSheet.noData": {
    message: "Keine Bilanzdaten für dieses Hauptbuch gefunden.",
    description: "Empty state message for balance sheet",
  },
};

export default deBalanceSheet;
