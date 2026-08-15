export interface TranslationEntry {
  message: string;
  description: string;
}

const ukBudget: Record<string, TranslationEntry> = {
  "page.budget.budget": {
    message: "Бюджет",
    description: "Page title and label for the budget feature",
  },
  "page.budget.budgetAccountHelp": {
    message:
      "Бюджети застосовуються до одного рахунку, напр. Expenses:Food:Groceries. Новіша директива для того самого рахунку й валюти діє зі своєї дати.",
    description: "Help text under the account field in the add-budget dialog",
  },
  "page.budget.budgetAccountPlaceholder": {
    message: "Expenses:Groceries",
    description: "Placeholder for budget account input",
  },
  "page.budget.budgetAccountRequired": {
    message: "Account is required",
    description: "Validation error when account field is empty",
  },
  "page.budget.budgetAddBudget": {
    message: "Додати бюджет",
    description: "Button text to add a new budget",
  },
  "page.budget.budgetAddEntry": {
    message: "Оновити бюджет",
    description: "Button to add a new budget entry",
  },
  "page.budget.budgetAmount": {
    message: "Сума",
    description: "Form label and table header for budget amount",
  },
  "page.budget.budgetAmountRequired": {
    message: "Amount is required",
    description: "Validation error when amount field is empty",
  },
  "page.budget.budgetCurrency": {
    message: "Валюта",
    description: "Form label for budget currency field",
  },
  "page.budget.budgetCurrencyRequired": {
    message: "Currency is required",
    description: "Validation error when currency field is empty",
  },
  "page.budget.budgetCurrentBudget": {
    message: "Поточний бюджет",
    description: "Label for the currently active budget amount",
  },
  "page.budget.budgetDate": {
    message: "Дата",
    description: "Form label for budget date field",
  },
  "page.budget.budgetDeleteDescription": {
    message:
      "Видалити {interval} бюджетну директиву {amount} для {account}, що набуває чинності {date}? Це видалить один бюджетний запис і не можна буде скасувати.",
    description:
      "Confirmation message for deleting a budget. {interval}, {amount}, {account}, {date} are replaced with actual values.",
  },
  "page.budget.budgetDeleteTitle": {
    message: "Видалити бюджет",
    description: "Dialog title for deleting a budget",
  },
  "page.budget.budgetDeleting": {
    message: "Видалення...",
    description: "Loading state text when deleting a budget",
  },
  "page.budget.budgetDescription": {
    message:
      "Встановіть цілі витрат для кожного рахунку за допомогою бюджетних директив. Кожна картка порівнює ваші фактичні витрати з активним бюджетом для цього рахунку та інтервалу.",
    description: "Page description for the budget feature",
  },
  "page.budget.budgetEmptyStateCta": {
    message: "Додати перший бюджет",
    description: "Empty state call-to-action button",
  },
  "page.budget.budgetFailedToAdd": {
    message: "Не вдалося додати бюджет",
    description: "Error message when adding a budget fails",
  },
  "page.budget.budgetInterval": {
    message: "Інтервал",
    description: "Form label and table header for budget interval",
  },
  "page.budget.budgetIntervalAll": {
    message: "Усі",
    description: "Budget interval filter option that shows all intervals",
  },
  "page.budget.budgetIntervalDaily": {
    message: "Щодня",
    description: "Budget interval option - daily",
  },
  "page.budget.budgetIntervalFilterLabel": {
    message: "Інтервал",
    description: "Label for the budget interval filter pill group",
  },
  "page.budget.budgetIntervalMonthly": {
    message: "Щомісяця",
    description: "Budget interval option - monthly",
  },
  "page.budget.budgetIntervalQuarterly": {
    message: "Щоквартально",
    description: "Budget interval option - quarterly",
  },
  "page.budget.budgetIntervalWeekly": {
    message: "Щотижня",
    description: "Budget interval option - weekly",
  },
  "page.budget.budgetIntervalYearly": {
    message: "Щорічно",
    description: "Budget interval option - yearly",
  },
  "page.budget.budgetLatestSpending": {
    message: "Останнє фактичне значення",
    description: "Label for the most recent interval's spending",
  },
  "page.budget.budgetNoBudgetsFound": {
    message: "Бюджети не знайдено",
    description: "Empty state title when no budgets exist",
  },
  "page.budget.budgetNoBudgetsFoundDescription": {
    message:
      "Створіть бюджетну директиву, щоб розпочати відстеження цілей витрат для ваших рахунків.",
    description: "Empty state description when no budgets exist",
  },
  "page.budget.budgetNoDataAvailable": {
    message: "Дані недоступні",
    description: "Chart empty state text when no data exists",
  },
  "page.budget.budgetOnBudget": {
    message: "В цілі",
    description: "Badge/text shown when spending matches budget",
  },
  "page.budget.budgetOverBudget": {
    message: "Вище цілі",
    description: "Badge/text shown when spending exceeds budget",
  },
  "page.budget.budgetSearchPlaceholder": {
    message: "Пошук бюджетів за рахунком...",
    description: "Placeholder for budget search input",
  },
  "page.budget.budgetSelectInterval": {
    message: "Оберіть інтервал",
    description: "Placeholder for interval select dropdown",
  },
  "page.budget.budgetSpending": {
    message: "Факт",
    description: "Chart series name for actual spending data",
  },
  "page.budget.budgetTimeSpanAll": {
    message: "За весь час",
    description: "Time span filter option that shows all available history",
  },
  "page.budget.budgetTimeSpanFilterLabel": {
    message: "Період",
    description: "Label for the budget time span filter pill group",
  },
  "page.budget.budgetTimeSpanLast12Months": {
    message: "Останні 12 місяців",
    description: "Time span filter option for the trailing 12 months",
  },
  "page.budget.budgetTimeSpanLastYear": {
    message: "Минулий рік",
    description: "Time span filter option for the previous calendar year",
  },
  "page.budget.budgetTimeSpanThisYear": {
    message: "Цей рік",
    description: "Time span filter option for the current calendar year",
  },
  "page.budget.budgetUnderBudget": {
    message: "Нижче цілі",
    description: "Badge/text shown when spending is below budget",
  },
  "page.budget.budgetVariance": {
    message: "Відхилення",
    description: "Label for budget variance (spending minus budget)",
  },
};

export default ukBudget;
