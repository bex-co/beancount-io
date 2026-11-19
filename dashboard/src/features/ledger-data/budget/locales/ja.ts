export interface TranslationEntry {
  message: string;
  description: string;
}

const jaBudget: Record<string, TranslationEntry> = {
  "page.budget.budgetUpdateForAccount": {
    message: "{account}（{currency}）の予算を更新",
    description:
      "Accessible name of the update button, identifying the budget card's account and currency",
  },
  "page.budget.budgetDeleteEntry": {
    message: "予算を削除: {account}、{date}、{amount}、{interval}",
    description:
      "Accessible name of a budget history row's delete button, naming the directive it removes",
  },
  "page.budget.budgetDeleteEntryNumbered": {
    message:
      "予算を削除: {account}、{date}、{amount}、{interval}（{position} 件目）",
    description:
      "Same as budgetDeleteEntry, with the row's position when other rows read identically",
  },
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
    message: "勘定科目（例：Expenses:Food:Groceries）",
    description: "Placeholder for budget account input",
  },
  "page.budget.budgetIncomeAmountHelp": {
    message:
      "収益の目標は、Beancount が収益を記録するのと同じく負の金額で保存されます。",
    description:
      "Shown under Add Budget's amount for an account under the ledger's income root",
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
  "page.budget.budgetDeleteIntervalDaily": {
    message: "毎日",
    description:
      "Cadence phrase inside the delete-budget confirmation sentence",
  },
  "page.budget.budgetDeleteIntervalWeekly": {
    message: "毎週",
    description:
      "Cadence phrase inside the delete-budget confirmation sentence",
  },
  "page.budget.budgetDeleteIntervalMonthly": {
    message: "毎月",
    description:
      "Cadence phrase inside the delete-budget confirmation sentence",
  },
  "page.budget.budgetDeleteIntervalQuarterly": {
    message: "四半期ごと",
    description:
      "Cadence phrase inside the delete-budget confirmation sentence",
  },
  "page.budget.budgetDeleteIntervalYearly": {
    message: "毎年",
    description:
      "Cadence phrase inside the delete-budget confirmation sentence",
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
      "口座に日付付きの目標を設定します（費用や収益のカテゴリなど）。各カードは実績をその期間に有効な目標と比較します。",
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
  "page.budget.budgetInterval": {
    message: "期間",
    description: "Form label and table header for budget interval",
  },
  "page.budget.budgetIntervalAll": {
    message: "すべて",
    description: "Budget interval filter option that shows all intervals",
  },
  "page.budget.budgetIntervalDaily": {
    message: "毎日",
    description: "Budget interval option - daily",
  },
  "page.budget.budgetIntervalFilterLabel": {
    message: "間隔",
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
  "page.budget.budgetPeriod": {
    message: "期間",
    description: "Column header for a chart period in the budget period table",
  },
  "page.budget.budgetPeriodData": {
    message: "期間別データ",
    description: "Disclosure label for the budget chart's period data table",
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
    message: "全期間",
    description: "Time span filter option that shows all available history",
  },
  "page.budget.budgetTimeSpanFilterLabel": {
    message: "期間",
    description: "Label for the budget time span filter pill group",
  },
  "page.budget.budgetTimeSpanLast12Months": {
    message: "過去12か月",
    description: "Time span filter option for the trailing 12 months",
  },
  "page.budget.budgetTimeSpanLastYear": {
    message: "昨年",
    description: "Time span filter option for the previous calendar year",
  },
  "page.budget.budgetTimeSpanThisYear": {
    message: "今年",
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
  "page.budget.budgetCount_other": {
    message: "{shown} 件の予算",
    description:
      "Budget count under the Budget page title, after the ledger name; {shown} is the formatted number",
  },
  "page.budget.budgetQuarterName": {
    message: "{year}年第{quarter}四半期",
    description:
      "A quarter's name on the Budget page; {quarter} is 1\u20134, {year} the year",
  },
  "page.budget.budgetWeekOf": {
    message: "{date}の週",
    description:
      "A week's name on the Budget page; {date} is its first day, yyyy-MM-dd",
  },
  "page.budget.budgetOfTarget": {
    message: "目標 {target}",
    description:
      "Under a budget's actual in the narrow summary, its target; {target} is an amount with its currency",
  },
  "page.budget.budgetNoMatchFor": {
    message: "「{query}」を含む予算口座はありません。",
    description:
      "Budget page when a search finds no budget; {query} is what was typed",
  },
  "page.budget.budgetReadFailedLedgerUnchanged": {
    message:
      "台帳には何も変更はありません。もう一度試すか、少し待ってから開き直してください。",
    description:
      "Message when the Budget page could not read its budgets, above Try Again: nothing was changed",
  },
  "page.budget.budgetSummaryCaption": {
    message:
      "未達の目標、達成した目標、進行中の目標の順。各グループ内では目標からの乖離率が大きいものから。",
    description:
      "Caption of the Budget page's summary table: what it lists and how it is ordered",
  },
  "page.budget.budgetEntriesEnd": {
    message:
      "記録は{date}で終わるため、数値は最後の丸1か月の末日である{day}時点のものです。",
    description:
      "Under the Budget summary's caption when the ledger stopped: {date} is its last entry, {day} the day whose periods are shown",
  },
  "page.budget.budgetTargetsHeading": {
    message: "目標",
    description: "Heading over a budget card's list of dated targets",
  },
  "page.budget.budgetTargetsHelp": {
    message: "各目標はその日付から次の目標まで有効で、合わせて破線を描きます。",
    description:
      "Under the Targets heading on a budget card: how dated targets apply",
  },
  "page.budget.budgetBackToSummary": {
    message: "概要に戻る",
    description:
      "Link at the end of a budget card back to the Budget page's summary",
  },
  "page.budget.budgetEntriesEndBeforeSpan": {
    message: "記録は{date}で終わっており、この期間の開始より前です。",
    description:
      "Under the Budget summary's caption when the chosen time span starts after the ledger's last entry {date}",
  },
  "page.budget.budgetInProgress": {
    message: "進行中",
    description:
      "Badge for a budget period that has not ended yet, so no verdict is given",
  },
  "page.budget.budgetLegendMissed": {
    message: "目標未達",
    description:
      "Chart key for a red bar: a period on the wrong side of its target",
  },
  "page.budget.budgetLegendNotJudged": {
    message: "判定なし",
    description:
      "Chart key for a pale bar: a period with no target yet, or one still running, so not judged",
  },
};

export default jaBudget;
