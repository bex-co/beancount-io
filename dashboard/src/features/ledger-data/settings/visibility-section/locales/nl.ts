export interface TranslationEntry {
  message: string;
  description: string;
}

const nlVisibilitySection: Record<string, TranslationEntry> = {
  "page.settings.publicLedger": {
    message: "Openbaar grootboek",
    description: "Label when ledger is public",
  },
  "page.settings.publicLedgerDescription": {
    message: "Uw grootboek is openbaar. Iedereen met de link kan het bekijken.",
    description: "Description for public ledger state",
  },
  "page.settings.embedCode": {
    message: "Insluitcode",
    description: "Label for embed code field",
  },
  "page.settings.copied": {
    message: "Gekopieerd!",
    description: "Confirmation message when text is copied",
  },
  "page.settings.visibility": {
    message: "Zichtbaarheid",
    description: "Section title for visibility settings",
  },
  "page.settings.visibilityDescription": {
    message: "Bepaal wie toegang heeft tot uw grootboek",
    description: "Description for visibility settings section",
  },
  "page.settings.sharingDescription": {
    message: "Deel uw openbare grootboek met anderen",
    description: "Description for sharing settings section",
  },
  "page.settings.shareableUrl": {
    message: "Deelbare URL",
    description: "Label for shareable URL field",
  },
  "page.settings.sharing": {
    message: "Openbaar delen",
    description: "Subsection title for public sharing options",
  },
  "page.settings.privateLedgerDescription": {
    message:
      "Uw grootboek is privé. Alleen u en medewerkers hebben er toegang toe.",
    description: "Description for private ledger state",
  },
  "page.settings.privateLedger": {
    message: "Privé grootboek",
    description: "Label when ledger is private",
  },
  "page.settings.embedViewOnBeancount": {
    message: "Bekijken op Beancount.io",
    description:
      "Link label in the generated embed code pointing back to Beancount.io",
  },
  "page.settings.copyUrlFailed": {
    message: "Kopiëren van URL mislukt",
    description: "Toast when copying the shareable URL failed",
  },
  "page.settings.copyCodeFailed": {
    message: "Kopiëren van code mislukt",
    description: "Toast when copying the embed code failed",
  },
};

export default nlVisibilitySection;
