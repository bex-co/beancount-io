export interface TranslationEntry {
  message: string;
  description: string;
}

const koBudget: Record<string, TranslationEntry> = {
  "page.budget.budget": {
    message: "예산",
    description: "Page title and label for the budget feature",
  },
  "page.budget.budgetAccountHelp": {
    message:
      "예산은 하나의 계정에 적용됩니다(예: Expenses:Food:Groceries). 동일한 계정과 통화의 새 지시문은 해당 날짜부터 적용됩니다.",
    description: "Help text under the account field in the add-budget dialog",
  },
  "page.budget.budgetAccountPlaceholder": {
    message: "Expenses:Groceries",
    description: "Placeholder for budget account input",
  },
  "page.budget.budgetAccountRequired": {
    message: "계정은 필수입니다",
    description: "Validation error when account field is empty",
  },
  "page.budget.budgetAddBudget": {
    message: "예산 추가",
    description: "Button text to add a new budget",
  },
  "page.budget.budgetAddEntry": {
    message: "예산 업데이트",
    description: "Button to add a new budget entry",
  },
  "page.budget.budgetAmount": {
    message: "금액",
    description: "Form label and table header for budget amount",
  },
  "page.budget.budgetAmountRequired": {
    message: "금액은 필수입니다",
    description: "Validation error when amount field is empty",
  },
  "page.budget.budgetCurrency": {
    message: "통화",
    description: "Form label for budget currency field",
  },
  "page.budget.budgetCurrencyRequired": {
    message: "통화는 필수입니다",
    description: "Validation error when currency field is empty",
  },
  "page.budget.budgetCurrentBudget": {
    message: "현재 예산",
    description: "Label for the currently active budget amount",
  },
  "page.budget.budgetDate": {
    message: "날짜",
    description: "Form label for budget date field",
  },
  "page.budget.budgetDeleteDescription": {
    message:
      "{date}부터 적용되는 {account}의 {interval} 예산 지시문 {amount}을(를) 삭제하시겠습니까? 이 작업은 단일 예산 항목을 삭제하며 되돌릴 수 없습니다.",
    description:
      "Confirmation message for deleting a budget. {interval}, {amount}, {account}, {date} are replaced with actual values.",
  },
  "page.budget.budgetDeleteTitle": {
    message: "예산 삭제",
    description: "Dialog title for deleting a budget",
  },
  "page.budget.budgetDeleting": {
    message: "삭제 중...",
    description: "Loading state text when deleting a budget",
  },
  "page.budget.budgetDescription": {
    message:
      "비용 또는 수익 계정에 날짜별 목표를 설정하세요. 각 카드는 실제 활동을 해당 기간에 적용된 목표와 비교합니다.",
    description: "Page description for the budget feature",
  },
  "page.budget.budgetEmptyStateCta": {
    message: "첫 번째 예산 추가",
    description: "Empty state call-to-action button",
  },
  "page.budget.budgetFailedToAdd": {
    message: "예산 추가 실패",
    description: "Error message when adding a budget fails",
  },
  "page.budget.budgetInterval": {
    message: "기간",
    description: "Form label and table header for budget interval",
  },
  "page.budget.budgetIntervalAll": {
    message: "전체",
    description: "Budget interval filter option that shows all intervals",
  },
  "page.budget.budgetIntervalDaily": {
    message: "매일",
    description: "Budget interval option - daily",
  },
  "page.budget.budgetIntervalFilterLabel": {
    message: "주기",
    description: "Label for the budget interval filter pill group",
  },
  "page.budget.budgetIntervalMonthly": {
    message: "매월",
    description: "Budget interval option - monthly",
  },
  "page.budget.budgetIntervalQuarterly": {
    message: "분기별",
    description: "Budget interval option - quarterly",
  },
  "page.budget.budgetIntervalWeekly": {
    message: "매주",
    description: "Budget interval option - weekly",
  },
  "page.budget.budgetIntervalYearly": {
    message: "매년",
    description: "Budget interval option - yearly",
  },
  "page.budget.budgetLatestSpending": {
    message: "최근 실제값",
    description: "Label for the most recent interval's spending",
  },
  "page.budget.budgetNoBudgetsFound": {
    message: "예산이 없습니다",
    description: "Empty state title when no budgets exist",
  },
  "page.budget.budgetNoBudgetsFoundDescription": {
    message: "계정의 지출 목표 추적을 시작하려면 예산 지시문을 생성하세요.",
    description: "Empty state description when no budgets exist",
  },
  "page.budget.budgetNoDataAvailable": {
    message: "데이터 없음",
    description: "Chart empty state text when no data exists",
  },
  "page.budget.budgetOnBudget": {
    message: "목표 달성",
    description: "Badge/text shown when spending matches budget",
  },
  "page.budget.budgetOverBudget": {
    message: "목표 초과",
    description: "Badge/text shown when spending exceeds budget",
  },
  "page.budget.budgetSearchPlaceholder": {
    message: "계정별 예산 검색...",
    description: "Placeholder for budget search input",
  },
  "page.budget.budgetSelectInterval": {
    message: "기간 선택",
    description: "Placeholder for interval select dropdown",
  },
  "page.budget.budgetSpending": {
    message: "실제",
    description: "Chart series name for actual spending data",
  },
  "page.budget.budgetTimeSpanAll": {
    message: "전체 기간",
    description: "Time span filter option that shows all available history",
  },
  "page.budget.budgetTimeSpanFilterLabel": {
    message: "기간",
    description: "Label for the budget time span filter pill group",
  },
  "page.budget.budgetTimeSpanLast12Months": {
    message: "최근 12개월",
    description: "Time span filter option for the trailing 12 months",
  },
  "page.budget.budgetTimeSpanLastYear": {
    message: "작년",
    description: "Time span filter option for the previous calendar year",
  },
  "page.budget.budgetTimeSpanThisYear": {
    message: "올해",
    description: "Time span filter option for the current calendar year",
  },
  "page.budget.budgetUnderBudget": {
    message: "목표 미달",
    description: "Badge/text shown when spending is below budget",
  },
  "page.budget.budgetVariance": {
    message: "차이",
    description: "Label for budget variance (spending minus budget)",
  },
};

export default koBudget;
