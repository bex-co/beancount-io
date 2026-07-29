export interface TranslationEntry {
  message: string;
  description: string;
}

const caBudget: Record<string, TranslationEntry> = {
  "page.budget.budget": {
    message: "Pressupost",
    description: "Page title and label for the budget feature",
  },
  "page.budget.budgetAccountHelp": {
    message:
      "Els pressupostos s'apliquen a un sol compte, p. ex. Expenses:Food:Groceries. Una directiva més recent per al mateix compte i moneda entra en vigor en la seva data.",
    description: "Help text under the account field in the add-budget dialog",
  },
  "page.budget.budgetAccountPlaceholder": {
    message: "Expenses:Groceries",
    description: "Placeholder for budget account input",
  },
  "page.budget.budgetAccountRequired": {
    message: "El compte és obligatori",
    description: "Validation error when account field is empty",
  },
  "page.budget.budgetAddBudget": {
    message: "Afegeix pressupost",
    description: "Button text to add a new budget",
  },
  "page.budget.budgetAddEntry": {
    message: "Actualitza el pressupost",
    description: "Button to add a new budget entry",
  },
  "page.budget.budgetAmount": {
    message: "Import",
    description: "Form label and table header for budget amount",
  },
  "page.budget.budgetAmountRequired": {
    message: "Amount is required",
    description: "Validation error when amount field is empty",
  },
  "page.budget.budgetCurrency": {
    message: "Moneda",
    description: "Form label for budget currency field",
  },
  "page.budget.budgetCurrencyRequired": {
    message: "La moneda és obligatòria",
    description: "Validation error when currency field is empty",
  },
  "page.budget.budgetCurrentBudget": {
    message: "Pressupost actual",
    description: "Label for the currently active budget amount",
  },
  "page.budget.budgetDate": {
    message: "Data",
    description: "Form label for budget date field",
  },
  "page.budget.budgetDeleteDescription": {
    message:
      "Suprimir la directiva de pressupost {interval} de {amount} per a {account} amb efecte el {date}? Això elimina una sola entrada de pressupost i no es pot desfer.",
    description:
      "Confirmation message for deleting a budget. {interval}, {amount}, {account}, {date} are replaced with actual values.",
  },
  "page.budget.budgetDeleteTitle": {
    message: "Elimina el pressupost",
    description: "Dialog title for deleting a budget",
  },
  "page.budget.budgetDeleting": {
    message: "Deleting...",
    description: "Loading state text when deleting a budget",
  },
  "page.budget.budgetDescription": {
    message:
      "Establiu objectius de despesa per compte amb directives de pressupost. Cada targeta compara la vostra despesa real amb el pressupost actiu per a aquest compte i interval.",
    description: "Page description for the budget feature",
  },
  "page.budget.budgetEmptyStateCta": {
    message: "Afegeix el teu primer pressupost",
    description: "Empty state call-to-action button",
  },
  "page.budget.budgetFailedToAdd": {
    message: "Failed to add budget",
    description: "Error message when adding a budget fails",
  },
  "page.budget.budgetFailedToLoad": {
    message: "Failed to load budgets",
    description: "Error message when budgets fail to load",
  },
  "page.budget.budgetInterval": {
    message: "Interval",
    description: "Form label and table header for budget interval",
  },
  "page.budget.budgetIntervalAll": {
    message: "[TODO] All",
    description: "Budget interval filter option that shows all intervals",
  },
  "page.budget.budgetIntervalDaily": {
    message: "Diari",
    description: "Budget interval option - daily",
  },
  "page.budget.budgetIntervalFilterLabel": {
    message: "[TODO] Interval",
    description: "Label for the budget interval filter pill group",
  },
  "page.budget.budgetIntervalMonthly": {
    message: "Mensual",
    description: "Budget interval option - monthly",
  },
  "page.budget.budgetIntervalQuarterly": {
    message: "Trimestral",
    description: "Budget interval option - quarterly",
  },
  "page.budget.budgetIntervalWeekly": {
    message: "Setmanal",
    description: "Budget interval option - weekly",
  },
  "page.budget.budgetIntervalYearly": {
    message: "Anual",
    description: "Budget interval option - yearly",
  },
  "page.budget.budgetLatestSpending": {
    message: "Últim import real",
    description: "Label for the most recent interval's spending",
  },
  "page.budget.budgetNoBudgetsFound": {
    message: "No budgets found",
    description: "Empty state title when no budgets exist",
  },
  "page.budget.budgetNoBudgetsFoundDescription": {
    message:
      "Creeu una directiva de pressupost per començar a fer un seguiment dels objectius de despesa dels vostres comptes.",
    description: "Empty state description when no budgets exist",
  },
  "page.budget.budgetNoDataAvailable": {
    message: "No hi ha dades disponibles",
    description: "Chart empty state text when no data exists",
  },
  "page.budget.budgetOnBudget": {
    message: "A l'objectiu",
    description: "Badge/text shown when spending matches budget",
  },
  "page.budget.budgetOverBudget": {
    message: "Per sobre de l'objectiu",
    description: "Badge/text shown when spending exceeds budget",
  },
  "page.budget.budgetSearchPlaceholder": {
    message: "Cerca pressupostos per compte...",
    description: "Placeholder for budget search input",
  },
  "page.budget.budgetSelectInterval": {
    message: "Select interval",
    description: "Placeholder for interval select dropdown",
  },
  "page.budget.budgetSpending": {
    message: "Real",
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
    message: "Per sota de l'objectiu",
    description: "Badge/text shown when spending is below budget",
  },
  "page.budget.budgetVariance": {
    message: "Diferència",
    description: "Label for budget variance (spending minus budget)",
  },
};

export default caBudget;
