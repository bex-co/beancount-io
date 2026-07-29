export interface TranslationEntry {
  message: string;
  description: string;
}

const esIncomeStatement: Record<string, TranslationEntry> = {
  "page.incomeStatement.expensesBreakdown": {
    message: "Jerarquía de Gastos",
    description: "Tab label for expenses hierarchy section",
  },
  "page.incomeStatement.expensesDescription": {
    message:
      "Seguimiento de {ledgerName} gastos en diferentes productos a lo largo del tiempo",
    description: "Description for expenses chart",
  },
  "page.incomeStatement.incomeBreakdown": {
    message: "Jerarquía de Ingresos",
    description: "Tab label for income hierarchy section",
  },
  "page.incomeStatement.incomeDescription": {
    message:
      "Seguimiento de {ledgerName} ingresos en diferentes productos a lo largo del tiempo",
    description: "Description for income chart",
  },
  "page.incomeStatement.monthlyNetIncome": {
    message: "Ingresos netos mensuales",
    description: "Net income calculated monthly",
  },
  "page.incomeStatement.netProfitDescription": {
    message:
      "Seguimiento de {ledgerName} beneficio neto en diferentes productos a lo largo del tiempo",
    description: "Description for net profit chart",
  },
  "page.incomeStatement.noData": {
    message:
      "No se encontraron datos de estado de resultados para este libro mayor.",
    description: "Empty state message for income statement",
  },
  "page.incomeStatement.selectChartMode": {
    message: "Seleccionar modo de gráfico",
    description: "Placeholder for chart mode select dropdown",
  },
  "page.incomeStatement.singleBars": {
    message: "Barras Individuales",
    description: "Chart mode option for single bars",
  },
  "page.incomeStatement.stackedBars": {
    message: "Barras Apiladas",
    description: "Chart mode option for stacked bars",
  },
  "page.incomeStatement.totalNetProfitOverPeriod": {
    message: "Beneficio neto total durante el período seleccionado",
    description: "Description for net profit summary table",
  },
};

export default esIncomeStatement;
