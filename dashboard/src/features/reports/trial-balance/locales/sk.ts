export interface TranslationEntry {
  message: string;
  description: string;
}

const skTrialBalance: Record<string, TranslationEntry> = {
  "page.trialBalance.assetsHierarchy": {
    message: "Hierarchia aktív",
    description: "Title for assets hierarchy card",
  },
  "page.trialBalance.assetsHierarchyDescription": {
    message: "Vizuálna reprezentácia zloženia {ledgerName} aktív",
    description: "Description for assets hierarchy visualization",
  },
  "page.trialBalance.equityHierarchy": {
    message: "Hierarchia vlastného imania",
    description: "Title for equity hierarchy card",
  },
  "page.trialBalance.equityHierarchyDescription": {
    message: "Vizuálna reprezentácia zloženia {ledgerName} vlastného imania",
    description: "Description for equity hierarchy visualization",
  },
  "page.trialBalance.expensesHierarchy": {
    message: "Hierarchia výdavkov",
    description: "Title for expenses hierarchy card",
  },
  "page.trialBalance.expensesHierarchyDescription": {
    message: "Vizuálna reprezentácia zloženia {ledgerName} výdavkov",
    description: "Description for expenses hierarchy visualization",
  },
  "page.trialBalance.incomeHierarchy": {
    message: "Hierarchia príjmov",
    description: "Title for income hierarchy card",
  },
  "page.trialBalance.incomeHierarchyDescription": {
    message: "Vizuálna reprezentácia zloženia {ledgerName} príjmov",
    description: "Description for income hierarchy visualization",
  },
  "page.trialBalance.liabilitiesHierarchy": {
    message: "Hierarchia záväzkov",
    description: "Title for liabilities hierarchy card",
  },
  "page.trialBalance.liabilitiesHierarchyDescription": {
    message: "Vizuálna reprezentácia zloženia {ledgerName} záväzkov",
    description: "Description for liabilities hierarchy visualization",
  },
  "page.trialBalance.noData": {
    message: "Pre túto knihu neboli nájdené žiadne údaje skúšobnej bilancie.",
    description: "Message when no trial balance data exists",
  },
  "page.trialBalance.overviewTitle": {
    message: "Skúšobná bilancia",
    description: "Title for trial balance overview section",
  },
  "page.trialBalance.overviewDescription": {
    message:
      "Komplexný prehľad všetkých účtov s ich zostatkami naprieč všetkými typmi účtov",
    description: "Description for trial balance overview",
  },
};

export default skTrialBalance;
