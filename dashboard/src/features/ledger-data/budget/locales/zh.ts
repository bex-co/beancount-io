export interface TranslationEntry {
  message: string;
  description: string;
}

const zhBudget: Record<string, TranslationEntry> = {
  "page.budget.budgetUpdateForAccount": {
    message: "更新 {account}（{currency}）的预算",
    description:
      "Accessible name of the update button, identifying the budget card's account and currency",
  },
  "page.budget.budgetDeleteEntry": {
    message: "删除预算：{account}，{date}，{amount}，{interval}",
    description:
      "Accessible name of a budget history row's delete button, naming the directive it removes",
  },
  "page.budget.budgetDeleteEntryNumbered": {
    message:
      "删除预算：{account}，{date}，{amount}，{interval}（第 {position} 条）",
    description:
      "Same as budgetDeleteEntry, with the row's position when other rows read identically",
  },
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
    message: "账户（例如 Expenses:Food:Groceries）",
    description: "Placeholder for budget account input",
  },
  "page.budget.budgetIncomeAmountHelp": {
    message: "收入目标以负数金额保存，与 Beancount 记录收入的方式一致。",
    description:
      "Shown under Add Budget's amount for an account under the ledger's income root",
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
  "page.budget.budgetDeleteIntervalDaily": {
    message: "每日",
    description:
      "Cadence phrase inside the delete-budget confirmation sentence",
  },
  "page.budget.budgetDeleteIntervalWeekly": {
    message: "每周",
    description:
      "Cadence phrase inside the delete-budget confirmation sentence",
  },
  "page.budget.budgetDeleteIntervalMonthly": {
    message: "每月",
    description:
      "Cadence phrase inside the delete-budget confirmation sentence",
  },
  "page.budget.budgetDeleteIntervalQuarterly": {
    message: "每季",
    description:
      "Cadence phrase inside the delete-budget confirmation sentence",
  },
  "page.budget.budgetDeleteIntervalYearly": {
    message: "每年",
    description:
      "Cadence phrase inside the delete-budget confirmation sentence",
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
      "为账户设置带日期的目标，例如某个费用或收入类别。每张卡片会将实际活动与该期间生效的目标进行比较。",
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
  "page.budget.budgetInterval": {
    message: "时间间隔",
    description: "Form label and table header for budget interval",
  },
  "page.budget.budgetIntervalAll": {
    message: "全部",
    description: "Budget interval filter option that shows all intervals",
  },
  "page.budget.budgetIntervalDaily": {
    message: "每日",
    description: "Budget interval option - daily",
  },
  "page.budget.budgetIntervalFilterLabel": {
    message: "周期",
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
  "page.budget.budgetPeriod": {
    message: "期间",
    description: "Column header for a chart period in the budget period table",
  },
  "page.budget.budgetPeriodData": {
    message: "各期间数据",
    description: "Disclosure label for the budget chart's period data table",
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
    message: "全部时间",
    description: "Time span filter option that shows all available history",
  },
  "page.budget.budgetTimeSpanFilterLabel": {
    message: "时间范围",
    description: "Label for the budget time span filter pill group",
  },
  "page.budget.budgetTimeSpanLast12Months": {
    message: "过去 12 个月",
    description: "Time span filter option for the trailing 12 months",
  },
  "page.budget.budgetTimeSpanLastYear": {
    message: "去年",
    description: "Time span filter option for the previous calendar year",
  },
  "page.budget.budgetTimeSpanThisYear": {
    message: "今年",
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
  "page.budget.budgetCount_other": {
    message: "{shown} 个预算",
    description:
      "Budget count under the Budget page title, after the ledger name; {shown} is the formatted number",
  },
  "page.budget.budgetQuarterName": {
    message: "{year}年第{quarter}季度",
    description:
      "A quarter's name on the Budget page; {quarter} is 1\u20134, {year} the year",
  },
  "page.budget.budgetWeekOf": {
    message: "{date} 当周",
    description:
      "A week's name on the Budget page; {date} is its first day, yyyy-MM-dd",
  },
  "page.budget.budgetOfTarget": {
    message: "目标 {target}",
    description:
      "Under a budget's actual in the narrow summary, its target; {target} is an amount with its currency",
  },
  "page.budget.budgetNoMatchFor": {
    message: "没有包含“{query}”的预算账户。",
    description:
      "Budget page when a search finds no budget; {query} is what was typed",
  },
  "page.budget.budgetReadFailedLedgerUnchanged": {
    message: "账本没有任何改动。请再试一次，或稍后再来。",
    description:
      "Message when the Budget page could not read its budgets, above Try Again: nothing was changed",
  },
  "page.budget.budgetSummaryCaption": {
    message:
      "先列未达成的目标，再列已达成的，最后列仍在进行中的；每组内按偏离目标的百分比从大到小排列。",
    description:
      "Caption of the Budget page's summary table: what it lists and how it is ordered",
  },
  "page.budget.budgetEntriesEnd": {
    message: "记录截至 {date}，因此数字以最后一个完整月份的月末 {day} 为准。",
    description:
      "Under the Budget summary's caption when the ledger stopped: {date} is its last entry, {day} the day whose periods are shown",
  },
  "page.budget.budgetTargetsHeading": {
    message: "目标",
    description: "Heading over a budget card's list of dated targets",
  },
  "page.budget.budgetTargetsHelp": {
    message: "每个目标自其日期起生效，直到下一个目标；它们共同构成虚线。",
    description:
      "Under the Targets heading on a budget card: how dated targets apply",
  },
  "page.budget.budgetBackToSummary": {
    message: "返回汇总",
    description:
      "Link at the end of a budget card back to the Budget page's summary",
  },
  "page.budget.budgetEntriesEndBeforeSpan": {
    message: "记录截至 {date}，早于此时间范围的开始。",
    description:
      "Under the Budget summary's caption when the chosen time span starts after the ledger's last entry {date}",
  },
  "page.budget.budgetInProgress": {
    message: "进行中",
    description:
      "Badge for a budget period that has not ended yet, so no verdict is given",
  },
  "page.budget.budgetLegendMissed": {
    message: "未达目标",
    description:
      "Chart key for a red bar: a period on the wrong side of its target",
  },
  "page.budget.budgetLegendNotJudged": {
    message: "未评判",
    description:
      "Chart key for a pale bar: a period with no target yet, or one still running, so not judged",
  },
};

export default zhBudget;
