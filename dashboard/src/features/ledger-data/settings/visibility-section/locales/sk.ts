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
  "page.settings.copyUrl": {
    message: "Kopírovať URL",
    description: "Button text for copying URL",
  },
  "page.settings.failedToUpdateVisibility": {
    message: "Aktualizácia viditeľnosti knihy zlyhala",
    description: "Error message when visibility update fails",
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
  "page.settings.sharingOnlyPublic": {
    message:
      "Zdieľanie je dostupné len pre verejné knihy. Zmeňte viditeľnosť vašej knihy vyššie, aby ste povolili zdieľanie.",
    description: "Info message when ledger is private",
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
  "page.settings.copyCode": {
    message: "Kopírovať kód",
    description: "Button text for copying embed code",
  },
};

export default skVisibilitySection;
