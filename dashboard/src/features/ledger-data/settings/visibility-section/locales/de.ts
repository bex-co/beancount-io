export interface TranslationEntry {
  message: string;
  description: string;
}

const deVisibilitySection: Record<string, TranslationEntry> = {
  "page.settings.publicLedger": {
    message: "Öffentliches Hauptbuch",
    description: "Label when ledger is public",
  },
  "page.settings.publicLedgerDescription": {
    message:
      "Ihr Hauptbuch ist öffentlich. Jeder mit dem Link kann es ansehen.",
    description: "Description for public ledger state",
  },
  "page.settings.embedCode": {
    message: "Einbettungscode",
    description: "Label for embed code field",
  },
  "page.settings.copied": {
    message: "Kopiert!",
    description: "Confirmation message when text is copied",
  },
  "page.settings.visibility": {
    message: "Sichtbarkeit",
    description: "Section title for visibility settings",
  },
  "page.settings.visibilityDescription": {
    message: "Steuern Sie, wer auf Ihr Hauptbuch zugreifen kann",
    description: "Description for visibility settings section",
  },
  "page.settings.sharingDescription": {
    message: "Teilen Sie Ihr öffentliches Hauptbuch mit anderen",
    description: "Description for sharing settings section",
  },
  "page.settings.shareableUrl": {
    message: "Teilbare URL",
    description: "Label for shareable URL field",
  },
  "page.settings.sharing": {
    message: "Öffentliche Freigabe",
    description: "Subsection title for public sharing options",
  },
  "page.settings.privateLedgerDescription": {
    message:
      "Ihr Hauptbuch ist privat. Nur Sie und Ihre Mitarbeiter können darauf zugreifen.",
    description: "Description for private ledger state",
  },
  "page.settings.privateLedger": {
    message: "Privates Hauptbuch",
    description: "Label when ledger is private",
  },
  "page.settings.embedViewOnBeancount": {
    message: "Auf Beancount.io ansehen",
    description:
      "Link label in the generated embed code pointing back to Beancount.io",
  },
  "page.settings.copyUrlFailed": {
    message: "URL konnte nicht kopiert werden",
    description: "Toast when copying the shareable URL failed",
  },
  "page.settings.copyCodeFailed": {
    message: "Code konnte nicht kopiert werden",
    description: "Toast when copying the embed code failed",
  },
};

export default deVisibilitySection;
