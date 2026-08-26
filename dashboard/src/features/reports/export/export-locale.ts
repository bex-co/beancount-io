interface ExportLocaleMessages {
  action: string;
  csv: string;
  markdown: string;
  printSavePdf: string;
  completed: string;
  failed: string;
  context: string;
  generatedAt: string;
  asOf: string;
  period: string;
  accountFilter: string;
  advancedFilter: string;
  interval: string;
  conversion: string;
  notApplied: string;
  currency: string;
  unit: string;
  amount: string;
  unauditedManagementReport: string;
  unauditedMultiUnitManagementReport: string;
  unauditedInternalDraft: string;
  statementSummary: string;
  lineItem: string;
  totalAssets: string;
  totalLiabilities: string;
  totalEquity: string;
  totalLiabilitiesAndEquity: string;
  reconciliationDifference: string;
  totalRevenue: string;
  totalExpenses: string;
  netLoss: string;
  netCashOperating: string;
  netCashInvesting: string;
  netCashFinancing: string;
  netChangeInCash: string;
  openingCash: string;
  closingCash: string;
  supportingAccountDetail: string;
  allActivity: string;
  dateUnavailable: string;
  presentationCurrency: string;
  ledgerUnits: string;
  sourceLedger: string;
  reportingEntity: string;
  netIncome: string;
  importantNotices: string;
  reportingEntityFallbackNotice: string;
  placeholderDataNotice: string;
  inferredPeriodNotice: string;
  periodNotExplicitNotice: string;
  inferredAsOfDateNotice: string;
  asOfDateUnavailableNotice: string;
  subtotalRowsNotice: string;
  partialReportNotice: string;
  balanceSheetClassificationNotice: string;
  balanceSheetDoesNotReconcileNotice: string;
  cashFlowClassificationNotice: string;
  cashFlowCashEquivalentsNotice: string;
  customUnitsNotice: string;
  customUnitsDefinitionNotice: string;
  multiUnitScheduleNotice: string;
  noAssurance: string;
  generatedBy: string;
}

