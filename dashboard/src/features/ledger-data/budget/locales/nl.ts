export interface TranslationEntry {
  message: string;
  description: string;
}

const nlBudget: Record<string, TranslationEntry> = {
  "page.budget.budget": {
    message: "Budget",
    description: "Page title and label for the budget feature",
  },
  "page.budget.budgetAccountHelp": {
    message:
      "Budgetten gelden voor één account, bijv. Expenses:Food:Groceries. Een nieuwere richtlijn voor hetzelfde account en dezelfde valuta geldt vanaf de datum.",
    description: "Help text under the account field in the add-budget dialog",
  },
  "page.budget.budgetAccountPlaceholder": {
    message: "Expenses:Groceries",
    description: "Placeholder for budget account input",
  },
  "page.budget.budgetAccountRequired": {
    message: "Rekening is vereist",
    description: "Validation error when account field is empty",
  },
  "page.budget.budgetAddBudget": {
    message: "Budget toevoegen",
    description: "Button text to add a new budget",
  },
  "page.budget.budgetAddEntry": {
    message: "Budget bijwerken",
    description: "Button to add a new budget entry",
  },
  "page.budget.budgetAmount": {
    message: "Bedrag",
    description: "Form label and table header for budget amount",
  },
  "page.budget.budgetAmountRequired": {
    message: "Bedrag is vereist",
    description: "Validation error when amount field is empty",
  },
  "page.budget.budgetCurrency": {
    message: "Valuta",
    description: "Form label for budget currency field",
  },
  "page.budget.budgetCurrencyRequired": {
    message: "Valuta is vereist",
    description: "Validation error when currency field is empty",
  },
  "page.budget.budgetCurrentBudget": {
    message: "Huidig budget",
    description: "Label for the currently active budget amount",
  },
  "page.budget.budgetDate": {
    message: "Datum",
    description: "Form label for budget date field",
  },
  "page.budget.budgetDeleteDescription": {
    message:
      "De {interval}-budgetrichtlijn van {amount} voor {account} met ingang {date} verwijderen? Hiermee wordt één budgetregel verwijderd en kan niet ongedaan worden gemaakt.",
    description:
      "Confirmation message for deleting a budget. {interval}, {amount}, {account}, {date} are replaced with actual values.",
  },
  "page.budget.budgetDeleteTitle": {
    message: "Budget verwijderen",
    description: "Dialog title for deleting a budget",
  },
  "page.budget.budgetDeleting": {
    message: "Verwijderen...",
    description: "Loading state text when deleting a budget",
  },
  "page.budget.budgetDescription": {
    message:
      "Stel uitgavendoelen per account in met budgetrichtlijnen. Elke kaart vergelijkt je werkelijke uitgaven met het actieve budget voor dat account en interval.",
    description: "Page description for the budget feature",
  },
  "page.budget.budgetEmptyStateCta": {
    message: "Je eerste budget toevoegen",
    description: "Empty state call-to-action button",
  },
  "page.budget.budgetFailedToAdd": {
    message: "Budget kon niet worden toegevoegd",
    description: "Error message when adding a budget fails",
  },
  "page.budget.budgetFailedToLoad": {
    message: "Budgetten konden niet worden geladen",
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
    message: "Dagelijks",
    description: "Budget interval option - daily",
  },
  "page.budget.budgetIntervalFilterLabel": {
    message: "[TODO] Interval",
    description: "Label for the budget interval filter pill group",
  },
  "page.budget.budgetIntervalMonthly": {
    message: "Maandelijks",
    description: "Budget interval option - monthly",
  },
  "page.budget.budgetIntervalQuarterly": {
    message: "Kwartaal",
    description: "Budget interval option - quarterly",
  },
  "page.budget.budgetIntervalWeekly": {
    message: "Wekelijks",
    description: "Budget interval option - weekly",
  },
  "page.budget.budgetIntervalYearly": {
    message: "Jaarlijks",
    description: "Budget interval option - yearly",
  },
  "page.budget.budgetLatestSpending": {
    message: "Laatste werkelijke waarde",
    description: "Label for the most recent interval's spending",
  },
  "page.budget.budgetNoBudgetsFound": {
    message: "Geen budgetten gevonden",
    description: "Empty state title when no budgets exist",
  },
  "page.budget.budgetNoBudgetsFoundDescription": {
    message:
      "Maak een budgetrichtlijn om uitgavendoelen voor je accounts te volgen.",
    description: "Empty state description when no budgets exist",
  },
  "page.budget.budgetNoDataAvailable": {
    message: "Geen gegevens beschikbaar",
    description: "Chart empty state text when no data exists",
  },
  "page.budget.budgetOnBudget": {
    message: "Op doel",
    description: "Badge/text shown when spending matches budget",
  },
  "page.budget.budgetOverBudget": {
    message: "Boven doel",
    description: "Badge/text shown when spending exceeds budget",
  },
  "page.budget.budgetSearchPlaceholder": {
    message: "Zoek budgetten op account...",
    description: "Placeholder for budget search input",
  },
  "page.budget.budgetSelectInterval": {
    message: "Interval selecteren",
    description: "Placeholder for interval select dropdown",
  },
  "page.budget.budgetSpending": {
    message: "Werkelijk",
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
    message: "Onder doel",
    description: "Badge/text shown when spending is below budget",
  },
  "page.budget.budgetVariance": {
    message: "Verschil",
    description: "Label for budget variance (spending minus budget)",
  },
};

export default nlBudget;
