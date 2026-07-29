export interface TranslationEntry {
  message: string;
  description: string;
}

const deTrialBalance: Record<string, TranslationEntry> = {
  "page.trialBalance.assetsHierarchy": {
    message: "Vermögenshierarchie",
    description: "Title for assets hierarchy card",
  },
  "page.trialBalance.assetsHierarchyDescription": {
    message: "Visuelle Darstellung {ledgerName} Vermögenszusammensetzung",
    description: "Description for assets hierarchy visualization",
  },
  "page.trialBalance.equityHierarchy": {
    message: "Eigenkapitalhierarchie",
    description: "Title for equity hierarchy card",
  },
  "page.trialBalance.equityHierarchyDescription": {
    message: "Visuelle Darstellung {ledgerName} Eigenkapitalzusammensetzung",
    description: "Description for equity hierarchy visualization",
  },
  "page.trialBalance.expensesHierarchy": {
    message: "Aufwendungshierarchie",
    description: "Title for expenses hierarchy card",
  },
  "page.trialBalance.expensesHierarchyDescription": {
    message: "Visuelle Darstellung {ledgerName} Aufwendungszusammensetzung",
    description: "Description for expenses hierarchy visualization",
  },
  "page.trialBalance.incomeHierarchy": {
    message: "Ertragshierarchie",
    description: "Title for income hierarchy card",
  },
  "page.trialBalance.incomeHierarchyDescription": {
    message: "Visuelle Darstellung {ledgerName} Ertragszusammensetzung",
    description: "Description for income hierarchy visualization",
  },
  "page.trialBalance.liabilitiesHierarchy": {
    message: "Verbindlichkeitenhierarchie",
    description: "Title for liabilities hierarchy card",
  },
  "page.trialBalance.liabilitiesHierarchyDescription": {
    message:
      "Visuelle Darstellung {ledgerName} Verbindlichkeitenzusammensetzung",
    description: "Description for liabilities hierarchy visualization",
  },
  "page.trialBalance.noData": {
    message: "Keine Saldenbilanz-Daten für dieses Hauptbuch gefunden.",
    description: "Message when no trial balance data exists",
  },
  "page.trialBalance.overviewTitle": {
    message: "Saldenbilanz",
    description: "Title for trial balance overview section",
  },
  "page.trialBalance.overviewDescription": {
    message:
      "Umfassende Übersicht aller Konten mit ihren Salden über alle Kontotypen hinweg",
    description: "Description for trial balance overview",
  },
};

export default deTrialBalance;
