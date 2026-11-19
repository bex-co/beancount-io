export interface TranslationEntry {
  message: string;
  description: string;
}

const deBudget: Record<string, TranslationEntry> = {
  "page.budget.budgetUpdateForAccount": {
    message: "Budget für {account} ({currency}) aktualisieren",
    description:
      "Accessible name of the update button, identifying the budget card's account and currency",
  },
  "page.budget.budgetDeleteEntry": {
    message: "Budget löschen: {account}, {date}, {amount}, {interval}",
    description:
      "Accessible name of a budget history row's delete button, naming the directive it removes",
  },
  "page.budget.budgetDeleteEntryNumbered": {
    message:
      "Budget löschen: {account}, {date}, {amount}, {interval} (Eintrag {position})",
    description:
      "Same as budgetDeleteEntry, with the row's position when other rows read identically",
  },
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
    message: "Konto (z. B. Expenses:Food:Groceries)",
    description: "Placeholder for budget account input",
  },
  "page.budget.budgetIncomeAmountHelp": {
    message:
      "Einnahmenziele werden als negative Beträge gespeichert, so wie Beancount Einnahmen verbucht.",
    description:
      "Shown under Add Budget's amount for an account under the ledger's income root",
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
  "page.budget.budgetDeleteIntervalDaily": {
    message: "tägliche",
    description:
      "Cadence phrase inside the delete-budget confirmation sentence",
  },
  "page.budget.budgetDeleteIntervalWeekly": {
    message: "wöchentliche",
    description:
      "Cadence phrase inside the delete-budget confirmation sentence",
  },
  "page.budget.budgetDeleteIntervalMonthly": {
    message: "monatliche",
    description:
      "Cadence phrase inside the delete-budget confirmation sentence",
  },
  "page.budget.budgetDeleteIntervalQuarterly": {
    message: "vierteljährliche",
    description:
      "Cadence phrase inside the delete-budget confirmation sentence",
  },
  "page.budget.budgetDeleteIntervalYearly": {
    message: "jährliche",
    description:
      "Cadence phrase inside the delete-budget confirmation sentence",
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
      "Legen Sie datierte Ziele für ein Konto fest, etwa eine Ausgaben- oder Einnahmenkategorie. Jede Karte vergleicht die tatsächliche Aktivität mit dem für den Zeitraum gültigen Ziel.",
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
  "page.budget.budgetInterval": {
    message: "Intervall",
    description: "Form label and table header for budget interval",
  },
  "page.budget.budgetIntervalAll": {
    message: "Alle",
    description: "Budget interval filter option that shows all intervals",
  },
  "page.budget.budgetIntervalDaily": {
    message: "Täglich",
    description: "Budget interval option - daily",
  },
  "page.budget.budgetIntervalFilterLabel": {
    message: "Intervall",
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
  "page.budget.budgetPeriod": {
    message: "Zeitraum",
    description: "Column header for a chart period in the budget period table",
  },
  "page.budget.budgetPeriodData": {
    message: "Daten je Zeitraum",
    description: "Disclosure label for the budget chart's period data table",
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
    message: "Gesamter Zeitraum",
    description: "Time span filter option that shows all available history",
  },
  "page.budget.budgetTimeSpanFilterLabel": {
    message: "Zeitraum",
    description: "Label for the budget time span filter pill group",
  },
  "page.budget.budgetTimeSpanLast12Months": {
    message: "Letzte 12 Monate",
    description: "Time span filter option for the trailing 12 months",
  },
  "page.budget.budgetTimeSpanLastYear": {
    message: "Letztes Jahr",
    description: "Time span filter option for the previous calendar year",
  },
  "page.budget.budgetTimeSpanThisYear": {
    message: "Dieses Jahr",
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
  "page.budget.budgetCount_one": {
    message: "{shown} Budget",
    description:
      "Budget count under the Budget page title, after the ledger name; {shown} is the formatted number",
  },
  "page.budget.budgetCount_other": {
    message: "{shown} Budgets",
    description:
      "Budget count under the Budget page title, after the ledger name; {shown} is the formatted number",
  },
  "page.budget.budgetQuarterName": {
    message: "Q{quarter} {year}",
    description:
      "A quarter's name on the Budget page; {quarter} is 1\u20134, {year} the year",
  },
  "page.budget.budgetWeekOf": {
    message: "Woche ab {date}",
    description:
      "A week's name on the Budget page; {date} is its first day, yyyy-MM-dd",
  },
  "page.budget.budgetOfTarget": {
    message: "von {target}",
    description:
      "Under a budget's actual in the narrow summary, its target; {target} is an amount with its currency",
  },
  "page.budget.budgetNoMatchFor": {
    message: "Kein Konto mit Budget enthält „{query}“.",
    description:
      "Budget page when a search finds no budget; {query} is what was typed",
  },
  "page.budget.budgetReadFailedLedgerUnchanged": {
    message:
      "An Ihrem Hauptbuch hat sich nichts geändert. Versuchen Sie es noch einmal oder kommen Sie in einer Minute wieder.",
    description:
      "Message when the Budget page could not read its budgets, above Try Again: nothing was changed",
  },
  "page.budget.budgetSummaryCaption": {
    message:
      "Zuerst verfehlte Ziele, dann erreichte, dann noch laufende; innerhalb jeder Gruppe die größte prozentuale Abweichung vom Ziel zuerst.",
    description:
      "Caption of the Budget page's summary table: what it lists and how it is ordered",
  },
  "page.budget.budgetEntriesEnd": {
    message:
      "Die Einträge enden am {date}; die Zahlen gelten zum {day}, dem Ende des letzten vollen Monats.",
    description:
      "Under the Budget summary's caption when the ledger stopped: {date} is its last entry, {day} the day whose periods are shown",
  },
  "page.budget.budgetTargetsHeading": {
    message: "Ziele",
    description: "Heading over a budget card's list of dated targets",
  },
  "page.budget.budgetTargetsHelp": {
    message:
      "Jedes Ziel gilt ab seinem Datum bis zum nächsten; zusammen ergeben sie die gestrichelte Linie.",
    description:
      "Under the Targets heading on a budget card: how dated targets apply",
  },
  "page.budget.budgetBackToSummary": {
    message: "Zurück zur Übersicht",
    description:
      "Link at the end of a budget card back to the Budget page's summary",
  },
  "page.budget.budgetEntriesEndBeforeSpan": {
    message: "Die Einträge enden am {date}, vor Beginn dieses Zeitraums.",
    description:
      "Under the Budget summary's caption when the chosen time span starts after the ledger's last entry {date}",
  },
  "page.budget.budgetInProgress": {
    message: "Läuft",
    description:
      "Badge for a budget period that has not ended yet, so no verdict is given",
  },
  "page.budget.budgetLegendMissed": {
    message: "Ziel verfehlt",
    description:
      "Chart key for a red bar: a period on the wrong side of its target",
  },
  "page.budget.budgetLegendNotJudged": {
    message: "Nicht bewertet",
    description:
      "Chart key for a pale bar: a period with no target yet, or one still running, so not judged",
  },
};

export default deBudget;
