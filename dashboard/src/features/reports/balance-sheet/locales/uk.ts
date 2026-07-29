export interface TranslationEntry {
  message: string;
  description: string;
}

const ukBalanceSheet: Record<string, TranslationEntry> = {
  "page.balanceSheet.assetsBreakdown": {
    message: "Ієрархія активів",
    description: "Tab label for assets hierarchy section",
  },
  "page.balanceSheet.assetsDescription": {
    message: "Відстежуйте {ledgerName} активи в різних валютах з часом",
    description: "Description for assets chart",
  },
  "page.balanceSheet.equityBreakdown": {
    message: "Ієрархія власного капіталу",
    description: "Tab label for equity hierarchy section",
  },
  "page.balanceSheet.equityDescription": {
    message:
      "Відстежуйте {ledgerName} власний капітал у різних валютах з часом",
    description: "Description for equity chart",
  },
  "page.balanceSheet.liabilitiesBreakdown": {
    message: "Ієрархія зобов'язань",
    description: "Tab label for liabilities hierarchy section",
  },
  "page.balanceSheet.liabilitiesDescription": {
    message: "Відстежуйте {ledgerName} зобов'язання в різних валютах з часом",
    description: "Description for liabilities chart",
  },
  "page.balanceSheet.monthlyNetWorth": {
    message: "Місячний чистий капітал",
    description: "Net worth calculated monthly",
  },
  "page.balanceSheet.netWorthDescription": {
    message: "Відстежуйте {ledgerName} чисту вартість в різних валютах з часом",
    description: "Description for net worth chart",
  },
  "page.balanceSheet.noData": {
    message: "Для цієї книги не знайдено даних балансового звіту.",
    description: "Empty state message for balance sheet",
  },
};

export default ukBalanceSheet;
