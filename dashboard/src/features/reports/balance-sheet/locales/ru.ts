export interface TranslationEntry {
  message: string;
  description: string;
}

const ruBalanceSheet: Record<string, TranslationEntry> = {
  "page.balanceSheet.assetsBreakdown": {
    message: "Иерархия активов",
    description: "Tab label for assets hierarchy section",
  },
  "page.balanceSheet.assetsDescription": {
    message:
      "Отслеживание {ledgerName} активов по различным товарам со временем",
    description: "Description for assets chart",
  },
  "page.balanceSheet.equityBreakdown": {
    message: "Иерархия собственного капитала",
    description: "Tab label for equity hierarchy section",
  },
  "page.balanceSheet.equityDescription": {
    message:
      "Отслеживайте свой {ledgerName} собственный капитал в различных валютах со временем",
    description: "Description for equity chart",
  },
  "page.balanceSheet.liabilitiesBreakdown": {
    message: "Иерархия обязательств",
    description: "Tab label for liabilities hierarchy section",
  },
  "page.balanceSheet.liabilitiesDescription": {
    message:
      "Отслеживание {ledgerName} обязательств по различным товарам со временем",
    description: "Description for liabilities chart",
  },
  "page.balanceSheet.monthlyNetWorth": {
    message: "Месячный чистый капитал",
    description: "Net worth calculated monthly",
  },
  "page.balanceSheet.netWorthDescription": {
    message:
      "Отслеживание {ledgerName} чистой стоимости по различным товарам со временем",
    description: "Description for net worth chart",
  },
  "page.balanceSheet.noData": {
    message: "Данные бухгалтерского баланса не найдены для этой главной книги.",
    description: "Empty state message for balance sheet",
  },
};

export default ruBalanceSheet;
