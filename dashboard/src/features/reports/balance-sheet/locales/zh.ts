export interface TranslationEntry {
  message: string;
  description: string;
}

const zhBalanceSheet: Record<string, TranslationEntry> = {
  "page.balanceSheet.assetsBreakdown": {
    message: "资产层级",
    description: "Tab label for assets hierarchy section",
  },
  "page.balanceSheet.assetsDescription": {
    message: "追踪{ledgerName}在不同商品上的资产随时间的变化",
    description: "Description for assets chart",
  },
  "page.balanceSheet.equityBreakdown": {
    message: "权益层级",
    description: "Tab label for equity hierarchy section",
  },
  "page.balanceSheet.equityDescription": {
    message: "追踪{ledgerName}在不同货币上的权益随时间的变化",
    description: "Description for equity chart",
  },
  "page.balanceSheet.liabilitiesBreakdown": {
    message: "负债层级",
    description: "Tab label for liabilities hierarchy section",
  },
  "page.balanceSheet.liabilitiesDescription": {
    message: "追踪{ledgerName}在不同商品上的负债随时间的变化",
    description: "Description for liabilities chart",
  },
  "page.balanceSheet.monthlyNetWorth": {
    message: "每月净资产",
    description: "Net worth calculated monthly",
  },
  "page.balanceSheet.netWorthDescription": {
    message: "追踪{ledgerName}在不同商品上的净值随时间的变化",
    description: "Description for net worth chart",
  },
  "page.balanceSheet.noData": {
    message: "未找到此账本的资产负债表数据。",
    description: "Empty state message for balance sheet",
  },
};

export default zhBalanceSheet;
