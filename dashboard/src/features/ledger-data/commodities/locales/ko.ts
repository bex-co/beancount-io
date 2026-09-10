export interface TranslationEntry {
  message: string;
  description: string;
}

const koCommodities: Record<string, TranslationEntry> = {
  "page.commodities.commodities": {
    message: "상품",
    description: "Commodities/currencies view in ledger",
  },
  "page.commodities.failedToLoadCommodities": {
    message: "상품 불러오기 실패",
    description: "Error title when commodities fail to load",
  },
  "page.commodities.noCommoditiesFound": {
    message: "상품을 찾을 수 없습니다",
    description: "Empty state title when no commodities exist",
  },
  "page.commodities.noCommoditiesFoundDescription": {
    message: "이 장부에는 아직 상품 가격 데이터가 없습니다.",
    description: "Empty state description for no commodities",
  },
  "page.commodities.priceHistoryDataPoints": {
    message: "{count}개 데이터 포인트가 있는 가격 기록",
    description:
      "Description showing number of price data points. {count} is replaced with the number of data points.",
  },
  "page.commodities.showPriceHistory": {
    message: "{pair} 가격 기록 표시",
    description: "날짜별 가격 표를 여는 버튼",
  },
  "page.commodities.hidePriceHistory": {
    message: "{pair} 가격 기록 숨기기",
    description: "날짜별 가격 표를 닫는 버튼",
  },
  "page.commodities.priceHistoryDate": {
    message: "날짜",
    description: "가격 기록 날짜 열 머리글",
  },
  "page.commodities.priceHistoryPrice": {
    message: "가격 ({quote})",
    description: "호가 통화 가격 열 머리글",
  },
};

export default koCommodities;
