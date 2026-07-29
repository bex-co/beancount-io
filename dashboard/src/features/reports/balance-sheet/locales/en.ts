export interface TranslationEntry {
  message: string;
  description: string;
}

const enBalanceSheet: Record<string, TranslationEntry> = {
  "page.balanceSheet.noData": {
    message: "No balance sheet data found for this ledger.",
    description: "Empty state message for balance sheet",
  },
  "page.balanceSheet.netWorthDescription": {
    message:
      "Track {ledgerName} net worth across different commodities over time",
    description: "Description for net worth chart",
  },
  "page.balanceSheet.assetsDescription": {
    message: "Track {ledgerName} assets across different commodities over time",
    description: "Description for assets chart",
  },
  "page.balanceSheet.liabilitiesDescription": {
    message:
      "Track {ledgerName} liabilities across different commodities over time",
    description: "Description for liabilities chart",
  },
  "page.balanceSheet.equityDescription": {
    message: "Track {ledgerName} equity across different commodities over time",
    description: "Description for equity chart",
  },
  "page.balanceSheet.assetsBreakdown": {
    message: "Assets Hierarchy",
    description: "Tab label for assets hierarchy section",
  },
  "page.balanceSheet.liabilitiesBreakdown": {
    message: "Liabilities Hierarchy",
    description: "Tab label for liabilities hierarchy section",
  },
  "page.balanceSheet.equityBreakdown": {
    message: "Equity Hierarchy",
    description: "Tab label for equity hierarchy section",
  },
  "page.balanceSheet.monthlyNetWorth": {
    message: "Monthly Net Worth",
    description: "Net worth calculated monthly",
  },
};

export default enBalanceSheet;
