export interface TranslationEntry {
  message: string;
  description: string;
}

const bgBalanceSheet: Record<string, TranslationEntry> = {
  "page.balanceSheet.assetsBreakdown": {
    message: "Йерархия на активите",
    description: "Tab label for assets hierarchy section",
  },
  "page.balanceSheet.assetsDescription": {
    message: "Проследяване на {ledgerName} активи в различни стоки във времето",
    description: "Description for assets chart",
  },
  "page.balanceSheet.equityBreakdown": {
    message: "Йерархия на собствения капитал",
    description: "Tab label for equity hierarchy section",
  },
  "page.balanceSheet.equityDescription": {
    message:
      "Проследяване на {ledgerName} собствен капитал в различни стоки във времето",
    description: "Description for equity chart",
  },
  "page.balanceSheet.liabilitiesBreakdown": {
    message: "Йерархия на пасивите",
    description: "Tab label for liabilities hierarchy section",
  },
  "page.balanceSheet.liabilitiesDescription": {
    message: "Проследяване на {ledgerName} пасиви в различни стоки във времето",
    description: "Description for liabilities chart",
  },
  "page.balanceSheet.netWorthDescription": {
    message:
      "Проследяване на {ledgerName} нетна стойност в различни стоки във времето",
    description: "Description for net worth chart",
  },
  "page.balanceSheet.noData": {
    message: "Няма намерени данни за баланс за тази книга.",
    description: "Empty state message for balance sheet",
  },
};

export default bgBalanceSheet;
