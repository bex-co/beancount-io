export interface TranslationEntry {
  message: string;
  description: string;
}

const frBudget: Record<string, TranslationEntry> = {
  "page.budget.budget": {
    message: "Budget",
    description: "Page title and label for the budget feature",
  },
  "page.budget.budgetAccountHelp": {
    message:
      "Les budgets s'appliquent à un compte, par ex. Expenses:Food:Groceries. Une directive plus récente pour le même compte et la même devise prend effet à sa date.",
    description: "Help text under the account field in the add-budget dialog",
  },
  "page.budget.budgetAccountPlaceholder": {
    message: "Expenses:Groceries",
    description: "Placeholder for budget account input",
  },
  "page.budget.budgetAccountRequired": {
    message: "Le compte est requis",
    description: "Validation error when account field is empty",
  },
  "page.budget.budgetAddBudget": {
    message: "Ajouter un budget",
    description: "Button text to add a new budget",
  },
  "page.budget.budgetAddEntry": {
    message: "Mettre à jour le budget",
    description: "Button to add a new budget entry",
  },
  "page.budget.budgetAmount": {
    message: "Montant",
    description: "Form label and table header for budget amount",
  },
  "page.budget.budgetAmountRequired": {
    message: "Le montant est requis",
    description: "Validation error when amount field is empty",
  },
  "page.budget.budgetCurrency": {
    message: "Devise",
    description: "Form label for budget currency field",
  },
  "page.budget.budgetCurrencyRequired": {
    message: "La devise est requise",
    description: "Validation error when currency field is empty",
  },
  "page.budget.budgetCurrentBudget": {
    message: "Budget actuel",
    description: "Label for the currently active budget amount",
  },
  "page.budget.budgetDate": {
    message: "Date",
    description: "Form label for budget date field",
  },
  "page.budget.budgetDeleteDescription": {
    message:
      "Supprimer la directive de budget {interval} de {amount} pour {account} en vigueur le {date} ? Cela supprime une seule entrée de budget et ne peut pas être annulé.",
    description:
      "Confirmation message for deleting a budget. {interval}, {amount}, {account}, {date} are replaced with actual values.",
  },
  "page.budget.budgetDeleteTitle": {
    message: "Supprimer le budget",
    description: "Dialog title for deleting a budget",
  },
  "page.budget.budgetDeleting": {
    message: "Suppression...",
    description: "Loading state text when deleting a budget",
  },
  "page.budget.budgetDescription": {
    message:
      "Définissez des objectifs de dépenses par compte avec des directives de budget. Chaque carte compare vos dépenses réelles au budget actif pour ce compte et cet intervalle.",
    description: "Page description for the budget feature",
  },
  "page.budget.budgetEmptyStateCta": {
    message: "Ajouter votre premier budget",
    description: "Empty state call-to-action button",
  },
  "page.budget.budgetFailedToAdd": {
    message: "Failed to add budget",
    description: "Error message when adding a budget fails",
  },
  "page.budget.budgetInterval": {
    message: "Intervalle",
    description: "Form label and table header for budget interval",
  },
  "page.budget.budgetIntervalAll": {
    message: "Tous",
    description: "Budget interval filter option that shows all intervals",
  },
  "page.budget.budgetIntervalDaily": {
    message: "Quotidien",
    description: "Budget interval option - daily",
  },
  "page.budget.budgetIntervalFilterLabel": {
    message: "Intervalle",
    description: "Label for the budget interval filter pill group",
  },
  "page.budget.budgetIntervalMonthly": {
    message: "Mensuel",
    description: "Budget interval option - monthly",
  },
  "page.budget.budgetIntervalQuarterly": {
    message: "Trimestriel",
    description: "Budget interval option - quarterly",
  },
  "page.budget.budgetIntervalWeekly": {
    message: "Hebdomadaire",
    description: "Budget interval option - weekly",
  },
  "page.budget.budgetIntervalYearly": {
    message: "Annuel",
    description: "Budget interval option - yearly",
  },
  "page.budget.budgetLatestSpending": {
    message: "Dernier montant réel",
    description: "Label for the most recent interval's spending",
  },
  "page.budget.budgetNoBudgetsFound": {
    message: "Aucun budget trouvé",
    description: "Empty state title when no budgets exist",
  },
  "page.budget.budgetNoBudgetsFoundDescription": {
    message:
      "Créez une directive de budget pour commencer à suivre les objectifs de dépenses de vos comptes.",
    description: "Empty state description when no budgets exist",
  },
  "page.budget.budgetNoDataAvailable": {
    message: "Aucune donnée disponible",
    description: "Chart empty state text when no data exists",
  },
  "page.budget.budgetOnBudget": {
    message: "Objectif atteint",
    description: "Badge/text shown when spending matches budget",
  },
  "page.budget.budgetOverBudget": {
    message: "Au-dessus de l’objectif",
    description: "Badge/text shown when spending exceeds budget",
  },
  "page.budget.budgetSearchPlaceholder": {
    message: "Rechercher les budgets par compte...",
    description: "Placeholder for budget search input",
  },
  "page.budget.budgetSelectInterval": {
    message: "Select interval",
    description: "Placeholder for interval select dropdown",
  },
  "page.budget.budgetSpending": {
    message: "Réel",
    description: "Chart series name for actual spending data",
  },
  "page.budget.budgetTimeSpanAll": {
    message: "Toute la période",
    description: "Time span filter option that shows all available history",
  },
  "page.budget.budgetTimeSpanFilterLabel": {
    message: "Période",
    description: "Label for the budget time span filter pill group",
  },
  "page.budget.budgetTimeSpanLast12Months": {
    message: "12 derniers mois",
    description: "Time span filter option for the trailing 12 months",
  },
  "page.budget.budgetTimeSpanLastYear": {
    message: "Année dernière",
    description: "Time span filter option for the previous calendar year",
  },
  "page.budget.budgetTimeSpanThisYear": {
    message: "Cette année",
    description: "Time span filter option for the current calendar year",
  },
  "page.budget.budgetUnderBudget": {
    message: "En dessous de l’objectif",
    description: "Badge/text shown when spending is below budget",
  },
  "page.budget.budgetVariance": {
    message: "Écart",
    description: "Label for budget variance (spending minus budget)",
  },
};

export default frBudget;
