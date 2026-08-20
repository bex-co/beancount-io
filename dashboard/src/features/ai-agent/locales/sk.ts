export interface TranslationEntry {
  message: string;
  description: string;
}

const skAiAgent: Record<string, TranslationEntry> = {
  "aiAgent.title": {
    message: "Opýtajte sa Beancount.io",
    description: "Title for AI chat feature",
  },
  "aiAgent.placeholder": {
    message: "Opýtajte sa ma na čokoľvek o Beancount...",
    description: "Input placeholder text",
  },
  "aiAgent.welcome": {
    message:
      "Ahoj! Som váš Beancount AI asistent, tu pomáham s vaším účtovníctvom v obyčajnom texte.\n\n" +
      "Môžem:\n" +
      "• Vysvetliť syntax Beancount a odladiť chyby\n" +
      "• Viesť vás písaním transakcií, účtov a direktív\n" +
      "• Odpovedať na otázky o účtovníctve a vedení kníh\n" +
      "• Pomôcť s dotazmi, správami a osvedčenými postupmi\n\n" +
      "Čo by ste chceli vedieť?",
    description: "Welcome message shown when chat loads",
  },
  "aiAgent.prCreated": {
    message: "✓ Pull Request vytvorený",
    description: "Message shown when PR is created",
  },
  "aiAgent.viewPR": {
    message: "Zobraziť PR #",
    description: "Link text to view pull request",
  },
  "aiAgent.quickAskPlaceholder": {
    message: "Opýtajte sa ma čokoľvek o tejto knihe...",
    description: "Placeholder for quick ask input on overview page",
  },
  "aiAgent.ask": {
    message: "Opýtať sa",
    description: "Button text to submit quick question",
  },
  "aiAgent.limitReached": {
    message:
      "You've reached your monthly AI token limit ({max} tokens). Please upgrade your plan for more AI tokens, or wait until next month.",
    description: "Message when user hits AI CFO monthly limit",
  },
  "aiAgent.serviceUnavailable": {
    message:
      "The AI service is temporarily unavailable. Please try again in a few minutes.",
    description:
      "Message when AI CFO service is down or usage check fails (503)",
  },
  "aiAgent.upgradeTitle": {
    message: "AI požiadavky sa míňajú",
    description: "Title for upgrade panel when near AI usage cap",
  },
  "aiAgent.upgradeDescription": {
    message:
      "Tento mesiac ste použili {used} z {max} požiadaviek. Inovujte pre viac.",
    description: "Description for upgrade panel showing usage",
  },
  "aiAgent.upgradeCta": {
    message: "Inovovať",
    description: "Button text to upgrade plan",
  },
  "aiAgent.premiumTier": {
    message: "Premium",
    description: "Premium tier name",
  },
  "aiAgent.growthTier": {
    message: "Growth",
    description: "Growth tier name",
  },
  "aiAgent.organizationTier": {
    message: "Organization",
    description: "Organization tier name",
  },
  "aiAgent.perMonth": {
    message: "/mes.",
    description: "Per month pricing suffix",
  },
  "aiAgent.tokensPerMonth": {
    message: "{count} tokenov / mesiac",
    description: "Number of AI tokens included in a tier",
  },
  "aiAgent.popular": {
    message: "Obľúbený",
    description: "Badge label for the most popular tier",
  },
  "aiAgent.editApproval.title": {
    message: "Edit Request",
    description: "Title for the file edit approval card",
  },
  "aiAgent.editApproval.approve": {
    message: "Approve",
    description: "Button to approve an AI file edit",
  },
  "aiAgent.editApproval.deny": {
    message: "Deny",
    description: "Button to deny an AI file edit",
  },
  "aiAgent.editApproval.approved": {
    message: "Approved",
    description: "Badge shown after user approved the edit",
  },
  "aiAgent.editApproval.denied": {
    message: "Denied",
    description: "Badge shown after user denied the edit",
  },
  "aiAgent.editApproval.newFile": {
    message: "New file",
    description: "Label in diff block when creating a new file",
  },
  "aiAgent.editApproval.replaceFile": {
    message: "Replace file",
    description: "Label in diff block when replacing an entire file",
  },
  "aiAgent.editApproval.deleteFile": {
    message: "Delete file",
    description: "Label in diff block when deleting a file",
  },
  "aiAgent.suggestionsTitle": {
    message: "Skúste sa opýtať:",
    description:
      "Heading above suggested example questions in the empty chat state",
  },
  "aiAgent.suggestions.diningLastMonth": {
    message: "Koľko som minul na stravovanie minulý mesiac?",
    description: "Suggested question: dining spend last month",
  },
  "aiAgent.suggestions.netWorth": {
    message: "Aká je moja aktuálna čistá hodnota majetku?",
    description: "Suggested question: current net worth",
  },
  "aiAgent.suggestions.topCategories": {
    message: "Ukáž mi mojich 5 najväčších kategórií výdavkov tento rok",
    description: "Suggested question: top 5 expense categories this year",
  },
  "aiAgent.suggestions.uncategorized": {
    message: "Mám nezaradené transakcie?",
    description: "Suggested question: uncategorized transactions",
  },
  "aiAgent.suggestions.monthOverMonth": {
    message: "Porovnaj výdavky tento mesiac s minulým mesiacom",
    description: "Suggested question: compare this month to last month",
  },
  "aiAgent.suggestions.largestExpense": {
    message: "Aký je môj najväčší jednotlivý výdavok v tomto štvrťroku?",
    description: "Suggested question: largest single expense this quarter",
  },
  "aiAgent.stop": {
    message: "Zastaviť",
    description: "Button to stop an in-flight AI response",
  },
  "aiAgent.stopped": {
    message: "Zastavené",
    description: "Label shown on an AI response the user stopped",
  },
  "aiAgent.answeredIn": {
    message: "Zodpovedané za {duration}",
    description:
      "Shown under a completed AI answer; {duration} is a formatted elapsed time like 12.3s or 1m 5s",
  },
  "aiAgent.retry": {
    message: "Skúsiť znova",
    description: "Button to resubmit the last question after an error",
  },
  "aiAgent.receiptApproval.title": {
    message: "Zaznamenať transakciu z účtenky",
    description: "Title of the receipt transaction approval card",
  },
  "aiAgent.receiptApproval.preparing": {
    message: "Pripravuje sa transakcia…",
    description: "Status while the receipt transaction is being prepared",
  },
  "aiAgent.receiptApproval.recorded": {
    message: "Transakcia zaznamenaná",
    description: "Status after the receipt transaction was recorded",
  },
  "aiAgent.receiptApproval.failed": {
    message: "Transakciu sa nepodarilo zaznamenať",
    description: "Error when recording the receipt transaction failed",
  },
  "aiAgent.receiptApproval.date": {
    message: "Dátum",
    description: "Label for the receipt transaction date",
  },
  "aiAgent.receiptApproval.payee": {
    message: "Príjemca",
    description: "Label for the receipt transaction payee",
  },
  "aiAgent.receiptApproval.amount": {
    message: "Suma",
    description: "Label for the receipt transaction amount",
  },
  "aiAgent.receiptApproval.expense": {
    message: "Výdavok",
    description: "Label for the receipt expense account",
  },
  "aiAgent.receiptApproval.payment": {
    message: "Platba",
    description: "Label for the receipt payment account",
  },
  "aiAgent.attachFile": {
    message: "Priložiť súbor",
    description: "Aria label for the attach file button in the chat input",
  },
  "aiAgent.removeAttachment": {
    message: "Odstrániť {fileName}",
    description:
      "Aria label for removing a staged attachment; {fileName} is the attachment file name",
  },
  "aiAgent.attachmentFailed": {
    message: "zlyhalo",
    description: "Chip label when an attachment failed to upload",
  },
  "aiAgent.scrollToBottom": {
    message: "Posunúť sa nadol",
    description: "Aria label for the scroll to bottom button in the chat",
  },
};

export default skAiAgent;
