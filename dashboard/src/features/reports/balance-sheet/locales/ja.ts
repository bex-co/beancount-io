export interface TranslationEntry {
  message: string;
  description: string;
}

const jaBalanceSheet: Record<string, TranslationEntry> = {
  "page.balanceSheet.assetsBreakdown": {
    message: "資産階層",
    description: "Tab label for assets hierarchy section",
  },
  "page.balanceSheet.assetsDescription": {
    message: "{ledgerName}の資産を時系列でさまざまな商品にわたって追跡",
    description: "Description for assets chart",
  },
  "page.balanceSheet.equityBreakdown": {
    message: "純資産階層",
    description: "Tab label for equity hierarchy section",
  },
  "page.balanceSheet.equityDescription": {
    message: "{ledgerName}の純資産を時系列でさまざまな商品にわたって追跡",
    description: "Description for equity chart",
  },
  "page.balanceSheet.liabilitiesBreakdown": {
    message: "負債階層",
    description: "Tab label for liabilities hierarchy section",
  },
  "page.balanceSheet.liabilitiesDescription": {
    message: "{ledgerName}の負債を時系列でさまざまな商品にわたって追跡",
    description: "Description for liabilities chart",
  },
  "page.balanceSheet.netWorthDescription": {
    message: "{ledgerName}の純資産を時系列でさまざまな商品にわたって追跡",
    description: "Description for net worth chart",
  },
  "page.balanceSheet.noData": {
    message: "この元帳の貸借対照表データが見つかりません。",
    description: "Empty state message for balance sheet",
  },
};

export default jaBalanceSheet;
