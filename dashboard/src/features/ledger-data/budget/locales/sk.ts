export interface TranslationEntry {
  message: string;
  description: string;
}

const skBudget: Record<string, TranslationEntry> = {
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
    message: "Expenses:Groceries",
    description: "Placeholder for budget account input",
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
      "Nastavte si ciele výdavkov pre jednotlivé účty pomocou rozpočtových direktív. Každá karta porovnáva vaše skutočné výdavky s aktívnym rozpočtom pre daný účet a interval.",
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
};

export default skBudget;
