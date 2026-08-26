import { createExportLocale } from "../export-locale";

export default createExportLocale({
  action: "Exportar",
  markdown: "Informe Markdown",
  csv: "Hoja de cálculo CSV",
  printSavePdf: "Imprimir / Guardar como PDF",
  completed: "La exportación del informe está lista.",
  failed: "No se pudo exportar el informe.",
  context: "Alcance y base",
  generatedAt: "Generado el {generatedAt}",
  asOf: "A fecha de",
  period: "Para el período",
  accountFilter: "Filtro de cuenta",
  advancedFilter: "Filtro avanzado",
  interval: "Intervalo",
  conversion: "Conversión",
  notApplied: "No aplicado",
  currency: "Moneda",
  unit: "Unidad",
  amount: "Importe",
  unauditedManagementReport: "Informe de gestión no auditado",
  unauditedMultiUnitManagementReport:
    "Anexo de gestión multiunidad no auditado",
  unauditedInternalDraft: "Borrador interno no auditado",
  statementSummary: "Resumen del estado",
  lineItem: "Partida",
  totalAssets: "Total de activos",
  totalLiabilities: "Total de pasivos",
  totalEquity: "Total de patrimonio",
  totalLiabilitiesAndEquity: "Total de pasivos y patrimonio",
  reconciliationDifference: "Diferencia de conciliación",
  totalRevenue: "Ingresos y otros rendimientos totales",
  totalExpenses: "Gastos totales",
  netLoss: "Pérdida neta",
  netCashOperating: "Flujo de caja neto de actividades operativas",
  netCashInvesting: "Flujo de caja neto de actividades de inversión",
  netCashFinancing: "Flujo de caja neto de actividades de financiación",
  netChangeInCash: "Cambio neto en efectivo y equivalentes",
  openingCash: "Efectivo y equivalentes al inicio del período",
  closingCash: "Efectivo y equivalentes al final del período",
  supportingAccountDetail: "Detalle de cuentas de apoyo",
  allActivity: "Toda la actividad disponible del libro hasta",
  dateUnavailable: "Fecha del informe no disponible",
  presentationCurrency: "Moneda de presentación",
  ledgerUnits: "Unidades del libro mostradas",
  sourceLedger: "Libro de origen",
  importantNotices: "Avisos importantes",
  reportingEntity: "Entidad informante",
  netIncome: "Resultado neto",
  reportingEntityFallbackNotice:
    'No se configuró una entidad informante. Se usa el nombre del libro de origen; defina la option "title" de Beancount antes del uso externo.',
  placeholderDataNotice:
    "La entidad informante o el libro de origen parece contener datos de ejemplo. Sustitúyalos antes del uso externo.",
  inferredPeriodNotice:
    "Este informe abarca la actividad del libro desde {startDate} hasta {endDate}. Las fechas se derivaron de los datos disponibles del informe.",
  periodNotExplicitNotice:
    "No se pudo determinar un período de informe completo. Este informe sigue siendo un borrador interno.",
  inferredAsOfDateNotice:
    "No se seleccionó una fecha de cierre explícita. Este estado usa la última fecha disponible en el informe: {asOfDate}.",
  asOfDateUnavailableNotice:
    "No se pudo determinar una fecha de cierre. Este estado sigue siendo un borrador interno.",
  subtotalRowsNotice:
    "Las filas en negrita son subtotales o totales y no deben sumarse a sus filas de detalle subyacentes.",
  partialReportNotice:
    "Los filtros de cuenta o avanzados limitan este informe; no es un estado financiero completo.",
  balanceSheetClassificationNotice:
    "El libro de origen no proporciona clasificaciones corrientes y no corrientes; las cuentas se presentan en el orden del libro.",
  balanceSheetDoesNotReconcileNotice:
    "La ecuación contable no concilia para una o más unidades. Revise los resultados no cerrados, filtros parciales, efectos de valoración o conversión y errores del libro antes de usarlo externamente. Este estado sigue siendo un borrador interno.",
  cashFlowClassificationNotice:
    "Las actividades operativas, de inversión y de financiación se infieren de los tipos y nombres de las cuentas sin un cash-flow-role declarado; las cuentas que lo declaran se clasifican tal como está escrito.",
  cashFlowCashEquivalentsNotice:
    "El conjunto de efectivo y equivalentes se infiere de los nombres de las cuentas (cuentas corrientes, de ahorro y similares). Revise las cuentas incluidas antes de su uso externo.",
  customUnitsNotice: "Unidades personalizadas que requieren revisión:",
  customUnitsDefinitionNotice:
    "Sus significados no están disponibles en esta exportación; documéntelos en una nota adjunta antes del uso externo.",
  multiUnitScheduleNotice:
    "Este informe multiunidad es un anexo de gestión, no un estado financiero en una sola moneda de presentación. No sume importes entre unidades; seleccione una moneda de presentación antes del uso externo.",
  noAssurance:
    "No se proporciona aseguramiento. Se preparó con registros aportados por el usuario; no se verificaron la identidad, integridad, valoración ni el cumplimiento contable.",
  generatedBy: "Generado por Beancount.io el {generatedAt}",
});
