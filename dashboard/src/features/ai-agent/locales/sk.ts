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
  "aiAgent.readOnlyTitle": {
    message: "Agent iba na čítanie",
    description: "Title of the agent permission notice",
  },
  "aiAgent.readOnlyDescription": {
    message:
      "Môžete klásť otázky a analyzovať súbory. Zmeny vyžadujú právo na zápis, ale môžem ich pre vás pripraviť.",
    description: "Explanation shown when the agent cannot change the ledger",
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
  "aiAgent.stop": {
    message: "Zastaviť",
    description: "Accessible name for stopping an in-progress AI response",
  },
  "aiAgent.stopped": {
    message: "Generovanie zastavené",
    description: "Toast shown after the user stops an in-progress AI response",
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
    message: "Prémium",
    description: "Premium tier name",
  },
  "aiAgent.growthTier": {
    message: "Rast",
    description: "Growth tier name",
  },
  "aiAgent.organizationTier": {
    message: "Organizácia",
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
    message: "Žiadosť o úpravu",
    description: "Title for the file edit approval card",
  },
  "aiAgent.editApproval.approve": {
    message: "Schváliť",
    description: "Button to approve an AI file edit",
  },
  "aiAgent.editApproval.deny": {
    message: "Zamietnuť",
    description: "Button to deny an AI file edit",
  },
  "aiAgent.editApproval.approved": {
    message: "Schválené",
    description: "Badge shown after user approved the edit",
  },
  "aiAgent.editApproval.denied": {
    message: "Zamietnuté",
    description: "Badge shown after user denied the edit",
  },
  "aiAgent.editApproval.newFile": {
    message: "Nový súbor",
    description: "Label in diff block when creating a new file",
  },
  "aiAgent.editApproval.replaceFile": {
    message: "Nahradiť súbor",
    description: "Label in diff block when replacing an entire file",
  },
  "aiAgent.editApproval.deleteFile": {
    message: "Odstrániť súbor",
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
    message: "Skontrolovaných {count} súborov",
    description:
      "Summary of files inspected by AI tools - interpolation: {count} (base key for pluralization)",
  },
  "aiAgent.checkedFiles_one": {
    message: "Skontrolovaný {count} súbor",
    description:
      "Summary of files inspected by AI tools - interpolation: {count} - singular form",
  },
  "aiAgent.checkedFiles_few": {
    message: "Skontrolované {count} súbory",
    description:
      "Summary of files inspected by AI tools - interpolation: {count} - form for counts like 2-4",
  },
  "aiAgent.checkedFiles_many": {
    message: "Skontrolovaného {count} súboru",
    description:
      "Summary of files inspected by AI tools - interpolation: {count} - form for fractional counts",
  },
  "aiAgent.checkedFiles_other": {
    message: "Skontrolovaných {count} súborov",
    description:
      "Summary of files inspected by AI tools - interpolation: {count} - form for counts like 0 and 5 or more",
  },
  "aiAgent.ranQueries": {
    message: "Spustených {count} dopytov",
    description:
      "Summary of queries run by AI tools - interpolation: {count} (base key for pluralization)",
  },
  "aiAgent.ranQueries_one": {
    message: "Spustený {count} dopyt",
    description:
      "Summary of queries run by AI tools - interpolation: {count} - singular form",
  },
  "aiAgent.ranQueries_few": {
    message: "Spustené {count} dopyty",
    description:
      "Summary of queries run by AI tools - interpolation: {count} - form for counts like 2-4",
  },
  "aiAgent.ranQueries_many": {
    message: "Spusteného {count} dopytu",
    description:
      "Summary of queries run by AI tools - interpolation: {count} - form for fractional counts",
  },
  "aiAgent.ranQueries_other": {
    message: "Spustených {count} dopytov",
    description:
      "Summary of queries run by AI tools - interpolation: {count} - form for counts like 0 and 5 or more",
  },
  "aiAgent.usedTools": {
    message: "Použitých {count} nástrojov",
    description:
      "Summary of tools used by the AI - interpolation: {count} (base key for pluralization)",
  },
  "aiAgent.usedTools_one": {
    message: "Použitý {count} nástroj",
    description:
      "Summary of tools used by the AI - interpolation: {count} - singular form",
  },
  "aiAgent.usedTools_few": {
    message: "Použité {count} nástroje",
    description:
      "Summary of tools used by the AI - interpolation: {count} - form for counts like 2-4",
  },
  "aiAgent.usedTools_many": {
    message: "Použitého {count} nástroja",
    description:
      "Summary of tools used by the AI - interpolation: {count} - form for fractional counts",
  },
  "aiAgent.usedTools_other": {
    message: "Použitých {count} nástrojov",
    description:
      "Summary of tools used by the AI - interpolation: {count} - form for counts like 0 and 5 or more",
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
    message: "Použitých {count} operácií",
    description:
      "Success status for applied AI file operations - interpolation: {count} (base key for pluralization)",
  },
  "aiAgent.editApproval.appliedOperations_one": {
    message: "Použitá {count} operácia",
    description:
      "Success status for applied AI file operations - interpolation: {count} - singular form",
  },
  "aiAgent.editApproval.appliedOperations_few": {
    message: "Použité {count} operácie",
    description:
      "Success status for applied AI file operations - interpolation: {count} - form for counts like 2-4",
  },
  "aiAgent.editApproval.appliedOperations_many": {
    message: "Použitej {count} operácie",
    description:
      "Success status for applied AI file operations - interpolation: {count} - form for fractional counts",
  },
  "aiAgent.editApproval.appliedOperations_other": {
    message: "Použitých {count} operácií",
    description:
      "Success status for applied AI file operations - interpolation: {count} - form for counts like 0 and 5 or more",
  },
  "aiAgent.editApproval.failed": {
    message: "Úprava zlyhala",
    description: "Fallback error for a failed AI file edit",
  },
  "aiAgent.starterPromptExpenses": {
    message: "Aké boli moje najväčšie výdavky minulý mesiac?",
    description: "Starter prompt chip asking about top recent expenses",
  },
  "aiAgent.starterPromptNetWorth": {
    message: "Zhrň vývoj môjho čistého imania",
    description: "Starter prompt chip asking for a net worth summary",
  },
  "aiAgent.starterPromptAssets": {
    message: "Zobraz moje aktuálne rozloženie aktív",
    description: "Starter prompt chip asking for current asset allocation",
  },
  "aiAgent.starterPromptReview": {
    message: "Skontroluj nekategorizované alebo nezvyčajné položky",
    description:
      "Starter prompt chip asking to review uncategorized or unusual entries",
  },
};

export default skAiAgent;
