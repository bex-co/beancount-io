export interface TranslationEntry {
  message: string;
  description: string;
}

const caTrialBalance: Record<string, TranslationEntry> = {
  "page.trialBalance.assetsHierarchy": {
    message: "Representació visual de la composició dels {ledgerName} actius",
    description: "Title for assets hierarchy card",
  },
  "page.trialBalance.assetsHierarchyDescription": {
    message: "Representació visual de la composició de {ledgerName} actius",
    description: "Description for assets hierarchy visualization",
  },
  "page.trialBalance.equityHierarchy": {
    message: "Diari",
    description: "Title for equity hierarchy card",
  },
  "page.trialBalance.equityHierarchyDescription": {
    message:
      "Representació visual de la composició del {ledgerName} patrimoni net",
    description: "Description for equity hierarchy visualization",
  },
  "page.trialBalance.expensesHierarchy": {
    message:
      "Seguir les {ledgerName} despeses en diferents monedes al llarg del temps",
    description: "Title for expenses hierarchy card",
  },
  "page.trialBalance.expensesHierarchyDescription": {
    message:
      "Representació visual de la composició de les {ledgerName} despeses",
    description: "Description for expenses hierarchy visualization",
  },
  "page.trialBalance.incomeHierarchy": {
    message:
      "Seguir els {ledgerName} ingressos en diferents monedes al llarg del temps",
    description: "Title for income hierarchy card",
  },
  "page.trialBalance.incomeHierarchyDescription": {
    message:
      "Representació visual de la composició dels {ledgerName} ingressos",
    description: "Description for income hierarchy visualization",
  },
  "page.trialBalance.liabilitiesHierarchy": {
    message: "Representació visual de la composició dels {ledgerName} passius",
    description: "Title for liabilities hierarchy card",
  },
  "page.trialBalance.liabilitiesHierarchyDescription": {
    message: "Representació visual de la composició dels {ledgerName} passius",
    description: "Description for liabilities hierarchy visualization",
  },
  "page.trialBalance.noData": {
    message: "No s'han trobat coincidències",
    description: "Message when no trial balance data exists",
  },
  "page.trialBalance.overviewTitle": {
    message: "Balanç de comprovació",
    description: "Title for trial balance overview section",
  },
  "page.trialBalance.overviewDescription": {
    message: "Balanç de comprovació",
    description: "Description for trial balance overview",
  },
};

export default caTrialBalance;
