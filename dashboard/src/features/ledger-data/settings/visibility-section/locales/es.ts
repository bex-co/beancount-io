export interface TranslationEntry {
  message: string;
  description: string;
}

const esVisibilitySection: Record<string, TranslationEntry> = {
  "page.settings.publicLedger": {
    message: "Libro Mayor Público",
    description: "Label when ledger is public",
  },
  "page.settings.publicLedgerDescription": {
    message: "Su libro mayor es público. Cualquiera con el enlace puede verlo.",
    description: "Description for public ledger state",
  },
  "page.settings.embedCode": {
    message: "Código de incrustación",
    description: "Label for embed code field",
  },
  "page.settings.copied": {
    message: "¡Copiado!",
    description: "Confirmation message when text is copied",
  },
  "page.settings.visibility": {
    message: "Visibilidad",
    description: "Section title for visibility settings",
  },
  "page.settings.visibilityDescription": {
    message: "Controle quién puede acceder a su libro mayor",
    description: "Description for visibility settings section",
  },
  "page.settings.sharingDescription": {
    message: "Comparte tu libro mayor público con otros",
    description: "Description for sharing settings section",
  },
  "page.settings.shareableUrl": {
    message: "URL para compartir",
    description: "Label for shareable URL field",
  },
  "page.settings.sharing": {
    message: "Compartir públicamente",
    description: "Subsection title for public sharing options",
  },
  "page.settings.privateLedgerDescription": {
    message:
      "Su libro mayor es privado. Solo usted y los colaboradores pueden acceder a él.",
    description: "Description for private ledger state",
  },
  "page.settings.privateLedger": {
    message: "Libro Mayor Privado",
    description: "Label when ledger is private",
  },
  "page.settings.embedViewOnBeancount": {
    message: "Ver en Beancount.io",
    description:
      "Link label in the generated embed code pointing back to Beancount.io",
  },
  "page.settings.copyUrlFailed": {
    message: "No se pudo copiar la URL",
    description: "Toast when copying the shareable URL failed",
  },
  "page.settings.copyCodeFailed": {
    message: "No se pudo copiar el código",
    description: "Toast when copying the embed code failed",
  },
};

export default esVisibilitySection;
