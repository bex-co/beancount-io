export interface TranslationEntry {
  message: string;
  description: string;
}

const skDangerZoneSection: Record<string, TranslationEntry> = {
  "page.settings.deleteLedgerConfirmationSuffix": {
    message: "a všetky jej údaje.",
    description: "Suffix for delete confirmation message",
  },
  "page.settings.deleteLedgerDialogDescription": {
    message:
      "Túto akciu nie je možné vrátiť späť. Týmto trvalo vymažete knihu a všetky súvisiace údaje.",
    description: "Dialog description for ledger deletion",
  },
  "page.settings.warning": {
    message: "Upozornenie",
    description: "Warning alert title",
  },
  "page.settings.toConfirm": {
    message: "na potvrdenie",
    description: "Label suffix for type to confirm",
  },
  "page.settings.dangerZoneDescription": {
    message: "Nezvratné akcie, ktoré môžu spôsobiť stratu dát",
    description: "Description for danger zone section",
  },
  "page.settings.typeToConfirm": {
    message: "Napíšte",
    description: "Label prefix for type to confirm",
  },
  "page.settings.deleteLedgerWarning": {
    message:
      "Vymazanie knihy je trvalé a nie je možné ho vrátiť späť. Všetky údaje vrátane transakcií, dokumentov a histórie budú stratené.",
    description: "Warning message about ledger deletion consequences",
  },
  "page.settings.deleteLedgerConfirmationPrefix": {
    message: "Týmto trvalo vymažete",
    description: "Prefix for delete confirmation message",
  },
};

export default skDangerZoneSection;
