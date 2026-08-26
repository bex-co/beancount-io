import { createExportLocale } from "../export-locale";

export default createExportLocale({
  action: "내보내기",
  markdown: "Markdown 보고서",
  csv: "CSV 스프레드시트",
  printSavePdf: "인쇄 / PDF로 저장",
  completed: "보고서 내보내기가 준비되었습니다.",
  failed: "보고서를 내보낼 수 없습니다.",
  context: "범위 및 표시 기준",
  generatedAt: "생성 시각: {generatedAt}",
  asOf: "기준일",
  period: "보고 기간",
  accountFilter: "계정 필터",
  advancedFilter: "고급 필터",
  interval: "간격",
  conversion: "환산",
  notApplied: "적용 안 함",
  currency: "통화",
  unit: "단위",
  amount: "금액",
  unauditedManagementReport: "감사받지 않은 경영 보고서",
  unauditedMultiUnitManagementReport: "감사받지 않은 다중 단위 관리 명세서",
  unauditedInternalDraft: "감사받지 않은 내부 초안",
  statementSummary: "재무제표 요약",
  lineItem: "항목",
  totalAssets: "총자산",
  totalLiabilities: "총부채",
  totalEquity: "총자본",
  totalLiabilitiesAndEquity: "총부채 및 자본",
  reconciliationDifference: "조정 차이",
  totalRevenue: "총수익 및 기타수익",
  totalExpenses: "총비용",
  netLoss: "순손실",
  netCashOperating: "영업활동 순현금흐름",
  netCashInvesting: "투자활동 순현금흐름",
  netCashFinancing: "재무활동 순현금흐름",
  netChangeInCash: "현금 및 현금성자산 순변동",
  openingCash: "기초 현금 및 현금성자산",
  closingCash: "기말 현금 및 현금성자산",
  supportingAccountDetail: "보조 계정 명세",
  allActivity: "사용 가능한 모든 원장 활동, 종료일",
  dateUnavailable: "보고 날짜를 확인할 수 없음",
  presentationCurrency: "표시 통화",
  ledgerUnits: "표시된 원장 단위",
  sourceLedger: "원본 원장",
  importantNotices: "중요 안내",
  reportingEntity: "보고 주체",
  netIncome: "순이익",
  reportingEntityFallbackNotice:
    '보고 주체가 설정되지 않아 원본 원장 이름을 사용합니다. 외부 사용 전에 Beancount option "title"을 설정하세요.',
  placeholderDataNotice:
    "보고 주체 또는 원본 원장에 예시 데이터가 포함된 것으로 보입니다. 외부 사용 전에 교체하세요.",
  inferredPeriodNotice:
    "이 보고서는 {startDate}부터 {endDate}까지의 원장 활동을 포함합니다. 날짜는 사용 가능한 보고서 데이터에서 산출되었습니다.",
  periodNotExplicitNotice:
    "전체 보고 기간을 확인할 수 없습니다. 이 보고서는 내부 초안입니다.",
  inferredAsOfDateNotice:
    "명시적인 기준일이 선택되지 않았습니다. 이 재무제표는 보고서에서 사용 가능한 가장 최근 날짜를 사용합니다: {asOfDate}.",
  asOfDateUnavailableNotice:
    "재무상태표 기준일을 확인할 수 없습니다. 이 재무제표는 내부 초안입니다.",
  subtotalRowsNotice:
    "굵은 행은 소계 또는 합계이므로 하위 상세 행과 중복하여 합산하지 마세요.",
  partialReportNotice:
    "계정 또는 고급 필터로 범위가 제한되어 있어 완전한 재무제표가 아닙니다.",
  balanceSheetClassificationNotice:
    "원본 원장에는 유동 및 비유동 분류가 없으며 계정은 원장 순서로 표시됩니다.",
  balanceSheetDoesNotReconcileNotice:
    "하나 이상의 단위에서 회계 등식이 일치하지 않습니다. 외부 사용 전에 미결산 손익, 부분 필터, 평가 또는 환산 효과와 원장 오류를 검토하세요. 이 재무제표는 내부 초안입니다.",
  cashFlowClassificationNotice:
    "영업·투자·재무 활동 구분은 cash-flow-role이 선언되지 않은 계정의 경우 계정 유형과 이름에서 추론되며, 선언된 계정은 선언된 대로 분류됩니다.",
  cashFlowCashEquivalentsNotice:
    "현금 및 현금성자산 범위는 계정 이름에서 추론됩니다(당좌·저축 등 현금성 자산 계정). 외부 사용 전에 포함된 계정을 확인하세요.",
  customUnitsNotice: "검토가 필요한 사용자 지정 원장 단위:",
  customUnitsDefinitionNotice:
    "이 내보내기에는 해당 단위의 의미가 포함되어 있지 않습니다. 외부 사용 전에 첨부 주석에 설명하세요.",
  multiUnitScheduleNotice:
    "이 다중 단위 보고서는 관리 명세서이며 단일 표시 통화 재무제표가 아닙니다. 서로 다른 단위의 금액을 합산하지 말고 외부 사용 전에 표시 통화를 선택하세요.",
  noAssurance:
    "어떠한 보증도 제공하지 않습니다. 사용자가 제공한 원장 기록으로 작성되었으며 주체, 완전성, 평가 및 회계기준 준수 여부는 검증되지 않았습니다.",
  generatedBy: "Beancount.io에서 {generatedAt}에 생성",
});
