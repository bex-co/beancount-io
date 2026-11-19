export interface TranslationEntry {
  message: string;
  description: string;
}

const caBudget: Record<string, TranslationEntry> = {
  "page.budget.budgetUpdateForAccount": {
    message: "Actualitza el pressupost de {account} ({currency})",
    description:
      "Accessible name of the update button, identifying the budget card's account and currency",
  },
  "page.budget.budgetDeleteEntry": {
    message: "Suprimeix el pressupost: {account}, {date}, {amount}, {interval}",
    description:
      "Accessible name of a budget history row's delete button, naming the directive it removes",
  },
  "page.budget.budgetDeleteEntryNumbered": {
    message:
      "Suprimeix el pressupost: {account}, {date}, {amount}, {interval} (entrada {position})",
    description:
      "Same as budgetDeleteEntry, with the row's position when other rows read identically",
  },
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
    message: "Compte (p. ex., Expenses:Food:Groceries)",
    description: "Placeholder for budget account input",
  },
  "page.budget.budgetIncomeAmountHelp": {
    message:
      "Els objectius d’ingressos es desen com a imports negatius, tal com Beancount registra els ingressos.",
    description:
      "Shown under Add Budget's amount for an account under the ledger's income root",
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
    message: "L'import és obligatori",
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
  "page.budget.budgetDeleteIntervalDaily": {
    message: "Diari",
    description:
      "Cadence phrase inside the delete-budget confirmation sentence",
  },
  "page.budget.budgetDeleteIntervalWeekly": {
    message: "Setmanal",
    description:
      "Cadence phrase inside the delete-budget confirmation sentence",
  },
  "page.budget.budgetDeleteIntervalMonthly": {
    message: "Mensual",
    description:
      "Cadence phrase inside the delete-budget confirmation sentence",
  },
  "page.budget.budgetDeleteIntervalQuarterly": {
    message: "Trimestral",
    description:
      "Cadence phrase inside the delete-budget confirmation sentence",
  },
  "page.budget.budgetDeleteIntervalYearly": {
    message: "Anual",
    description:
      "Cadence phrase inside the delete-budget confirmation sentence",
  },
  "page.budget.budgetDeleteTitle": {
    message: "Elimina el pressupost",
    description: "Dialog title for deleting a budget",
  },
  "page.budget.budgetDeleting": {
    message: "S'està suprimint...",
    description: "Loading state text when deleting a budget",
  },
  "page.budget.budgetDescription": {
    message:
      "Establiu objectius datats per a un compte, com ara una categoria de despeses o ingressos. Cada targeta compara l’activitat real amb l’objectiu vigent en aquell període.",
    description: "Page description for the budget feature",
  },
  "page.budget.budgetEmptyStateCta": {
    message: "Afegeix el teu primer pressupost",
    description: "Empty state call-to-action button",
  },
  "page.budget.budgetFailedToAdd": {
    message: "No s'ha pogut afegir el pressupost",
    description: "Error message when adding a budget fails",
  },
  "page.budget.budgetInterval": {
    message: "Interval",
    description: "Form label and table header for budget interval",
  },
  "page.budget.budgetIntervalAll": {
    message: "Tots",
    description: "Budget interval filter option that shows all intervals",
  },
  "page.budget.budgetIntervalDaily": {
    message: "Diari",
    description: "Budget interval option - daily",
  },
  "page.budget.budgetIntervalFilterLabel": {
    message: "Interval",
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
    message: "No s'han trobat pressupostos",
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
  "page.budget.budgetPeriod": {
    message: "Període",
    description: "Column header for a chart period in the budget period table",
  },
  "page.budget.budgetPeriodData": {
    message: "Dades per període",
    description: "Disclosure label for the budget chart's period data table",
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
    message: "Seleccioneu l'interval",
    description: "Placeholder for interval select dropdown",
  },
  "page.budget.budgetSpending": {
    message: "Real",
    description: "Chart series name for actual spending data",
  },
  "page.budget.budgetTimeSpanAll": {
    message: "Tot el període",
    description: "Time span filter option that shows all available history",
  },
  "page.budget.budgetTimeSpanFilterLabel": {
    message: "Període de temps",
    description: "Label for the budget time span filter pill group",
  },
  "page.budget.budgetTimeSpanLast12Months": {
    message: "Últims 12 mesos",
    description: "Time span filter option for the trailing 12 months",
  },
  "page.budget.budgetTimeSpanLastYear": {
    message: "Any passat",
    description: "Time span filter option for the previous calendar year",
  },
  "page.budget.budgetTimeSpanThisYear": {
    message: "Aquest any",
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
  "page.budget.budgetCount_one": {
    message: "{shown} pressupost",
    description:
      "Budget count under the Budget page title, after the ledger name; {shown} is the formatted number",
  },
  "page.budget.budgetCount_many": {
    message: "{shown} de pressupostos",
    description:
      "Budget count under the Budget page title, after the ledger name; {shown} is the formatted number",
  },
  "page.budget.budgetCount_other": {
    message: "{shown} pressupostos",
    description:
      "Budget count under the Budget page title, after the ledger name; {shown} is the formatted number",
  },
  "page.budget.budgetQuarterName": {
    message: "T{quarter} {year}",
    description:
      "A quarter's name on the Budget page; {quarter} is 1\u20134, {year} the year",
  },
  "page.budget.budgetWeekOf": {
    message: "Setmana del {date}",
    description:
      "A week's name on the Budget page; {date} is its first day, yyyy-MM-dd",
  },
  "page.budget.budgetOfTarget": {
    message: "de {target}",
    description:
      "Under a budget's actual in the narrow summary, its target; {target} is an amount with its currency",
  },
  "page.budget.budgetNoMatchFor": {
    message: "Cap compte amb pressupost conté «{query}».",
    description:
      "Budget page when a search finds no budget; {query} is what was typed",
  },
  "page.budget.budgetReadFailedLedgerUnchanged": {
    message:
      "No ha canviat res del vostre llibre. Torneu-ho a provar o torneu d'aquí a un minut.",
    description:
      "Message when the Budget page could not read its budgets, above Try Again: nothing was changed",
  },
  "page.budget.budgetSummaryCaption": {
    message:
      "Primer els objectius no assolits, després els assolits i després els que encara estan en curs; dins de cada grup, primer la desviació més gran en percentatge de l'objectiu.",
    description:
      "Caption of the Budget page's summary table: what it lists and how it is ordered",
  },
  "page.budget.budgetEntriesEnd": {
    message:
      "Els registres acaben el {date}; les xifres són a {day}, el final de l'últim mes complet.",
    description:
      "Under the Budget summary's caption when the ledger stopped: {date} is its last entry, {day} the day whose periods are shown",
  },
  "page.budget.budgetTargetsHeading": {
    message: "Objectius",
    description: "Heading over a budget card's list of dated targets",
  },
  "page.budget.budgetTargetsHelp": {
    message:
      "Cada objectiu s'aplica des de la seva data fins al següent; junts dibuixen la línia discontínua.",
    description:
      "Under the Targets heading on a budget card: how dated targets apply",
  },
  "page.budget.budgetBackToSummary": {
    message: "Torna al resum",
    description:
      "Link at the end of a budget card back to the Budget page's summary",
  },
  "page.budget.budgetEntriesEndBeforeSpan": {
    message:
      "Els registres acaben el {date}, abans que comenci aquest període.",
    description:
      "Under the Budget summary's caption when the chosen time span starts after the ledger's last entry {date}",
  },
  "page.budget.budgetInProgress": {
    message: "En curs",
    description:
      "Badge for a budget period that has not ended yet, so no verdict is given",
  },
  "page.budget.budgetLegendMissed": {
    message: "Objectiu no assolit",
    description:
      "Chart key for a red bar: a period on the wrong side of its target",
  },
  "page.budget.budgetLegendNotJudged": {
    message: "Sense valorar",
    description:
      "Chart key for a pale bar: a period with no target yet, or one still running, so not judged",
  },
};

export default caBudget;
