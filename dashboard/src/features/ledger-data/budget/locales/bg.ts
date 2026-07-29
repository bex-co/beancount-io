export interface TranslationEntry {
  message: string;
  description: string;
}

const bgBudget: Record<string, TranslationEntry> = {
  "page.budget.budget": {
    message: "Бюджет",
    description: "Page title and label for the budget feature",
  },
  "page.budget.budgetAccountHelp": {
    message:
      "Бюджетите важат за една сметка, напр. Expenses:Food:Groceries. По-нова директива за същата сметка и валута влиза в сила на своята дата.",
    description: "Help text under the account field in the add-budget dialog",
  },
  "page.budget.budgetAccountPlaceholder": {
    message: "Expenses:Groceries",
    description: "Placeholder for budget account input",
  },
  "page.budget.budgetAccountRequired": {
    message: "Сметката е задължителна",
    description: "Validation error when account field is empty",
  },
  "page.budget.budgetAddBudget": {
    message: "Добавяне на бюджет",
    description: "Button text to add a new budget",
  },
  "page.budget.budgetAddEntry": {
    message: "Актуализиране на бюджета",
    description: "Button to add a new budget entry",
  },
  "page.budget.budgetAmount": {
    message: "Сума",
    description: "Form label and table header for budget amount",
  },
  "page.budget.budgetAmountRequired": {
    message: "Сумата е задължителна",
    description: "Validation error when amount field is empty",
  },
  "page.budget.budgetCurrency": {
    message: "Валута",
    description: "Form label for budget currency field",
  },
  "page.budget.budgetCurrencyRequired": {
    message: "Валутата е задължителна",
    description: "Validation error when currency field is empty",
  },
  "page.budget.budgetCurrentBudget": {
    message: "Текущ бюджет",
    description: "Label for the currently active budget amount",
  },
  "page.budget.budgetDate": {
    message: "Дата",
    description: "Form label for budget date field",
  },
  "page.budget.budgetDeleteDescription": {
    message:
      "Изтриване на {interval} бюджетната директива от {amount} за {account}, влязла в сила на {date}? Това премахва един бюджетен запис и не може да бъде отменено.",
    description:
      "Confirmation message for deleting a budget. {interval}, {amount}, {account}, {date} are replaced with actual values.",
  },
  "page.budget.budgetDeleteTitle": {
    message: "Изтриване на бюджет",
    description: "Dialog title for deleting a budget",
  },
  "page.budget.budgetDeleting": {
    message: "Изтриване...",
    description: "Loading state text when deleting a budget",
  },
  "page.budget.budgetDescription": {
    message:
      "Задайте цели за разходи по сметки с бюджетни директиви. Всяка карта сравнява реалните ви разходи с активния бюджет за тази сметка и интервал.",
    description: "Page description for the budget feature",
  },
  "page.budget.budgetEmptyStateCta": {
    message: "Добавете първия си бюджет",
    description: "Empty state call-to-action button",
  },
  "page.budget.budgetFailedToAdd": {
    message: "Неуспешно добавяне на бюджет",
    description: "Error message when adding a budget fails",
  },
  "page.budget.budgetFailedToLoad": {
    message: "Неуспешно зареждане на бюджетите",
    description: "Error message when budgets fail to load",
  },
  "page.budget.budgetInterval": {
    message: "Интервал",
    description: "Form label and table header for budget interval",
  },
  "page.budget.budgetIntervalAll": {
    message: "[TODO] All",
    description: "Budget interval filter option that shows all intervals",
  },
  "page.budget.budgetIntervalDaily": {
    message: "Дневно",
    description: "Budget interval option - daily",
  },
  "page.budget.budgetIntervalFilterLabel": {
    message: "[TODO] Interval",
    description: "Label for the budget interval filter pill group",
  },
  "page.budget.budgetIntervalMonthly": {
    message: "Месечно",
    description: "Budget interval option - monthly",
  },
  "page.budget.budgetIntervalQuarterly": {
    message: "Тримесечно",
    description: "Budget interval option - quarterly",
  },
  "page.budget.budgetIntervalWeekly": {
    message: "Седмично",
    description: "Budget interval option - weekly",
  },
  "page.budget.budgetIntervalYearly": {
    message: "Годишно",
    description: "Budget interval option - yearly",
  },
  "page.budget.budgetLatestSpending": {
    message: "Последна действителна стойност",
    description: "Label for the most recent interval's spending",
  },
  "page.budget.budgetNoBudgetsFound": {
    message: "Не са намерени бюджети",
    description: "Empty state title when no budgets exist",
  },
  "page.budget.budgetNoBudgetsFoundDescription": {
    message:
      "Създайте бюджетна директива, за да започнете да следите целите за разходи по сметките си.",
    description: "Empty state description when no budgets exist",
  },
  "page.budget.budgetNoDataAvailable": {
    message: "Няма налични данни",
    description: "Chart empty state text when no data exists",
  },
  "page.budget.budgetOnBudget": {
    message: "На целта",
    description: "Badge/text shown when spending matches budget",
  },
  "page.budget.budgetOverBudget": {
    message: "Над целта",
    description: "Badge/text shown when spending exceeds budget",
  },
  "page.budget.budgetSearchPlaceholder": {
    message: "Търсене на бюджети по сметка...",
    description: "Placeholder for budget search input",
  },
  "page.budget.budgetSelectInterval": {
    message: "Изберете интервал",
    description: "Placeholder for interval select dropdown",
  },
  "page.budget.budgetSpending": {
    message: "Действително",
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
    message: "Под целта",
    description: "Badge/text shown when spending is below budget",
  },
  "page.budget.budgetVariance": {
    message: "Отклонение",
    description: "Label for budget variance (spending minus budget)",
  },
};

export default bgBudget;
