export interface TranslationEntry {
  message: string;
  description: string;
}

const koBalanceSheet: Record<string, TranslationEntry> = {
  "page.balanceSheet.assetsBreakdown": {
    message: "자산 계층",
    description: "Tab label for assets hierarchy section",
  },
  "page.balanceSheet.assetsDescription": {
    message: "{ledgerName}의 자산을 시간에 따라 다양한 상품별로 추적",
    description: "Description for assets chart",
  },
  "page.balanceSheet.equityBreakdown": {
    message: "자본 계층",
    description: "Tab label for equity hierarchy section",
  },
  "page.balanceSheet.equityDescription": {
    message: "{ledgerName}의 자본을 시간에 따라 다양한 상품별로 추적",
    description: "Description for equity chart",
  },
  "page.balanceSheet.liabilitiesBreakdown": {
    message: "부채 계층",
    description: "Tab label for liabilities hierarchy section",
  },
  "page.balanceSheet.liabilitiesDescription": {
    message: "{ledgerName}의 부채를 시간에 따라 다양한 상품별로 추적",
    description: "Description for liabilities chart",
  },
  "page.balanceSheet.monthlyNetWorth": {
    message: "월별 순자산",
    description: "Net worth calculated monthly",
  },
  "page.balanceSheet.netWorthDescription": {
    message: "{ledgerName}의 순자산을 시간에 따라 다양한 상품별로 추적",
    description: "Description for net worth chart",
  },
  "page.balanceSheet.noData": {
    message: "이 장부의 재무상태표 데이터를 찾을 수 없습니다.",
    description: "Empty state message for balance sheet",
  },
};

export default koBalanceSheet;
