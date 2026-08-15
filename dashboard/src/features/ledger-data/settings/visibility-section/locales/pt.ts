export interface TranslationEntry {
  message: string;
  description: string;
}

const ptVisibilitySection: Record<string, TranslationEntry> = {
  "page.settings.publicLedger": {
    message: "Livro-Razão Público",
    description: "Label when ledger is public",
  },
  "page.settings.publicLedgerDescription": {
    message:
      "Seu livro-razão é público. Qualquer pessoa com o link pode visualizá-lo.",
    description: "Description for public ledger state",
  },
  "page.settings.embedCode": {
    message: "Código de incorporação",
    description: "Label for embed code field",
  },
  "page.settings.copied": {
    message: "Copiado!",
    description: "Confirmation message when text is copied",
  },
  "page.settings.visibility": {
    message: "Visibilidade",
    description: "Section title for visibility settings",
  },
  "page.settings.visibilityDescription": {
    message: "Controle quem pode acessar seu livro-razão",
    description: "Description for visibility settings section",
  },
  "page.settings.sharingDescription": {
    message: "Compartilhe seu livro-razão público com outros",
    description: "Description for sharing settings section",
  },
  "page.settings.shareableUrl": {
    message: "URL compartilhável",
    description: "Label for shareable URL field",
  },
  "page.settings.sharing": {
    message: "Compartilhamento público",
    description: "Subsection title for public sharing options",
  },
  "page.settings.privateLedgerDescription": {
    message:
      "Seu livro-razão é privado. Somente você e colaboradores podem acessá-lo.",
    description: "Description for private ledger state",
  },
  "page.settings.privateLedger": {
    message: "Livro-Razão Privado",
    description: "Label when ledger is private",
  },
  "page.settings.embedViewOnBeancount": {
    message: "Ver no Beancount.io",
    description:
      "Link label in the generated embed code pointing back to Beancount.io",
  },
  "page.settings.copyUrlFailed": {
    message: "Falha ao copiar a URL",
    description: "Toast when copying the shareable URL failed",
  },
  "page.settings.copyCodeFailed": {
    message: "Falha ao copiar o código",
    description: "Toast when copying the embed code failed",
  },
};

export default ptVisibilitySection;
