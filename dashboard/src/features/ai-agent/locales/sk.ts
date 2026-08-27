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
  "aiAgent.quickAskPlaceholder": {
    message: "Opýtajte sa ma čokoľvek o tejto knihe...",
    description: "Placeholder for quick ask input on overview page",
  },
  "aiAgent.ask": {
    message: "Opýtať sa",
    description: "Button text to submit quick question",
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
  "aiAgent.attachment": {
    message: "príloha",
    description: "Fallback filename for an attachment",
  },
  "aiAgent.preparing": {
    message: "Pripravuje sa…",
    description: "Status while an AI tool is preparing",
  },
  "aiAgent.toolFailed": {
    message: "{tool} zlyhalo",
    description: "Fallback error when an AI tool fails",
  },
  "aiAgent.toolList": {
    message: "Zoznam",
    description: "Label for the list-files AI tool",
  },
  "aiAgent.toolRead": {
    message: "Prečítajte si",
    description: "Label for the read-file AI tool",
  },
  "aiAgent.checkingLedgerContext": {
    message: "Kontrola kontextu účtovnej knihy",
    description: "Status while AI tools inspect a ledger",
  },
  "aiAgent.checkedFiles": {
    message: "skontrolovaných {count} súborov",
    description: "Summary of files inspected by AI tools",
  },
  "aiAgent.ranQueries": {
    message: "Zadal {count} dopyt alebo dopyty",
    description: "Summary of queries run by AI tools",
  },
  "aiAgent.usedTools": {
    message: "Použité nástroje {count}",
    description: "Summary of tools used by the AI",
  },
  "aiAgent.unknownBlock": {
    message: "Neznámy blok",
    description: "Fallback label for an unsupported AI message block",
  },
  "aiAgent.editApproval.preparingChanges": {
    message: "Pripravujú sa zmeny…",
    description: "Status while AI file changes are prepared",
  },
  "aiAgent.editApproval.appliedOperations": {
    message: "Použité operácie ({count})",
    description: "Success status for applied AI file operations",
  },
  "aiAgent.editApproval.failed": {
    message: "Úprava zlyhala",
    description: "Fallback error for a failed AI file edit",
  },
};

export default skAiAgent;
