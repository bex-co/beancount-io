export interface TranslationEntry {
  message: string;
  description: string;
}

const frVisibilitySection: Record<string, TranslationEntry> = {
  "page.settings.publicLedger": {
    message: "Grand livre public",
    description: "Label when ledger is public",
  },
  "page.settings.publicLedgerDescription": {
    message:
      "Votre grand livre est public. Toute personne disposant du lien peut le consulter.",
    description: "Description for public ledger state",
  },
  "page.settings.embedCode": {
    message: "Code d'intégration",
    description: "Label for embed code field",
  },
  "page.settings.copied": {
    message: "Copié !",
    description: "Confirmation message when text is copied",
  },
  "page.settings.visibility": {
    message: "Visibilité",
    description: "Section title for visibility settings",
  },
  "page.settings.visibilityDescription": {
    message: "Contrôler qui peut accéder à votre grand livre",
    description: "Description for visibility settings section",
  },
  "page.settings.sharingDescription": {
    message: "Partagez votre grand livre public avec d'autres",
    description: "Description for sharing settings section",
  },
  "page.settings.shareableUrl": {
    message: "URL partageable",
    description: "Label for shareable URL field",
  },
  "page.settings.sharing": {
    message: "Partage public",
    description: "Subsection title for public sharing options",
  },
  "page.settings.privateLedgerDescription": {
    message:
      "Votre grand livre est privé. Seuls vous et les collaborateurs peuvent y accéder.",
    description: "Description for private ledger state",
  },
  "page.settings.privateLedger": {
    message: "Grand livre privé",
    description: "Label when ledger is private",
  },
  "page.settings.embedViewOnBeancount": {
    message: "Voir sur Beancount.io",
    description:
      "Link label in the generated embed code pointing back to Beancount.io",
  },
  "page.settings.copyUrlFailed": {
    message: "Échec de la copie de l'URL",
    description: "Toast when copying the shareable URL failed",
  },
  "page.settings.copyCodeFailed": {
    message: "Échec de la copie du code",
    description: "Toast when copying the embed code failed",
  },
};

export default frVisibilitySection;
