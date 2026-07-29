export interface TranslationEntry {
  message: string;
  description: string;
}

const caVisibilitySection: Record<string, TranslationEntry> = {
  "page.settings.publicLedger": {
    message: "Llibre públic",
    description: "Label when ledger is public",
  },
  "page.settings.publicLedgerDescription": {
    message:
      "El vostre llibre és públic. Qualsevol persona amb l'enllaç pot veure'l.",
    description: "Description for public ledger state",
  },
  "page.settings.embedCode": {
    message: "Codi d'incrustació",
    description: "Label for embed code field",
  },
  "page.settings.copyUrl": {
    message: "Copiar URL",
    description: "Button text for copying URL",
  },
  "page.settings.failedToUpdateVisibility": {
    message: "Error en actualitzar la visibilitat del llibre",
    description: "Error message when visibility update fails",
  },
  "page.settings.copied": {
    message: "Copiat!",
    description: "Confirmation message when text is copied",
  },
  "page.settings.visibility": {
    message: "Visibilitat",
    description: "Section title for visibility settings",
  },
  "page.settings.visibilityDescription": {
    message: "Controla qui pot accedir al teu llibre",
    description: "Description for visibility settings section",
  },
  "page.settings.sharingDescription": {
    message: "Comparteix el teu llibre públic amb altres",
    description: "Description for sharing settings section",
  },
  "page.settings.shareableUrl": {
    message: "URL per compartir",
    description: "Label for shareable URL field",
  },
  "page.settings.sharingOnlyPublic": {
    message:
      "La compartició només està disponible per a llibres públics. Canvia la visibilitat del teu llibre a dalt per activar la compartició.",
    description: "Info message when ledger is private",
  },
  "page.settings.sharing": {
    message: "Compartició pública",
    description: "Subsection title for public sharing options",
  },
  "page.settings.privateLedgerDescription": {
    message:
      "El vostre llibre és privat. Només tu i els col·laboradors poden accedir-hi.",
    description: "Description for private ledger state",
  },
  "page.settings.privateLedger": {
    message: "Llibre privat",
    description: "Label when ledger is private",
  },
  "page.settings.copyCode": {
    message: "Copiar codi",
    description: "Button text for copying embed code",
  },
};

export default caVisibilitySection;
