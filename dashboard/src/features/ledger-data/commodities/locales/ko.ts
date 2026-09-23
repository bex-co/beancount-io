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
    message: "가격 이력을 찾을 수 없습니다",
    description:
      "Empty state title when the ledger records no commodity prices",
  },
  "page.commodities.noCommoditiesFoundDescription": {
    message: "이 장부에는 가격 기록이 없어 표시할 환율 이력이 없습니다.",
    description:
      "Empty state description when the ledger records no commodity prices",
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
  "page.commodities.managedSources": {
    message: "관리형 가격 소스",
    description:
      "Title of the panel listing managed price feeds the ledger includes",
  },
  "page.commodities.managedSourcesDescription": {
    message:
      "이 원장이 관리형 피드에서 가져오는 가격입니다. 몇 분마다 새로 고쳐지며, 직접 입력한 가격 항목이 우선합니다.",
    description: "Description of the managed price sources panel",
  },
  "page.commodities.freshness.recent": {
    message: "최신",
    description:
      "Freshness badge: the managed feed was observed within the last ten minutes",
  },
  "page.commodities.freshness.stale": {
    message: "오래됨",
    description:
      "Freshness badge: the managed feed's latest price is older than ten minutes",
  },
  "page.commodities.freshness.unavailable": {
    message: "사용 불가",
    description:
      "Freshness badge: no valid price has been received from the managed feed",
  },
  "page.commodities.observedAt": {
    message: "관측 {time}",
    description:
      "When the feed's latest price was observed. {time} is a formatted date and time.",
  },
  "page.commodities.nextRefreshAt": {
    message: "다음 새로 고침 {time}",
    description:
      "When the feed will next be re-fetched. {time} is a formatted date and time.",
  },
  "page.commodities.neverObserved": {
    message: "아직 받은 가격이 없습니다",
    description: "Shown when a managed feed has never delivered a valid price",
  },
  "page.commodities.lastError": {
    message: "마지막 오류: {error}",
    description:
      "Why the last refresh of a managed feed failed. {error} is the technical cause.",
  },
  "page.commodities.refreshPrices": {
    message: "가격 새로 고침",
    description: "Button that re-fetches the ledger's managed price feeds now",
  },
  "page.commodities.refreshingPrices": {
    message: "새로 고치는 중…",
    description: "Refresh button label while the refresh is in progress",
  },
  "page.commodities.refreshPricesFailed": {
    message: "가격을 새로 고칠 수 없습니다",
    description: "Toast shown when refreshing managed prices fails",
  },
};

export default koCommodities;
