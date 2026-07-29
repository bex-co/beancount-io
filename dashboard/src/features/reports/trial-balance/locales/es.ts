export interface TranslationEntry {
  message: string;
  description: string;
}

const esTrialBalance: Record<string, TranslationEntry> = {
  "page.trialBalance.assetsHierarchy": {
    message: "Jerarquía de Activos",
    description: "Title for assets hierarchy card",
  },
  "page.trialBalance.assetsHierarchyDescription": {
    message: "Representación visual de la composición de {ledgerName} activos",
    description: "Description for assets hierarchy visualization",
  },
  "page.trialBalance.equityHierarchy": {
    message: "Jerarquía de Patrimonio",
    description: "Title for equity hierarchy card",
  },
  "page.trialBalance.equityHierarchyDescription": {
    message:
      "Representación visual de la composición de {ledgerName} patrimonio",
    description: "Description for equity hierarchy visualization",
  },
  "page.trialBalance.expensesHierarchy": {
    message: "Jerarquía de Gastos",
    description: "Title for expenses hierarchy card",
  },
  "page.trialBalance.expensesHierarchyDescription": {
    message: "Representación visual de la composición de {ledgerName} gastos",
    description: "Description for expenses hierarchy visualization",
  },
  "page.trialBalance.incomeHierarchy": {
    message: "Jerarquía de Ingresos",
    description: "Title for income hierarchy card",
  },
  "page.trialBalance.incomeHierarchyDescription": {
    message: "Representación visual de la composición de {ledgerName} ingresos",
    description: "Description for income hierarchy visualization",
  },
  "page.trialBalance.liabilitiesHierarchy": {
    message: "Jerarquía de Pasivos",
    description: "Title for liabilities hierarchy card",
  },
  "page.trialBalance.liabilitiesHierarchyDescription": {
    message: "Representación visual de la composición de {ledgerName} pasivos",
    description: "Description for liabilities hierarchy visualization",
  },
  "page.trialBalance.noData": {
    message:
      "No se encontraron datos de balance de comprobación para este libro mayor.",
    description: "Message when no trial balance data exists",
  },
  "page.trialBalance.overviewTitle": {
    message: "Balance de Comprobación",
    description: "Title for trial balance overview section",
  },
  "page.trialBalance.overviewDescription": {
    message:
      "Vista general completa de todas las cuentas con sus saldos en todos los tipos de cuenta",
    description: "Description for trial balance overview",
  },
};

export default esTrialBalance;
