export interface TranslationEntry {
  message: string;
  description: string;
}

const nlBalanceSheet: Record<string, TranslationEntry> = {
  "page.balanceSheet.assetsBreakdown": {
    message: "Activahiërarchie",
    description: "Tab label for assets hierarchy section",
  },
  "page.balanceSheet.assetsDescription": {
    message:
      "Volg {ledgerName} activa over verschillende grondstoffen in de tijd",
    description: "Description for assets chart",
  },
  "page.balanceSheet.equityBreakdown": {
    message: "Eigenvermogenshiërarchie",
    description: "Tab label for equity hierarchy section",
  },
  "page.balanceSheet.equityDescription": {
    message:
      "Volg {ledgerName} eigen vermogen over verschillende valuta in de tijd",
    description: "Description for equity chart",
  },
  "page.balanceSheet.liabilitiesBreakdown": {
    message: "Passivahiërarchie",
    description: "Tab label for liabilities hierarchy section",
  },
  "page.balanceSheet.liabilitiesDescription": {
    message:
      "Volg {ledgerName} passiva over verschillende grondstoffen in de tijd",
    description: "Description for liabilities chart",
  },
  "page.balanceSheet.netWorthDescription": {
    message:
      "Volg {ledgerName} netto vermogen over verschillende grondstoffen in de tijd",
    description: "Description for net worth chart",
  },
  "page.balanceSheet.noData": {
    message: "Geen balansgegevens gevonden voor dit grootboek.",
    description: "Empty state message for balance sheet",
  },
};

export default nlBalanceSheet;