/** Keep the financial-statement export locale surface identical in every language. */
export function createExportLocale(messages: ExportLocaleMessages) {
  return {
    "reports.export.action": {
      message: messages.action,
      description: "Button that opens the financial-statement export menu",
    },
    "reports.export.csv": {
      message: messages.csv,
      description: "Menu item that exports the statement as CSV",
    },
    "reports.export.markdown": {
      message: messages.markdown,
      description: "Menu item that exports the statement as Markdown",
    },
    "reports.export.printSavePdf": {
      message: messages.printSavePdf,
      description:
        "Menu item that opens the browser print or save-as-PDF dialog",
    },
    "reports.export.completed": {
      message: messages.completed,
      description: "Success notification after handing off a statement export",
    },
    "reports.export.failed": {
      message: messages.failed,
      description: "Error notification when a statement export cannot start",
    },
    "reports.export.context": {
      message: messages.context,
      description: "Heading for active report filters in a printed statement",
    },
    "reports.export.generatedAt": {
      message: messages.generatedAt,
      description: "Printed statement generation timestamp",
    },
    "reports.export.asOf": {
      message: messages.asOf,
      description: "Balance sheet time-filter label",
    },
    "reports.export.period": {
      message: messages.period,
      description: "Profit and loss time-filter label",
    },
    "reports.export.accountFilter": {
      message: messages.accountFilter,
      description: "Active account filter label",
    },
    "reports.export.advancedFilter": {
      message: messages.advancedFilter,
      description: "Active advanced filter label",
    },
    "reports.export.interval": {
      message: messages.interval,
      description: "Active report interval label",
    },
    "reports.export.conversion": {
      message: messages.conversion,
      description: "Active currency conversion label",
    },
    "reports.export.notApplied": {
      message: messages.notApplied,
      description: "Value shown when a report filter is not active",
    },
    "reports.export.currency": {
      message: messages.currency,
      description: "Printed statement currency column header",
    },
    "reports.export.unit": {
      message: messages.unit,
      description: "Printed statement ledger unit or commodity column header",
    },
    "reports.export.amount": {
      message: messages.amount,
      description: "Printed statement amount column header",
    },
    "reports.export.unauditedManagementReport": {
      message: messages.unauditedManagementReport,
      description: "Status shown on a management-prepared statement",
    },
    "reports.export.unauditedMultiUnitManagementReport": {
      message: messages.unauditedMultiUnitManagementReport,
      description:
        "Status shown when a statement cannot use one presentation currency",
    },
    "reports.export.unauditedInternalDraft": {
      message: messages.unauditedInternalDraft,
      description:
        "Status shown when a statement is not ready for external use",
    },
    "reports.export.statementSummary": {
      message: messages.statementSummary,
      description: "Heading for a conventional single-step statement summary",
    },
    "reports.export.lineItem": {
      message: messages.lineItem,
      description: "Column heading for a summarized financial line item",
    },
    "reports.export.totalAssets": {
      message: messages.totalAssets,
      description: "Balance sheet total assets line",
    },
    "reports.export.totalLiabilities": {
      message: messages.totalLiabilities,
      description: "Balance sheet total liabilities line",
    },
    "reports.export.totalEquity": {
      message: messages.totalEquity,
      description: "Balance sheet total equity line",
    },
    "reports.export.totalLiabilitiesAndEquity": {
      message: messages.totalLiabilitiesAndEquity,
      description: "Balance sheet liabilities and equity control total",
    },
    "reports.export.reconciliationDifference": {
      message: messages.reconciliationDifference,
      description: "Difference between assets and liabilities plus equity",
    },
    "reports.export.totalRevenue": {
      message: messages.totalRevenue,
      description: "Single-step statement total revenue line",
    },
    "reports.export.totalExpenses": {
      message: messages.totalExpenses,
      description: "Single-step statement total expenses line",
    },
    "reports.export.netLoss": {
      message: messages.netLoss,
      description: "Statement-facing label when expenses exceed income",
    },
    "reports.export.netCashOperating": {
      message: messages.netCashOperating,
      description: "Cash flow statement net operating activities line",
    },
    "reports.export.netCashInvesting": {
      message: messages.netCashInvesting,
      description: "Cash flow statement net investing activities line",
    },
    "reports.export.netCashFinancing": {
      message: messages.netCashFinancing,
      description: "Cash flow statement net financing activities line",
    },
    "reports.export.netChangeInCash": {
      message: messages.netChangeInCash,
      description:
        "Cash flow statement net change in cash and equivalents line",
    },
    "reports.export.openingCash": {
      message: messages.openingCash,
      description: "Cash flow statement opening cash and equivalents line",
    },
    "reports.export.closingCash": {
      message: messages.closingCash,
      description: "Cash flow statement closing cash and equivalents line",
    },
    "reports.export.supportingAccountDetail": {
      message: messages.supportingAccountDetail,
      description: "Heading for the detailed account hierarchy appendix",
    },
    "reports.export.allActivity": {
      message: messages.allActivity,
      description: "Period label when no explicit starting date was selected",
    },
    "reports.export.dateUnavailable": {
      message: messages.dateUnavailable,
      description: "Statement date fallback when report data has no date",
    },
    "reports.export.presentationCurrency": {
      message: messages.presentationCurrency,
      description: "Label for a statement converted to one currency",
    },
    "reports.export.ledgerUnits": {
      message: messages.ledgerUnits,
      description: "Label for a multi-unit statement",
    },
    "reports.export.sourceLedger": {
      message: messages.sourceLedger,
      description: "Label identifying the source ledger",
    },
    "reports.export.reportingEntity": {
      message: messages.reportingEntity,
      description: "Label identifying the reporting entity",
    },
    "reports.export.netIncome": {
      message: messages.netIncome,
      description: "Statement-facing label for income less expenses",
    },
    "reports.export.importantNotices": {
      message: messages.importantNotices,
      description: "Heading for statement readiness notices",
    },
    "reports.export.reportingEntityFallbackNotice": {
      message: messages.reportingEntityFallbackNotice,
      description:
        "Notice that the source ledger name is standing in for a reporting entity",
    },
    "reports.export.placeholderDataNotice": {
      message: messages.placeholderDataNotice,
      description:
        "Notice that the reporting identity appears to contain example data",
    },
    "reports.export.inferredPeriodNotice": {
      message: messages.inferredPeriodNotice,
      description:
        "Notice that the displayed period was derived from available report data",
    },
    "reports.export.periodNotExplicitNotice": {
      message: messages.periodNotExplicitNotice,
      description:
        "Notice that a complete reporting period could not be determined",
    },
    "reports.export.inferredAsOfDateNotice": {
      message: messages.inferredAsOfDateNotice,
      description:
        "Notice that the balance sheet date was derived from available data",
    },
    "reports.export.asOfDateUnavailableNotice": {
      message: messages.asOfDateUnavailableNotice,
      description: "Notice that a balance sheet date could not be determined",
    },
    "reports.export.subtotalRowsNotice": {
      message: messages.subtotalRowsNotice,
      description:
        "Notice that bold subtotal and total rows must not be added to detail rows",
    },
    "reports.export.partialReportNotice": {
      message: messages.partialReportNotice,
      description:
        "Notice that account or advanced filters limit the statement",
    },
    "reports.export.balanceSheetClassificationNotice": {
      message: messages.balanceSheetClassificationNotice,
      description:
        "Notice that current and non-current classifications are unavailable",
    },
    "reports.export.balanceSheetDoesNotReconcileNotice": {
      message: messages.balanceSheetDoesNotReconcileNotice,
      description: "Notice that assets do not equal liabilities plus equity",
    },
    "reports.export.cashFlowClassificationNotice": {
      message: messages.cashFlowClassificationNotice,
      description:
        "Notice that the operating, investing, and financing split is inferred for accounts without a declared cash-flow-role",
    },
    "reports.export.cashFlowCashEquivalentsNotice": {
      message: messages.cashFlowCashEquivalentsNotice,
      description:
        "Notice that the cash and cash equivalents set is inferred from account names",
    },
    "reports.export.customUnitsNotice": {
      message: messages.customUnitsNotice,
      description: "Notice introducing custom ledger unit codes",
    },
    "reports.export.customUnitsDefinitionNotice": {
      message: messages.customUnitsDefinitionNotice,
      description:
        "Notice that custom unit meanings require accompanying documentation",
    },
    "reports.export.multiUnitScheduleNotice": {
      message: messages.multiUnitScheduleNotice,
      description:
        "Notice that a multi-unit schedule is not a single-currency financial statement",
    },
    "reports.export.noAssurance": {
      message: messages.noAssurance,
      description: "No-assurance disclaimer repeated in the print footer",
    },
    "reports.export.generatedBy": {
      message: messages.generatedBy,
      description: "Print footer with software source and generation time",
    },
  } as const;
}
