export interface TranslationEntry {
  message: string;
  description: string;
}

const enBudget: Record<string, TranslationEntry> = {
  "page.budget.budget": {
    message: "Budget",
    description: "Page title and label for the budget feature",
  },
  "page.budget.budgetDescription": {
    message:
      "Set dated targets for expense or income accounts. Each card compares actual activity with the target that was active for that period.",
    description: "Page description for the budget feature",
  },
  "page.budget.budgetAddBudget": {
    message: "Add Budget",
    description: "Button text to add a new budget",
  },
  "page.budget.budgetNoBudgetsFound": {
    message: "No budgets found",
    description: "Empty state title when no budgets exist",
  },
  "page.budget.budgetNoBudgetsFoundDescription": {
    message:
      "Create a budget directive to start tracking spending targets for your accounts.",
    description: "Empty state description when no budgets exist",
  },
  "page.budget.budgetEmptyStateCta": {
    message: "Add Your First Budget",
    description: "Empty state call-to-action button",
  },
  "page.budget.budgetSearchPlaceholder": {
    message: "Search budgets by account...",
    description: "Placeholder for budget search input",
  },
  "page.budget.budgetCurrentBudget": {
    message: "Current budget",
    description: "Label for the currently active budget amount",
  },
  "page.budget.budgetLatestSpending": {
    message: "Latest actual",
    description: "Label for the most recent interval's actual amount",
  },
  "page.budget.budgetVariance": {
    message: "Variance",
    description: "Label for budget variance (spending minus budget)",
  },
  "page.budget.budgetOverBudget": {
    message: "Above target",
    description: "Badge/text shown when actual activity exceeds the target",
  },
  "page.budget.budgetUnderBudget": {
    message: "Below target",
    description: "Badge/text shown when actual activity is below the target",
  },
  "page.budget.budgetOnBudget": {
    message: "On target",
    description: "Badge/text shown when spending matches budget",
  },
  "page.budget.budgetAccountHelp": {
    message:
      "Budgets apply to one account, e.g. Expenses:Food:Groceries. A newer directive for the same account and currency takes effect on its date.",
    description: "Help text under the account field in the add-budget dialog",
  },
  "page.budget.budgetFailedToLoad": {
    message: "Failed to load budgets",
    description: "Error message when budgets fail to load",
  },
  "page.budget.budgetAccountRequired": {
    message: "Account is required",
    description: "Validation error when account field is empty",
  },
  "page.budget.budgetAmountRequired": {
    message: "Amount is required",
    description: "Validation error when amount field is empty",
  },
  "page.budget.budgetCurrencyRequired": {
    message: "Currency is required",
    description: "Validation error when currency field is empty",
  },
  "page.budget.budgetIntervalAll": {
    message: "All",
    description: "Budget interval filter option that shows all intervals",
  },
  "page.budget.budgetIntervalDaily": {
    message: "Daily",
    description: "Budget interval option - daily",
  },
  "page.budget.budgetIntervalWeekly": {
    message: "Weekly",
    description: "Budget interval option - weekly",
  },
  "page.budget.budgetIntervalMonthly": {
    message: "Monthly",
    description: "Budget interval option - monthly",
  },
  "page.budget.budgetIntervalQuarterly": {
    message: "Quarterly",
    description: "Budget interval option - quarterly",
  },
  "page.budget.budgetIntervalYearly": {
    message: "Yearly",
    description: "Budget interval option - yearly",
  },
  "page.budget.budgetIntervalFilterLabel": {
    message: "Interval",
    description: "Label for the budget interval filter pill group",
  },
  "page.budget.budgetTimeSpanFilterLabel": {
    message: "Time span",
    description: "Label for the budget time span filter pill group",
  },
  "page.budget.budgetTimeSpanAll": {
    message: "All time",
    description: "Time span filter option that shows all available history",
  },
  "page.budget.budgetTimeSpanThisYear": {
    message: "This year",
    description: "Time span filter option for the current calendar year",
  },
  "page.budget.budgetTimeSpanLastYear": {
    message: "Last year",
    description: "Time span filter option for the previous calendar year",
  },
  "page.budget.budgetTimeSpanLast12Months": {
    message: "Last 12 months",
    description: "Time span filter option for the trailing 12 months",
  },
  "page.budget.budgetFailedToAdd": {
    message: "Failed to add budget",
    description: "Error message when adding a budget fails",
  },
  "page.budget.budgetDate": {
    message: "Date",
    description: "Form label for budget date field",
  },
  "page.budget.budgetInterval": {
    message: "Interval",
    description: "Form label and table header for budget interval",
  },
  "page.budget.budgetAmount": {
    message: "Amount",
    description: "Form label and table header for budget amount",
  },
  "page.budget.budgetCurrency": {
    message: "Currency",
    description: "Form label for budget currency field",
  },
  "page.budget.budgetAccountPlaceholder": {
    message: "Expenses:Groceries",
    description: "Placeholder for budget account input",
  },
  "page.budget.budgetSelectInterval": {
    message: "Select interval",
    description: "Placeholder for interval select dropdown",
  },
  "page.budget.budgetNoDataAvailable": {
    message: "No Data Available",
    description: "Chart empty state text when no data exists",
  },
  "page.budget.budgetAddEntry": {
    message: "Update Budget",
    description: "Button to add a dated update to an existing budget",
  },
  "page.budget.budgetDeleteTitle": {
    message: "Delete Budget",
    description: "Dialog title for deleting a budget",
  },
  "page.budget.budgetDeleteDescription": {
    message:
      "Delete the {interval} budget directive of {amount} for {account} effective {date}? This removes a single budget entry and cannot be undone.",
    description:
      "Confirmation message for deleting a budget. {interval}, {amount}, {account}, {date} are replaced with actual values.",
  },
  "page.budget.budgetDeleting": {
    message: "Deleting...",
    description: "Loading state text when deleting a budget",
  },
  "page.budget.budgetSpending": {
    message: "Actual",
    description: "Chart series name for actual account activity",
  },
};

export default enBudget;
