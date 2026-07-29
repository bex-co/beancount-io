export interface TranslationEntry {
  message: string;
  description: string;
}

const deBudget: Record<string, TranslationEntry> = {
  "page.budget.budget": {
    message: "Budget",
    description: "Page title and label for the budget feature",
  },
  "page.budget.budgetAccountHelp": {
    message:
      "Budgets gelten für ein Konto, z. B. Expenses:Food:Groceries. Eine neuere Anweisung für dasselbe Konto und dieselbe Währung gilt ab ihrem Datum.",
    description: "Help text under the account field in the add-budget dialog",
  },
  "page.budget.budgetAccountPlaceholder": {
    message: "Expenses:Groceries",
    description: "Placeholder for budget account input",
  },
  "page.budget.budgetAccountRequired": {
    message: "Konto ist erforderlich",
    description: "Validation error when account field is empty",
  },
  "page.budget.budgetAddBudget": {
    message: "Budget hinzufügen",
    description: "Button text to add a new budget",
  },
  "page.budget.budgetAddEntry": {
    message: "Budget aktualisieren",
    description: "Button to add a new budget entry",
  },
  "page.budget.budgetAmount": {
    message: "Betrag",
    description: "Form label and table header for budget amount",
  },
  "page.budget.budgetAmountRequired": {
    message: "Betrag ist erforderlich",
    description: "Validation error when amount field is empty",
  },
  "page.budget.budgetCurrency": {
    message: "Währung",
    description: "Form label for budget currency field",
  },
  "page.budget.budgetCurrencyRequired": {
    message: "Währung ist erforderlich",
    description: "Validation error when currency field is empty",
  },
  "page.budget.budgetCurrentBudget": {
    message: "Aktuelles Budget",
    description: "Label for the currently active budget amount",
  },
  "page.budget.budgetDate": {
    message: "Datum",
    description: "Form label for budget date field",
  },
  "page.budget.budgetDeleteDescription": {
    message:
      "Die {interval}-Budgetrichtlinie von {amount} für {account} mit Wirkung ab {date} löschen? Dies entfernt einen einzelnen Budgeteintrag und kann nicht rückgängig gemacht werden.",
    description:
      "Confirmation message for deleting a budget. {interval}, {amount}, {account}, {date} are replaced with actual values.",
  },
  "page.budget.budgetDeleteTitle": {
    message: "Budget löschen",
    description: "Dialog title for deleting a budget",
  },
  "page.budget.budgetDeleting": {
    message: "Wird gelöscht...",
    description: "Loading state text when deleting a budget",
  },
  "page.budget.budgetDescription": {
    message:
      "Legen Sie datierte Ziele für Ausgaben- oder Einnahmenkonten fest. Jede Karte vergleicht die tatsächliche Aktivität mit dem für den Zeitraum gültigen Ziel.",
    description: "Page description for the budget feature",
  },
  "page.budget.budgetEmptyStateCta": {
    message: "Erstes Budget hinzufügen",
    description: "Empty state call-to-action button",
  },
  "page.budget.budgetFailedToAdd": {
    message: "Budget konnte nicht hinzugefügt werden",
    description: "Error message when adding a budget fails",
  },
  "page.budget.budgetFailedToLoad": {
    message: "Budgets konnten nicht geladen werden",
    description: "Error message when budgets fail to load",
  },
  "page.budget.budgetInterval": {
    message: "Intervall",
    description: "Form label and table header for budget interval",
  },
  "page.budget.budgetIntervalAll": {
    message: "[TODO] All",
    description: "Budget interval filter option that shows all intervals",
  },
  "page.budget.budgetIntervalDaily": {
    message: "Täglich",
    description: "Budget interval option - daily",
  },
  "page.budget.budgetIntervalFilterLabel": {
    message: "[TODO] Interval",
    description: "Label for the budget interval filter pill group",
  },
  "page.budget.budgetIntervalMonthly": {
    message: "Monatlich",
    description: "Budget interval option - monthly",
  },
  "page.budget.budgetIntervalQuarterly": {
    message: "Vierteljährlich",
    description: "Budget interval option - quarterly",
  },
  "page.budget.budgetIntervalWeekly": {
    message: "Wöchentlich",
    description: "Budget interval option - weekly",
  },
  "page.budget.budgetIntervalYearly": {
    message: "Jährlich",
    description: "Budget interval option - yearly",
  },
  "page.budget.budgetLatestSpending": {
    message: "Letzter Ist-Wert",
    description: "Label for the most recent interval's spending",
  },
  "page.budget.budgetNoBudgetsFound": {
    message: "Keine Budgets gefunden",
    description: "Empty state title when no budgets exist",
  },
  "page.budget.budgetNoBudgetsFoundDescription": {
    message:
      "Erstellen Sie eine Budgetrichtlinie, um Ausgabenziele für Ihre Konten zu verfolgen.",
    description: "Empty state description when no budgets exist",
  },
  "page.budget.budgetNoDataAvailable": {
    message: "Keine Daten verfügbar",
    description: "Chart empty state text when no data exists",
  },
  "page.budget.budgetOnBudget": {
    message: "Im Ziel",
    description: "Badge/text shown when spending matches budget",
  },
  "page.budget.budgetOverBudget": {
    message: "Über dem Ziel",
    description: "Badge/text shown when spending exceeds budget",
  },
  "page.budget.budgetSearchPlaceholder": {
    message: "Budgets nach Konto durchsuchen...",
    description: "Placeholder for budget search input",
  },
  "page.budget.budgetSelectInterval": {
    message: "Intervall auswählen",
    description: "Placeholder for interval select dropdown",
  },
  "page.budget.budgetSpending": {
    message: "Ist",
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
    message: "Unter dem Ziel",
    description: "Badge/text shown when spending is below budget",
  },
  "page.budget.budgetVariance": {
    message: "Abweichung",
    description: "Label for budget variance (spending minus budget)",
  },
};

export default deBudget;
