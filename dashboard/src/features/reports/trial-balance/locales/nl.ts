export interface TranslationEntry {
  message: string;
  description: string;
}

const nlTrialBalance: Record<string, TranslationEntry> = {
  "page.trialBalance.assetsHierarchy": {
    message: "Activahiërarchie",
    description: "Title for assets hierarchy card",
  },
  "page.trialBalance.assetsHierarchyDescription": {
    message: "Visuele weergave van {ledgerName} activasamenstelling",
    description: "Description for assets hierarchy visualization",
  },
  "page.trialBalance.equityHierarchy": {
    message: "Eigen vermogen hiërarchie",
    description: "Title for equity hierarchy card",
  },
  "page.trialBalance.equityHierarchyDescription": {
    message: "Visuele weergave van {ledgerName} eigen vermogen samenstelling",
    description: "Description for equity hierarchy visualization",
  },
  "page.trialBalance.expensesHierarchy": {
    message: "Uitgavenhiërarchie",
    description: "Title for expenses hierarchy card",
  },
  "page.trialBalance.expensesHierarchyDescription": {
    message: "Visuele weergave van {ledgerName} uitgavensamenstelling",
    description: "Description for expenses hierarchy visualization",
  },
  "page.trialBalance.incomeHierarchy": {
    message: "Inkomstenhiërarchie",
    description: "Title for income hierarchy card",
  },
  "page.trialBalance.incomeHierarchyDescription": {
    message: "Visuele weergave van {ledgerName} inkomstensamenstelling",
    description: "Description for income hierarchy visualization",
  },
  "page.trialBalance.liabilitiesHierarchy": {
    message: "Passivahiërarchie",
    description: "Title for liabilities hierarchy card",
  },
  "page.trialBalance.liabilitiesHierarchyDescription": {
    message: "Visuele weergave van {ledgerName} passivasamenstelling",
    description: "Description for liabilities hierarchy visualization",
  },
  "page.trialBalance.noData": {
    message: "Geen proefbalansgegevens gevonden voor dit grootboek.",
    description: "Message when no trial balance data exists",
  },
  "page.trialBalance.overviewTitle": {
    message: "Proefbalans",
    description: "Title for trial balance overview section",
  },
  "page.trialBalance.overviewDescription": {
    message:
      "Uitgebreid overzicht van alle rekeningen met hun saldi voor alle rekeningtypen",
    description: "Description for trial balance overview",
  },
};

export default nlTrialBalance;
