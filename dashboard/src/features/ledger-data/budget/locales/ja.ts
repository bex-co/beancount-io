export interface TranslationEntry {
  message: string;
  description: string;
}

const jaBudget: Record<string, TranslationEntry> = {
  "page.budget.budget": {
    message: "予算",
    description: "Page title and label for the budget feature",
  },
  "page.budget.budgetAccountHelp": {
    message:
      "予算は1つの口座に適用されます（例: Expenses:Food:Groceries）。同じ口座と通貨の新しい指令は、その日付から有効になります。",
    description: "Help text under the account field in the add-budget dialog",
  },
  "page.budget.budgetAccountPlaceholder": {
    message: "Expenses:Groceries",
    description: "Placeholder for budget account input",
  },
  "page.budget.budgetAccountRequired": {
    message: "口座は必須です",
    description: "Validation error when account field is empty",
  },
  "page.budget.budgetAddBudget": {
    message: "予算を追加",
    description: "Button text to add a new budget",
  },
  "page.budget.budgetAddEntry": {
    message: "予算を更新",
    description: "Button to add a new budget entry",
  },
  "page.budget.budgetAmount": {
    message: "金額",
    description: "Form label and table header for budget amount",
  },
  "page.budget.budgetAmountRequired": {
    message: "金額は必須です",
    description: "Validation error when amount field is empty",
  },
  "page.budget.budgetCurrency": {
    message: "通貨",
    description: "Form label for budget currency field",
  },
  "page.budget.budgetCurrencyRequired": {
    message: "通貨は必須です",
    description: "Validation error when currency field is empty",
  },
  "page.budget.budgetCurrentBudget": {
    message: "現在の予算",
    description: "Label for the currently active budget amount",
  },
  "page.budget.budgetDate": {
    message: "日付",
    description: "Form label for budget date field",
  },
  "page.budget.budgetDeleteDescription": {
    message:
      "{date} に有効となる {account} の {interval} 予算指令 {amount} を削除しますか？これは単一の予算エントリを削除し、元に戻せません。",
    description:
      "Confirmation message for deleting a budget. {interval}, {amount}, {account}, {date} are replaced with actual values.",
  },
  "page.budget.budgetDeleteTitle": {
    message: "予算を削除",
    description: "Dialog title for deleting a budget",
  },
  "page.budget.budgetDeleting": {
    message: "削除中...",
    description: "Loading state text when deleting a budget",
  },
  "page.budget.budgetDescription": {
    message:
      "費用または収益口座に日付付きの目標を設定します。各カードは実績をその期間に有効な目標と比較します。",
    description: "Page description for the budget feature",
  },
  "page.budget.budgetEmptyStateCta": {
    message: "最初の予算を追加",
    description: "Empty state call-to-action button",
  },
  "page.budget.budgetFailedToAdd": {
    message: "予算の追加に失敗しました",
    description: "Error message when adding a budget fails",
  },
  "page.budget.budgetFailedToLoad": {
    message: "予算の読み込みに失敗しました",
    description: "Error message when budgets fail to load",
  },
  "page.budget.budgetInterval": {
    message: "期間",
    description: "Form label and table header for budget interval",
  },
  "page.budget.budgetIntervalAll": {
    message: "[TODO] All",
    description: "Budget interval filter option that shows all intervals",
  },
  "page.budget.budgetIntervalDaily": {
    message: "毎日",
    description: "Budget interval option - daily",
  },
  "page.budget.budgetIntervalFilterLabel": {
    message: "[TODO] Interval",
    description: "Label for the budget interval filter pill group",
  },
  "page.budget.budgetIntervalMonthly": {
    message: "毎月",
    description: "Budget interval option - monthly",
  },
  "page.budget.budgetIntervalQuarterly": {
    message: "四半期ごと",
    description: "Budget interval option - quarterly",
  },
  "page.budget.budgetIntervalWeekly": {
    message: "毎週",
    description: "Budget interval option - weekly",
  },
  "page.budget.budgetIntervalYearly": {
    message: "毎年",
    description: "Budget interval option - yearly",
  },
  "page.budget.budgetLatestSpending": {
    message: "最新の実績",
    description: "Label for the most recent interval's spending",
  },
  "page.budget.budgetNoBudgetsFound": {
    message: "予算が見つかりません",
    description: "Empty state title when no budgets exist",
  },
  "page.budget.budgetNoBudgetsFoundDescription": {
    message: "予算指令を作成して、口座の支出目標の追跡を開始してください。",
    description: "Empty state description when no budgets exist",
  },
  "page.budget.budgetNoDataAvailable": {
    message: "データがありません",
    description: "Chart empty state text when no data exists",
  },
  "page.budget.budgetOnBudget": {
    message: "目標通り",
    description: "Badge/text shown when spending matches budget",
  },
  "page.budget.budgetOverBudget": {
    message: "目標超過",
    description: "Badge/text shown when spending exceeds budget",
  },
  "page.budget.budgetSearchPlaceholder": {
    message: "口座で予算を検索...",
    description: "Placeholder for budget search input",
  },
  "page.budget.budgetSelectInterval": {
    message: "期間を選択",
    description: "Placeholder for interval select dropdown",
  },
  "page.budget.budgetSpending": {
    message: "実績",
    description: "Chart series name for actual spending data",
  },
  "page.budget.budgetTimeSpanAll": {
    message: "[TODO] All time",
    description: "Time span filter option that shows all available history",
  },
  "page.budget.budgetTimeSpanFilterLabel": {
    message: "[TODO] Time span",
    description: "Label for the budget time span filter pill group",
  },
  "page.budget.budgetTimeSpanLast12Months": {
    message: "[TODO] Last 12 months",
    description: "Time span filter option for the trailing 12 months",
  },
  "page.budget.budgetTimeSpanLastYear": {
    message: "[TODO] Last year",
    description: "Time span filter option for the previous calendar year",
  },
  "page.budget.budgetTimeSpanThisYear": {
    message: "[TODO] This year",
    description: "Time span filter option for the current calendar year",
  },
  "page.budget.budgetUnderBudget": {
    message: "目標未達",
    description: "Badge/text shown when spending is below budget",
  },
  "page.budget.budgetVariance": {
    message: "差異",
    description: "Label for budget variance (spending minus budget)",
  },
};

export default jaBudget;
