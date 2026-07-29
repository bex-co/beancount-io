export interface TranslationEntry {
  message: string;
  description: string;
}

const frTrialBalance: Record<string, TranslationEntry> = {
  "page.trialBalance.assetsHierarchy": {
    message: "Hiérarchie des actifs",
    description: "Title for assets hierarchy card",
  },
  "page.trialBalance.assetsHierarchyDescription": {
    message: "Représentation visuelle de la composition de {ledgerName} actifs",
    description: "Description for assets hierarchy visualization",
  },
  "page.trialBalance.equityHierarchy": {
    message: "Hiérarchie des capitaux propres",
    description: "Title for equity hierarchy card",
  },
  "page.trialBalance.equityHierarchyDescription": {
    message:
      "Représentation visuelle de la composition de {ledgerName} capitaux propres",
    description: "Description for equity hierarchy visualization",
  },
  "page.trialBalance.expensesHierarchy": {
    message: "Hiérarchie des dépenses",
    description: "Title for expenses hierarchy card",
  },
  "page.trialBalance.expensesHierarchyDescription": {
    message:
      "Représentation visuelle de la composition de {ledgerName} dépenses",
    description: "Description for expenses hierarchy visualization",
  },
  "page.trialBalance.incomeHierarchy": {
    message: "Hiérarchie des revenus",
    description: "Title for income hierarchy card",
  },
  "page.trialBalance.incomeHierarchyDescription": {
    message:
      "Représentation visuelle de la composition de {ledgerName} revenus",
    description: "Description for income hierarchy visualization",
  },
  "page.trialBalance.liabilitiesHierarchy": {
    message: "Hiérarchie des passifs",
    description: "Title for liabilities hierarchy card",
  },
  "page.trialBalance.liabilitiesHierarchyDescription": {
    message:
      "Représentation visuelle de la composition de {ledgerName} passifs",
    description: "Description for liabilities hierarchy visualization",
  },
  "page.trialBalance.noData": {
    message:
      "Aucune donnée de balance de vérification trouvée pour ce grand livre.",
    description: "Message when no trial balance data exists",
  },
  "page.trialBalance.overviewTitle": {
    message: "Balance de vérification",
    description: "Title for trial balance overview section",
  },
  "page.trialBalance.overviewDescription": {
    message:
      "Vue d'ensemble complète de tous les comptes avec leurs soldes pour tous les types de comptes",
    description: "Description for trial balance overview",
  },
};

export default frTrialBalance;
