export interface TranslationEntry {
  message: string;
  description: string;
}

const esBudget: Record<string, TranslationEntry> = {
  "page.budget.budget": {
    message: "Presupuesto",
    description: "Page title and label for the budget feature",
  },
  "page.budget.budgetAccountHelp": {
    message:
      "Los presupuestos se aplican a una cuenta, p. ej. Expenses:Food:Groceries. Una directiva más reciente para la misma cuenta y moneda entra en vigor en su fecha.",
    description: "Help text under the account field in the add-budget dialog",
  },
  "page.budget.budgetAccountPlaceholder": {
    message: "Expenses:Groceries",
    description: "Placeholder for budget account input",
  },
  "page.budget.budgetAccountRequired": {
    message: "La cuenta es obligatoria",
    description: "Validation error when account field is empty",
  },
  "page.budget.budgetAddBudget": {
    message: "Agregar presupuesto",
    description: "Button text to add a new budget",
  },
  "page.budget.budgetAddEntry": {
    message: "Actualizar presupuesto",
    description: "Button to add a new budget entry",
  },
  "page.budget.budgetAmount": {
    message: "Monto",
    description: "Form label and table header for budget amount",
  },
  "page.budget.budgetAmountRequired": {
    message: "El monto es obligatorio",
    description: "Validation error when amount field is empty",
  },
  "page.budget.budgetCurrency": {
    message: "Moneda",
    description: "Form label for budget currency field",
  },
  "page.budget.budgetCurrencyRequired": {
    message: "La moneda es obligatoria",
    description: "Validation error when currency field is empty",
  },
  "page.budget.budgetCurrentBudget": {
    message: "Presupuesto actual",
    description: "Label for the currently active budget amount",
  },
  "page.budget.budgetDate": {
    message: "Fecha",
    description: "Form label for budget date field",
  },
  "page.budget.budgetDeleteDescription": {
    message:
      "¿Eliminar la directiva de presupuesto {interval} de {amount} para {account} con efecto {date}? Esto elimina una sola entrada de presupuesto y no se puede deshacer.",
    description:
      "Confirmation message for deleting a budget. {interval}, {amount}, {account}, {date} are replaced with actual values.",
  },
  "page.budget.budgetDeleteTitle": {
    message: "Eliminar presupuesto",
    description: "Dialog title for deleting a budget",
  },
  "page.budget.budgetDeleting": {
    message: "Eliminando...",
    description: "Loading state text when deleting a budget",
  },
  "page.budget.budgetDescription": {
    message:
      "Establece objetivos de gasto por cuenta con directivas de presupuesto. Cada tarjeta compara tu gasto real con el presupuesto activo para esa cuenta e intervalo.",
    description: "Page description for the budget feature",
  },
  "page.budget.budgetEmptyStateCta": {
    message: "Añadir tu primer presupuesto",
    description: "Empty state call-to-action button",
  },
  "page.budget.budgetFailedToAdd": {
    message: "Error al agregar el presupuesto",
    description: "Error message when adding a budget fails",
  },
  "page.budget.budgetFailedToLoad": {
    message: "Error al cargar los presupuestos",
    description: "Error message when budgets fail to load",
  },
  "page.budget.budgetInterval": {
    message: "Intervalo",
    description: "Form label and table header for budget interval",
  },
  "page.budget.budgetIntervalAll": {
    message: "[TODO] All",
    description: "Budget interval filter option that shows all intervals",
  },
  "page.budget.budgetIntervalDaily": {
    message: "Diario",
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
    message: "Semanal",
    description: "Budget interval option - weekly",
  },
  "page.budget.budgetIntervalYearly": {
    message: "Anual",
    description: "Budget interval option - yearly",
  },
  "page.budget.budgetLatestSpending": {
    message: "Último importe real",
    description: "Label for the most recent interval's spending",
  },
  "page.budget.budgetNoBudgetsFound": {
    message: "No se encontraron presupuestos",
    description: "Empty state title when no budgets exist",
  },
  "page.budget.budgetNoBudgetsFoundDescription": {
    message:
      "Crea una directiva de presupuesto para empezar a seguir los objetivos de gasto de tus cuentas.",
    description: "Empty state description when no budgets exist",
  },
  "page.budget.budgetNoDataAvailable": {
    message: "No hay datos disponibles",
    description: "Chart empty state text when no data exists",
  },
  "page.budget.budgetOnBudget": {
    message: "En objetivo",
    description: "Badge/text shown when spending matches budget",
  },
  "page.budget.budgetOverBudget": {
    message: "Por encima del objetivo",
    description: "Badge/text shown when spending exceeds budget",
  },
  "page.budget.budgetSearchPlaceholder": {
    message: "Buscar presupuestos por cuenta...",
    description: "Placeholder for budget search input",
  },
  "page.budget.budgetSelectInterval": {
    message: "Seleccionar intervalo",
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
    message: "Por debajo del objetivo",
    description: "Badge/text shown when spending is below budget",
  },
  "page.budget.budgetVariance": {
    message: "Diferencia",
    description: "Label for budget variance (spending minus budget)",
  },
};

export default esBudget;
