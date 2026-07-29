export interface TranslationEntry {
  message: string;
  description: string;
}

const zhBudget: Record<string, TranslationEntry> = {
  "page.budget.budget": {
    message: "预算",
    description: "Page title and label for the budget feature",
  },
  "page.budget.budgetAccountHelp": {
    message:
      "预算适用于单个账户，例如 Expenses:Food:Groceries。同一账户和币种的新指令从其日期起生效。",
    description: "Help text under the account field in the add-budget dialog",
  },
  "page.budget.budgetAccountPlaceholder": {
    message: "Expenses:Groceries",
    description: "Placeholder for budget account input",
  },
  "page.budget.budgetAccountRequired": {
    message: "账户为必填项",
    description: "Validation error when account field is empty",
  },
  "page.budget.budgetAddBudget": {
    message: "添加预算",
    description: "Button text to add a new budget",
  },
  "page.budget.budgetAddEntry": {
    message: "更新预算",
    description: "Button to add a new budget entry",
  },
  "page.budget.budgetAmount": {
    message: "金额",
    description: "Form label and table header for budget amount",
  },
  "page.budget.budgetAmountRequired": {
    message: "金额为必填项",
    description: "Validation error when amount field is empty",
  },
  "page.budget.budgetCurrency": {
    message: "货币",
    description: "Form label for budget currency field",
  },
  "page.budget.budgetCurrencyRequired": {
    message: "货币为必填项",
    description: "Validation error when currency field is empty",
  },
  "page.budget.budgetCurrentBudget": {
    message: "当前预算",
    description: "Label for the currently active budget amount",
  },
  "page.budget.budgetDate": {
    message: "日期",
    description: "Form label for budget date field",
  },
  "page.budget.budgetDeleteDescription": {
    message:
      "删除 {account} 在 {date} 生效的 {interval} 预算指令 {amount}？此操作会删除单条预算条目，无法撤销。",
    description:
      "Confirmation message for deleting a budget. {interval}, {amount}, {account}, {date} are replaced with actual values.",
  },
  "page.budget.budgetDeleteTitle": {
    message: "删除预算",
    description: "Dialog title for deleting a budget",
  },
  "page.budget.budgetDeleting": {
    message: "删除中...",
    description: "Loading state text when deleting a budget",
  },
  "page.budget.budgetDescription": {
    message:
      "为费用或收入账户设置带日期的目标。每张卡片会将实际活动与该期间生效的目标进行比较。",
    description: "Page description for the budget feature",
  },
  "page.budget.budgetEmptyStateCta": {
    message: "添加你的第一个预算",
    description: "Empty state call-to-action button",
  },
  "page.budget.budgetFailedToAdd": {
    message: "添加预算失败",
    description: "Error message when adding a budget fails",
  },
  "page.budget.budgetFailedToLoad": {
    message: "加载预算失败",
    description: "Error message when budgets fail to load",
  },
  "page.budget.budgetInterval": {
    message: "时间间隔",
    description: "Form label and table header for budget interval",
  },
  "page.budget.budgetIntervalAll": {
    message: "[TODO] All",
    description: "Budget interval filter option that shows all intervals",
  },
  "page.budget.budgetIntervalDaily": {
    message: "每日",
    description: "Budget interval option - daily",
  },
  "page.budget.budgetIntervalFilterLabel": {
    message: "[TODO] Interval",
    description: "Label for the budget interval filter pill group",
  },
  "page.budget.budgetIntervalMonthly": {
    message: "每月",
    description: "Budget interval option - monthly",
  },
  "page.budget.budgetIntervalQuarterly": {
    message: "每季",
    description: "Budget interval option - quarterly",
  },
  "page.budget.budgetIntervalWeekly": {
    message: "每周",
    description: "Budget interval option - weekly",
  },
  "page.budget.budgetIntervalYearly": {
    message: "每年",
    description: "Budget interval option - yearly",
  },
  "page.budget.budgetLatestSpending": {
    message: "最新实际值",
    description: "Label for the most recent interval's spending",
  },
  "page.budget.budgetNoBudgetsFound": {
    message: "未找到预算",
    description: "Empty state title when no budgets exist",
  },
  "page.budget.budgetNoBudgetsFoundDescription": {
    message: "创建一个预算指令，开始跟踪账户的支出目标。",
    description: "Empty state description when no budgets exist",
  },
  "page.budget.budgetNoDataAvailable": {
    message: "暂无数据",
    description: "Chart empty state text when no data exists",
  },
  "page.budget.budgetOnBudget": {
    message: "符合目标",
    description: "Badge/text shown when spending matches budget",
  },
  "page.budget.budgetOverBudget": {
    message: "高于目标",
    description: "Badge/text shown when spending exceeds budget",
  },
  "page.budget.budgetSearchPlaceholder": {
    message: "按账户搜索预算...",
    description: "Placeholder for budget search input",
  },
  "page.budget.budgetSelectInterval": {
    message: "选择间隔",
    description: "Placeholder for interval select dropdown",
  },
  "page.budget.budgetSpending": {
    message: "实际",
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
    message: "低于目标",
    description: "Badge/text shown when spending is below budget",
  },
  "page.budget.budgetVariance": {
    message: "差额",
    description: "Label for budget variance (spending minus budget)",
  },
};

export default zhBudget;
