export interface TranslationEntry {
  message: string;
  description: string;
}

const esCashFlow: Record<string, TranslationEntry> = {
  "page.cashFlow.accountClosed": {
    message: "Cerrada",
    description: "Status label for a closed cash account",
  },
  "page.cashFlow.accountColumn": {
    message: "Cuenta",
    description: "Column header for the cash account name",
  },
  "page.cashFlow.accountOpen": {
    message: "Abierta",
    description: "Status label for an open cash account",
  },
  "page.cashFlow.balanceColumn": {
    message: "Saldo",
    description: "Column header for the cash account balance",
  },
  "page.cashFlow.byActivity": {
    message: "Por actividad",
    description: "Tab label for the per-activity cash flow chart",
  },
  "page.cashFlow.byActivityDescription": {
    message:
      "Flujos de efectivo operativos, de inversión y de financiación de {ledgerName} por intervalo",
    description: "Description for the per-activity cash flow chart",
  },
  "page.cashFlow.cashAccountsDescription": {
    message:
      "Cuentas tratadas como efectivo y equivalentes al elaborar este estado.",
    description: "Description for the cash and equivalents status panel",
  },
  "page.cashFlow.cashAccountsTitle": {
    message: "Efectivo y equivalentes en este informe",
    description: "Title for the cash and equivalents status panel",
  },
  "page.cashFlow.classificationDocLink": {
    message: "Cómo se clasifican las cuentas",
    description:
      "Link text in the cash flow page header that opens the documentation on classifying accounts with cash-flow-role",
  },
  "page.cashFlow.closingCash": {
    message: "Efectivo y equivalentes al final del período",
    description: "Label for the closing cash and cash equivalents balance",
  },
  "page.cashFlow.declaredRoleBadge": {
    message: "declarado",
    description:
      "Marker shown next to cash-flow rows whose activity classification is declared in the ledger",
  },
  "page.cashFlow.declaredRoleTooltip": {
    message:
      "Actividad declarada en el libro mayor mediante metadatos cash-flow-role",
    description:
      "Tooltip for the declared marker explaining the classification comes from cash-flow-role metadata in the ledger",
  },
  "page.cashFlow.financing": {
    message: "Actividades de financiación",
    description: "Section title for financing cash flows",
  },
  "page.cashFlow.hideClosedAccounts": {
    message: "Ocultar cerradas",
    description: "Button label to hide closed cash accounts",
  },
  "page.cashFlow.investing": {
    message: "Actividades de inversión",
    description: "Section title for investing cash flows",
  },
  "page.cashFlow.netCashFlow": {
    message: "Flujo de caja neto",
    description: "Tab label for the net cash flow chart",
  },
  "page.cashFlow.netCashFlowDescription": {
    message:
      "Siga el flujo de caja neto de {ledgerName} por moneda a lo largo del tiempo",
    description: "Description for the net cash flow chart",
  },
  "page.cashFlow.netChangeInCash": {
    message: "Cambio neto en efectivo y equivalentes",
    description: "Label for the net change in cash and cash equivalents",
  },
  "page.cashFlow.netChangeDescription": {
    message:
      "Efectivo y equivalentes al inicio y al final del período de {ledgerName} con el cambio neto del período",
    description: "Description for the net change in cash summary card",
  },
  "page.cashFlow.noCashAccounts": {
    message:
      "Ninguna cuenta de {assets} tiene un nombre como {names}, y ninguna declara {role} en su directiva de apertura. Añade {role} bajo la directiva de apertura de cada cuenta bancaria o monedero.",
    description:
      'Cash flow empty state when the ledger has accounts but none counts as cash; {assets} is the ledger\'s own assets root name, {names} the account names the cash rule looks for (kept as written), and {role} the literal cash-flow-role: "cash" metadata line',
  },
  "page.cashFlow.noCashAccountsTitle": {
    message: "Ninguna cuenta se considera efectivo",
    description:
      "Cash flow empty state title when no account in the ledger counts as cash",
  },
  "page.cashFlow.noData": {
    message:
      "No se encontraron datos de flujo de efectivo para este libro mayor.",
    description: "Empty state message for cash flow statement",
  },
  "page.cashFlow.openingCash": {
    message: "Efectivo y equivalentes al inicio del período",
    description: "Label for the opening cash and cash equivalents balance",
  },
  "page.cashFlow.operating": {
    message: "Actividades operativas",
    description: "Section title for operating cash flows",
  },
  "page.cashFlow.reconciliationDescription": {
    message:
      "La conversión o los filtros seleccionados no concuerdan con los movimientos de caja registrados. Prueba {atCost} o ajusta los filtros del informe. La exportación no está disponible hasta que el informe se concilie.",
    description:
      "Recovery guidance when conversion or filtering prevents cash-flow reconciliation",
  },
  "page.cashFlow.reconciliationDescriptionAtCost": {
    message:
      "Los movimientos registrados en este periodo no cuadran con las cuentas de efectivo al coste. Ajusta los filtros del informe o revisa si el libro tiene errores. La exportación no estará disponible hasta que el estado cuadre.",
    description:
      "Recovery guidance when cash flow does not reconcile while At Cost is already selected",
  },
  "page.cashFlow.reconciliationTitle": {
    message: "No se puede conciliar el flujo de caja",
    description: "Title for the unsupported cash-flow reconciliation state",
  },
  "page.cashFlow.showClosedAccounts": {
    message: "Mostrar cerradas",
    description: "Button label to reveal closed cash accounts",
  },
  "page.cashFlow.statusColumn": {
    message: "Estado",
    description: "Column header for the cash account open/closed status",
  },
  "page.cashFlow.unknownCashFlowRole": {
    message:
      "Valor de cash-flow-role desconocido, se usa el valor predeterminado",
    description:
      "Note shown when an account's cash-flow-role metadata value is not a valid role and the default heuristic is used",
  },
};

export default esCashFlow;
