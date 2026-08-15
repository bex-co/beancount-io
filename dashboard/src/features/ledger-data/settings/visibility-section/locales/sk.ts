export interface TranslationEntry {
  message: string;
  description: string;
}

const skVisibilitySection: Record<string, TranslationEntry> = {
  "page.settings.publicLedger": {
    message: "Verejná kniha",
    description: "Label when ledger is public",
  },
  "page.settings.publicLedgerDescription": {
    message: "Vaša kniha je verejná. Ktokoľvek s odkazom ju môže vidieť.",
    description: "Description for public ledger state",
  },
  "page.settings.embedCode": {
    message: "Kód na vloženie",
    description: "Label for embed code field",
  },
  "page.settings.copied": {
    message: "Skopírované!",
    description: "Confirmation message when text is copied",
  },
  "page.settings.visibility": {
    message: "Viditeľnosť",
    description: "Section title for visibility settings",
  },
  "page.settings.visibilityDescription": {
    message: "Ovládajte, kto môže pristupovať k vašej knihe",
    description: "Description for visibility settings section",
  },
  "page.settings.sharingDescription": {
    message: "Zdieľajte vašu verejnú knihu s ostatnými",
    description: "Description for sharing settings section",
  },
  "page.settings.shareableUrl": {
    message: "URL na zdieľanie",
    description: "Label for shareable URL field",
  },
  "page.settings.sharing": {
    message: "Verejné zdieľanie",
    description: "Subsection title for public sharing options",
  },
  "page.settings.privateLedgerDescription": {
    message:
      "Vaša kniha je súkromná. Prístup k nej máte len vy a spolupracovníci.",
    description: "Description for private ledger state",
  },
  "page.settings.privateLedger": {
    message: "Súkromná kniha",
    description: "Label when ledger is private",
  },
  "page.settings.embedViewOnBeancount": {
    message: "Zobraziť na Beancount.io",
    description:
      "Link label in the generated embed code pointing back to Beancount.io",
  },
  "page.settings.copyUrlFailed": {
    message: "URL sa nepodarilo skopírovať",
    description: "Toast when copying the shareable URL failed",
  },
  "page.settings.copyCodeFailed": {
    message: "Kód sa nepodarilo skopírovať",
    description: "Toast when copying the embed code failed",
  },
};

export default skVisibilitySection;
