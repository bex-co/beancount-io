export interface TranslationEntry {
  message: string;
  description: string;
}

const caTrialBalance: Record<string, TranslationEntry> = {
  "page.trialBalance.assetsHierarchy": {
    message: "Jerarquia d'Actius",
    description: "Title for assets hierarchy card",
  },
  "page.trialBalance.assetsHierarchyDescription": {
    message: "Representació visual de la composició de {ledgerName} actius",
    description: "Description for assets hierarchy visualization",
  },
  "page.trialBalance.equityHierarchy": {
    message: "Jerarquia del Patrimoni Net",
    description: "Title for equity hierarchy card",
  },
  "page.trialBalance.equityHierarchyDescription": {
    message:
      "Representació visual de la composició del {ledgerName} patrimoni net",
    description: "Description for equity hierarchy visualization",
  },
  "page.trialBalance.expensesHierarchy": {
    message: "Jerarquia de Despeses",
    description: "Title for expenses hierarchy card",
  },
  "page.trialBalance.expensesHierarchyDescription": {
    message:
      "Representació visual de la composició de les {ledgerName} despeses",
    description: "Description for expenses hierarchy visualization",
  },
  "page.trialBalance.incomeHierarchy": {
    message: "Jerarquia d'Ingressos",
    description: "Title for income hierarchy card",
  },
  "page.trialBalance.incomeHierarchyDescription": {
    message:
      "Representació visual de la composició dels {ledgerName} ingressos",
    description: "Description for income hierarchy visualization",
  },
  "page.trialBalance.liabilitiesHierarchy": {
    message: "Jerarquia de Passius",
    description: "Title for liabilities hierarchy card",
  },
  "page.trialBalance.liabilitiesHierarchyDescription": {
    message: "Representació visual de la composició dels {ledgerName} passius",
    description: "Description for liabilities hierarchy visualization",
  },
  "page.trialBalance.noData": {
    message:
      "No s'han trobat dades del balanç de comprovació per a aquest llibre.",
    description: "Message when no trial balance data exists",
  },
  "page.trialBalance.overviewTitle": {
    message: "Balanç de comprovació",
    description: "Title for trial balance overview section",
  },
  "page.trialBalance.overviewDescription": {
    message:
      "Visió general completa de tots els comptes amb els seus saldos per a tots els tipus de compte",
    description: "Description for trial balance overview",
  },
};

export default caTrialBalance;
