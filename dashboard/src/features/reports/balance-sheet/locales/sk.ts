export interface TranslationEntry {
  message: string;
  description: string;
}

const skBalanceSheet: Record<string, TranslationEntry> = {
  "page.balanceSheet.assetsBreakdown": {
    message: "Hierarchia aktív",
    description: "Tab label for assets hierarchy section",
  },
  "page.balanceSheet.assetsDescription": {
    message: "Sledujte {ledgerName} aktíva v rôznych menách v čase",
    description: "Description for assets chart",
  },
  "page.balanceSheet.equityBreakdown": {
    message: "Hierarchia vlastného imania",
    description: "Tab label for equity hierarchy section",
  },
  "page.balanceSheet.equityDescription": {
    message: "Sledujte {ledgerName} vlastné imanie v rôznych menách v čase",
    description: "Description for equity chart",
  },
  "page.balanceSheet.liabilitiesBreakdown": {
    message: "Hierarchia záväzkov",
    description: "Tab label for liabilities hierarchy section",
  },
  "page.balanceSheet.liabilitiesDescription": {
    message: "Sledujte {ledgerName} pasíva v rôznych menách v čase",
    description: "Description for liabilities chart",
  },
  "page.balanceSheet.monthlyNetWorth": {
    message: "Mesačné čisté bohatstvo",
    description: "Net worth calculated monthly",
  },
  "page.balanceSheet.netWorthDescription": {
    message: "Sledujte {ledgerName} čisté imanie v rôznych menách v čase",
    description: "Description for net worth chart",
  },
  "page.balanceSheet.noData": {
    message: "Pre tento účtovný denník sa nenašli žiadne údaje súvahy.",
    description: "Empty state message for balance sheet",
  },
};

export default skBalanceSheet;
