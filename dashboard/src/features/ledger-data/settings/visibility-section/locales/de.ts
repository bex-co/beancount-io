export interface TranslationEntry {
  message: string;
  description: string;
}

const deVisibilitySection: Record<string, TranslationEntry> = {
  "page.settings.makePublicTitle": {
    message: "Dieses Hauptbuch öffentlich machen?",
    description:
      "Title of the confirmation before a private ledger becomes public",
  },
  "page.settings.makePublicDescription": {
    message:
      "Alle mit dem Link sowie Suchmaschinen können dann die Buchungen, Salden, Dateien und den vollständigen Änderungsverlauf dieses Hauptbuchs sehen – einschließlich jeder früheren Version jeder Datei sowie Name und E-Mail-Adresse des Autors jeder Änderung.",
    description: "What becomes visible when a private ledger is made public",
  },
  "page.settings.makePublic": {
    message: "Öffentlich machen",
    description: "Button that confirms making a private ledger public",
  },
  "page.settings.publicLedger": {
    message: "Öffentliches Hauptbuch",
    description: "Label when ledger is public",
  },
  "page.settings.publicLedgerDescription": {
    message:
      "Ihr Hauptbuch ist öffentlich. Jeder mit dem Link kann es ansehen, auch den vollständigen Änderungsverlauf: jede frühere Version jeder Datei sowie Name und E-Mail-Adresse des Autors jeder Änderung.",
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
  "page.settings.copyShareableUrl": {
    message: "Teilbare URL kopieren",
    description: "Accessible name for the button that copies the shareable URL",
  },
  "page.settings.copyEmbedCode": {
    message: "Einbettungscode kopieren",
    description: "Accessible name for the button that copies the embed code",
  },
  "page.settings.visibilityDescriptionReadOnly": {
    message:
      "Wer auf dieses Hauptbuch zugreifen kann. Nur Hauptbuch-Administratoren können das ändern.",
    description:
      "Visibility section description shown to viewers who cannot change it",
  },
  "page.settings.publicLedgerDescriptionReadOnly": {
    message:
      "Dieses Hauptbuch ist öffentlich. Jeder mit dem Link kann es ansehen.",
    description:
      "Public ledger state described to viewers who cannot change it",
  },
  "page.settings.privateLedgerDescriptionReadOnly": {
    message:
      "Dieses Hauptbuch ist privat. Nur der Eigentümer und Mitwirkende können darauf zugreifen.",
    description:
      "Private ledger state described to viewers who cannot change it",
  },
};

export default deVisibilitySection;
