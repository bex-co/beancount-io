export interface TranslationEntry {
  message: string;
  description: string;
}

const faBalanceSheet: Record<string, TranslationEntry> = {
  "page.balanceSheet.assetsBreakdown": {
    message: "سلسله مراتب دارایی‌ها",
    description: "Tab label for assets hierarchy section",
  },
  "page.balanceSheet.assetsDescription": {
    message: "پیگیری دارایی‌های {ledgerName} در ارزهای مختلف در طول زمان",
    description: "Description for assets chart",
  },
  "page.balanceSheet.equityBreakdown": {
    message: "سلسله مراتب سرمایه",
    description: "Tab label for equity hierarchy section",
  },
  "page.balanceSheet.equityDescription": {
    message: "پیگیری سرمایه {ledgerName} در ارزهای مختلف در طول زمان",
    description: "Description for equity chart",
  },
  "page.balanceSheet.liabilitiesBreakdown": {
    message: "سلسله مراتب بدهی‌ها",
    description: "Tab label for liabilities hierarchy section",
  },
  "page.balanceSheet.liabilitiesDescription": {
    message: "پیگیری بدهی‌های {ledgerName} در ارزهای مختلف در طول زمان",
    description: "Description for liabilities chart",
  },
  "page.balanceSheet.monthlyNetWorth": {
    message: "ارزش خالص ماهانه",
    description: "Net worth calculated monthly",
  },
  "page.balanceSheet.netWorthDescription": {
    message: "پیگیری ارزش خالص {ledgerName} در ارزهای مختلف در طول زمان",
    description: "Description for net worth chart",
  },
  "page.balanceSheet.noData": {
    message: "هیچ داده ترازنامه‌ای برای این دفتر یافت نشد.",
    description: "Empty state message for balance sheet",
  },
};

export default faBalanceSheet;
