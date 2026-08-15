export interface TranslationEntry {
  message: string;
  description: string;
}

const caBalanceSheet: Record<string, TranslationEntry> = {
  "page.balanceSheet.assetsBreakdown": {
    message: "Jerarquia d'actius",
    description: "Tab label for assets hierarchy section",
  },
  "page.balanceSheet.assetsDescription": {
    message:
      "Seguir {ledgerName} actius en diferents monedes al llarg del temps",
    description: "Description for assets chart",
  },
  "page.balanceSheet.equityBreakdown": {
    message: "Jerarquia de patrimoni net",
    description: "Tab label for equity hierarchy section",
  },
  "page.balanceSheet.equityDescription": {
    message:
      "Seguir el {ledgerName} patrimoni net en diferents monedes al llarg del temps",
    description: "Description for equity chart",
  },
  "page.balanceSheet.liabilitiesBreakdown": {
    message: "Jerarquia de passius",
    description: "Tab label for liabilities hierarchy section",
  },
  "page.balanceSheet.liabilitiesDescription": {
    message:
      "Seguir els {ledgerName} passius en diferents monedes al llarg del temps",
    description: "Description for liabilities chart",
  },
  "page.balanceSheet.netWorthDescription": {
    message:
      "Seguir el {ledgerName} patrimoni net en diferents monedes al llarg del temps",
    description: "Description for net worth chart",
  },
  "page.balanceSheet.noData": {
    message: "No s'han trobat comptes",
    description: "Empty state message for balance sheet",
  },
};

export default caBalanceSheet;
