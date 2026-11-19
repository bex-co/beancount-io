export interface TranslationEntry {
  message: string;
  description: string;
}

const esBudget: Record<string, TranslationEntry> = {
  "page.budget.budgetUpdateForAccount": {
    message: "Actualizar presupuesto de {account} ({currency})",
    description:
      "Accessible name of the update button, identifying the budget card's account and currency",
  },
  "page.budget.budgetDeleteEntry": {
    message: "Eliminar presupuesto: {account}, {date}, {amount}, {interval}",
    description:
      "Accessible name of a budget history row's delete button, naming the directive it removes",
  },
  "page.budget.budgetDeleteEntryNumbered": {
    message:
      "Eliminar presupuesto: {account}, {date}, {amount}, {interval} (entrada {position})",
    description:
      "Same as budgetDeleteEntry, with the row's position when other rows read identically",
  },
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
    message: "Cuenta (p. ej., Expenses:Food:Groceries)",
    description: "Placeholder for budget account input",
  },
  "page.budget.budgetIncomeAmountHelp": {
    message:
      "Los objetivos de ingresos se guardan como importes negativos, igual que Beancount registra los ingresos.",
    description:
      "Shown under Add Budget's amount for an account under the ledger's income root",
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
  "page.budget.budgetDeleteIntervalDaily": {
    message: "Diario",
    description:
      "Cadence phrase inside the delete-budget confirmation sentence",
  },
  "page.budget.budgetDeleteIntervalWeekly": {
    message: "Semanal",
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
    message: "Eliminar presupuesto",
    description: "Dialog title for deleting a budget",
  },
  "page.budget.budgetDeleting": {
    message: "Eliminando...",
    description: "Loading state text when deleting a budget",
  },
  "page.budget.budgetDescription": {
    message:
      "Establece objetivos con fecha para una cuenta, como una categoría de gastos o ingresos. Cada tarjeta compara la actividad real con el objetivo vigente en ese periodo.",
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
  "page.budget.budgetInterval": {
    message: "Intervalo",
    description: "Form label and table header for budget interval",
  },
  "page.budget.budgetIntervalAll": {
    message: "Todos",
    description: "Budget interval filter option that shows all intervals",
  },
  "page.budget.budgetIntervalDaily": {
    message: "Diario",
    description: "Budget interval option - daily",
  },
  "page.budget.budgetIntervalFilterLabel": {
    message: "Intervalo",
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
  "page.budget.budgetPeriod": {
    message: "Período",
    description: "Column header for a chart period in the budget period table",
  },
  "page.budget.budgetPeriodData": {
    message: "Datos por período",
    description: "Disclosure label for the budget chart's period data table",
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
    message: "Todo el período",
    description: "Time span filter option that shows all available history",
  },
  "page.budget.budgetTimeSpanFilterLabel": {
    message: "Período",
    description: "Label for the budget time span filter pill group",
  },
  "page.budget.budgetTimeSpanLast12Months": {
    message: "Últimos 12 meses",
    description: "Time span filter option for the trailing 12 months",
  },
  "page.budget.budgetTimeSpanLastYear": {
    message: "Año pasado",
    description: "Time span filter option for the previous calendar year",
  },
  "page.budget.budgetTimeSpanThisYear": {
    message: "Este año",
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
  "page.budget.budgetCount_one": {
    message: "{shown} presupuesto",
    description:
      "Budget count under the Budget page title, after the ledger name; {shown} is the formatted number",
  },
  "page.budget.budgetCount_many": {
    message: "{shown} de presupuestos",
    description:
      "Budget count under the Budget page title, after the ledger name; {shown} is the formatted number",
  },
  "page.budget.budgetCount_other": {
    message: "{shown} presupuestos",
    description:
      "Budget count under the Budget page title, after the ledger name; {shown} is the formatted number",
  },
  "page.budget.budgetQuarterName": {
    message: "T{quarter} {year}",
    description:
      "A quarter's name on the Budget page; {quarter} is 1\u20134, {year} the year",
  },
  "page.budget.budgetWeekOf": {
    message: "Semana del {date}",
    description:
      "A week's name on the Budget page; {date} is its first day, yyyy-MM-dd",
  },
  "page.budget.budgetOfTarget": {
    message: "de {target}",
    description:
      "Under a budget's actual in the narrow summary, its target; {target} is an amount with its currency",
  },
  "page.budget.budgetNoMatchFor": {
    message: "Ninguna cuenta con presupuesto contiene «{query}».",
    description:
      "Budget page when a search finds no budget; {query} is what was typed",
  },
  "page.budget.budgetReadFailedLedgerUnchanged": {
    message:
      "Tu libro no ha cambiado. Inténtalo de nuevo o vuelve en un minuto.",
    description:
      "Message when the Budget page could not read its budgets, above Try Again: nothing was changed",
  },
  "page.budget.budgetSummaryCaption": {
    message:
      "Primero los objetivos incumplidos, luego los cumplidos y después los que siguen en curso; en cada grupo, primero la mayor desviación porcentual del objetivo.",
    description:
      "Caption of the Budget page's summary table: what it lists and how it is ordered",
  },
  "page.budget.budgetEntriesEnd": {
    message:
      "Los asientos terminan el {date}; las cifras son a {day}, el final del último mes completo.",
    description:
      "Under the Budget summary's caption when the ledger stopped: {date} is its last entry, {day} the day whose periods are shown",
  },
  "page.budget.budgetTargetsHeading": {
    message: "Objetivos",
    description: "Heading over a budget card's list of dated targets",
  },
  "page.budget.budgetTargetsHelp": {
    message:
      "Cada objetivo rige desde su fecha hasta el siguiente; juntos trazan la línea discontinua.",
    description:
      "Under the Targets heading on a budget card: how dated targets apply",
  },
  "page.budget.budgetBackToSummary": {
    message: "Volver al resumen",
    description:
      "Link at the end of a budget card back to the Budget page's summary",
  },
  "page.budget.budgetEntriesEndBeforeSpan": {
    message:
      "Los asientos terminan el {date}, antes de que empiece este período.",
    description:
      "Under the Budget summary's caption when the chosen time span starts after the ledger's last entry {date}",
  },
  "page.budget.budgetInProgress": {
    message: "En curso",
    description:
      "Badge for a budget period that has not ended yet, so no verdict is given",
  },
  "page.budget.budgetLegendMissed": {
    message: "Objetivo incumplido",
    description:
      "Chart key for a red bar: a period on the wrong side of its target",
  },
  "page.budget.budgetLegendNotJudged": {
    message: "Sin valorar",
    description:
      "Chart key for a pale bar: a period with no target yet, or one still running, so not judged",
  },
};

export default esBudget;
