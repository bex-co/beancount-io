export interface TranslationEntry {
  message: string;
  description: string;
}

const skBudget: Record<string, TranslationEntry> = {
  "page.budget.budgetUpdateForAccount": {
    message: "Aktualizovať rozpočet pre {account} ({currency})",
    description:
      "Accessible name of the update button, identifying the budget card's account and currency",
  },
  "page.budget.budgetDeleteEntry": {
    message: "Odstrániť rozpočet: {account}, {date}, {amount}, {interval}",
    description:
      "Accessible name of a budget history row's delete button, naming the directive it removes",
  },
  "page.budget.budgetDeleteEntryNumbered": {
    message:
      "Odstrániť rozpočet: {account}, {date}, {amount}, {interval} (záznam {position})",
    description:
      "Same as budgetDeleteEntry, with the row's position when other rows read identically",
  },
  "page.budget.budget": {
    message: "Rozpočet",
    description: "Page title and label for the budget feature",
  },
  "page.budget.budgetAccountHelp": {
    message:
      "Rozpočty sa vzťahujú na jeden účet, napr. Expenses:Food:Groceries. Novšia direktíva pre rovnaký účet a menu platí od svojho dátumu.",
    description: "Help text under the account field in the add-budget dialog",
  },
  "page.budget.budgetAccountPlaceholder": {
    message: "Účet (napr. Expenses:Food:Groceries)",
    description: "Placeholder for budget account input",
  },
  "page.budget.budgetIncomeAmountHelp": {
    message:
      "Ciele príjmov sa ukladajú ako záporné sumy, tak ako Beancount zaznamenáva príjmy.",
    description:
      "Shown under Add Budget's amount for an account under the ledger's income root",
  },
  "page.budget.budgetAccountRequired": {
    message: "Účet je povinný",
    description: "Validation error when account field is empty",
  },
  "page.budget.budgetAddBudget": {
    message: "Pridať rozpočet",
    description: "Button text to add a new budget",
  },
  "page.budget.budgetAddEntry": {
    message: "Aktualizovať rozpočet",
    description: "Button to add a new budget entry",
  },
  "page.budget.budgetAmount": {
    message: "Suma",
    description: "Form label and table header for budget amount",
  },
  "page.budget.budgetAmountRequired": {
    message: "Suma je povinná",
    description: "Validation error when amount field is empty",
  },
  "page.budget.budgetCurrency": {
    message: "Mena",
    description: "Form label for budget currency field",
  },
  "page.budget.budgetCurrencyRequired": {
    message: "Mena je povinná",
    description: "Validation error when currency field is empty",
  },
  "page.budget.budgetCurrentBudget": {
    message: "Aktuálny rozpočet",
    description: "Label for the currently active budget amount",
  },
  "page.budget.budgetDate": {
    message: "Dátum",
    description: "Form label for budget date field",
  },
  "page.budget.budgetDeleteDescription": {
    message:
      "Odstrániť {interval} rozpočtovú direktívu {amount} pre {account} s účinnosťou {date}? Tým sa odstráni jeden rozpočtový záznam a nedá sa to vrátiť späť.",
    description:
      "Confirmation message for deleting a budget. {interval}, {amount}, {account}, {date} are replaced with actual values.",
  },
  "page.budget.budgetDeleteIntervalDaily": {
    message: "Denne",
    description:
      "Cadence phrase inside the delete-budget confirmation sentence",
  },
  "page.budget.budgetDeleteIntervalWeekly": {
    message: "Týždenne",
    description:
      "Cadence phrase inside the delete-budget confirmation sentence",
  },
  "page.budget.budgetDeleteIntervalMonthly": {
    message: "Mesačne",
    description:
      "Cadence phrase inside the delete-budget confirmation sentence",
  },
  "page.budget.budgetDeleteIntervalQuarterly": {
    message: "Štvrťročne",
    description:
      "Cadence phrase inside the delete-budget confirmation sentence",
  },
  "page.budget.budgetDeleteIntervalYearly": {
    message: "Ročne",
    description:
      "Cadence phrase inside the delete-budget confirmation sentence",
  },
  "page.budget.budgetDeleteTitle": {
    message: "Odstrániť rozpočet",
    description: "Dialog title for deleting a budget",
  },
  "page.budget.budgetDeleting": {
    message: "Odstraňuje sa...",
    description: "Loading state text when deleting a budget",
  },
  "page.budget.budgetDescription": {
    message:
      "Nastavte datované ciele pre účet, napríklad kategóriu výdavkov alebo príjmov. Každá karta porovnáva skutočnú aktivitu s cieľom platným v danom období.",
    description: "Page description for the budget feature",
  },
  "page.budget.budgetEmptyStateCta": {
    message: "Pridať prvý rozpočet",
    description: "Empty state call-to-action button",
  },
  "page.budget.budgetFailedToAdd": {
    message: "Pridanie rozpočtu zlyhalo",
    description: "Error message when adding a budget fails",
  },
  "page.budget.budgetInterval": {
    message: "Interval",
    description: "Form label and table header for budget interval",
  },
  "page.budget.budgetIntervalAll": {
    message: "Všetky",
    description: "Budget interval filter option that shows all intervals",
  },
  "page.budget.budgetIntervalDaily": {
    message: "Denne",
    description: "Budget interval option - daily",
  },
  "page.budget.budgetIntervalFilterLabel": {
    message: "Interval",
    description: "Label for the budget interval filter pill group",
  },
  "page.budget.budgetIntervalMonthly": {
    message: "Mesačne",
    description: "Budget interval option - monthly",
  },
  "page.budget.budgetIntervalQuarterly": {
    message: "Štvrťročne",
    description: "Budget interval option - quarterly",
  },
  "page.budget.budgetIntervalWeekly": {
    message: "Týždenne",
    description: "Budget interval option - weekly",
  },
  "page.budget.budgetIntervalYearly": {
    message: "Ročne",
    description: "Budget interval option - yearly",
  },
  "page.budget.budgetLatestSpending": {
    message: "Posledná skutočná hodnota",
    description: "Label for the most recent interval's spending",
  },
  "page.budget.budgetNoBudgetsFound": {
    message: "Žiadne rozpočty nenájdené",
    description: "Empty state title when no budgets exist",
  },
  "page.budget.budgetNoBudgetsFoundDescription": {
    message:
      "Vytvorte rozpočtovú direktívu a začnite sledovať ciele výdavkov pre svoje účty.",
    description: "Empty state description when no budgets exist",
  },
  "page.budget.budgetNoDataAvailable": {
    message: "Žiadne dostupné dáta",
    description: "Chart empty state text when no data exists",
  },
  "page.budget.budgetPeriod": {
    message: "Obdobie",
    description: "Column header for a chart period in the budget period table",
  },
  "page.budget.budgetPeriodData": {
    message: "Údaje podľa období",
    description: "Disclosure label for the budget chart's period data table",
  },
  "page.budget.budgetOnBudget": {
    message: "V cieli",
    description: "Badge/text shown when spending matches budget",
  },
  "page.budget.budgetOverBudget": {
    message: "Nad cieľom",
    description: "Badge/text shown when spending exceeds budget",
  },
  "page.budget.budgetSearchPlaceholder": {
    message: "Hľadať rozpočty podľa účtu...",
    description: "Placeholder for budget search input",
  },
  "page.budget.budgetSelectInterval": {
    message: "Vyberte interval",
    description: "Placeholder for interval select dropdown",
  },
  "page.budget.budgetSpending": {
    message: "Skutočnosť",
    description: "Chart series name for actual spending data",
  },
  "page.budget.budgetTimeSpanAll": {
    message: "Celé obdobie",
    description: "Time span filter option that shows all available history",
  },
  "page.budget.budgetTimeSpanFilterLabel": {
    message: "Časové obdobie",
    description: "Label for the budget time span filter pill group",
  },
  "page.budget.budgetTimeSpanLast12Months": {
    message: "Posledných 12 mesiacov",
    description: "Time span filter option for the trailing 12 months",
  },
  "page.budget.budgetTimeSpanLastYear": {
    message: "Minulý rok",
    description: "Time span filter option for the previous calendar year",
  },
  "page.budget.budgetTimeSpanThisYear": {
    message: "Tento rok",
    description: "Time span filter option for the current calendar year",
  },
  "page.budget.budgetUnderBudget": {
    message: "Pod cieľom",
    description: "Badge/text shown when spending is below budget",
  },
  "page.budget.budgetVariance": {
    message: "Odchýlka",
    description: "Label for budget variance (spending minus budget)",
  },
  "page.budget.budgetCount_one": {
    message: "{shown} rozpočet",
    description:
      "Budget count under the Budget page title, after the ledger name; {shown} is the formatted number",
  },
  "page.budget.budgetCount_few": {
    message: "{shown} rozpočty",
    description:
      "Budget count under the Budget page title, after the ledger name; {shown} is the formatted number",
  },
  "page.budget.budgetCount_many": {
    message: "{shown} rozpočtu",
    description:
      "Budget count under the Budget page title, after the ledger name; {shown} is the formatted number",
  },
  "page.budget.budgetCount_other": {
    message: "{shown} rozpočtov",
    description:
      "Budget count under the Budget page title, after the ledger name; {shown} is the formatted number",
  },
  "page.budget.budgetQuarterName": {
    message: "{quarter}. štvrťrok {year}",
    description:
      "A quarter's name on the Budget page; {quarter} is 1\u20134, {year} the year",
  },
  "page.budget.budgetWeekOf": {
    message: "Týždeň od {date}",
    description:
      "A week's name on the Budget page; {date} is its first day, yyyy-MM-dd",
  },
  "page.budget.budgetOfTarget": {
    message: "z {target}",
    description:
      "Under a budget's actual in the narrow summary, its target; {target} is an amount with its currency",
  },
  "page.budget.budgetNoMatchFor": {
    message: "Žiadny účet s rozpočtom neobsahuje „{query}“.",
    description:
      "Budget page when a search finds no budget; {query} is what was typed",
  },
  "page.budget.budgetReadFailedLedgerUnchanged": {
    message:
      "Vo vašej knihe sa nič nezmenilo. Skúste to znova alebo sa vráťte o minútu.",
    description:
      "Message when the Budget page could not read its budgets, above Try Again: nothing was changed",
  },
  "page.budget.budgetSummaryCaption": {
    message:
      "Najprv nesplnené ciele, potom splnené, potom ešte prebiehajúce; v každej skupine najprv najväčšia percentuálna odchýlka od cieľa.",
    description:
      "Caption of the Budget page's summary table: what it lists and how it is ordered",
  },
  "page.budget.budgetEntriesEnd": {
    message:
      "Záznamy končia {date}, preto sú údaje k {day}, koncu posledného celého mesiaca.",
    description:
      "Under the Budget summary's caption when the ledger stopped: {date} is its last entry, {day} the day whose periods are shown",
  },
  "page.budget.budgetTargetsHeading": {
    message: "Ciele",
    description: "Heading over a budget card's list of dated targets",
  },
  "page.budget.budgetTargetsHelp": {
    message:
      "Každý cieľ platí od svojho dátumu po ďalší; spolu tvoria prerušovanú čiaru.",
    description:
      "Under the Targets heading on a budget card: how dated targets apply",
  },
  "page.budget.budgetBackToSummary": {
    message: "Späť na prehľad",
    description:
      "Link at the end of a budget card back to the Budget page's summary",
  },
  "page.budget.budgetEntriesEndBeforeSpan": {
    message: "Záznamy končia {date}, pred začiatkom tohto obdobia.",
    description:
      "Under the Budget summary's caption when the chosen time span starts after the ledger's last entry {date}",
  },
  "page.budget.budgetInProgress": {
    message: "Prebieha",
    description:
      "Badge for a budget period that has not ended yet, so no verdict is given",
  },
  "page.budget.budgetLegendMissed": {
    message: "Cieľ nesplnený",
    description:
      "Chart key for a red bar: a period on the wrong side of its target",
  },
  "page.budget.budgetLegendNotJudged": {
    message: "Nehodnotené",
    description:
      "Chart key for a pale bar: a period with no target yet, or one still running, so not judged",
  },
};

export default skBudget;
