export interface TranslationEntry {
  message: string;
  description: string;
}

const bgVisibilitySection: Record<string, TranslationEntry> = {
  "page.settings.publicLedger": {
    message: "Публична книга",
    description: "Label when ledger is public",
  },
  "page.settings.publicLedgerDescription": {
    message: "Вашата книга е публична. Всеки с връзката може да я разглежда.",
    description: "Description for public ledger state",
  },
  "page.settings.embedCode": {
    message: "Код за вграждане",
    description: "Label for embed code field",
  },
  "page.settings.copyUrl": {
    message: "Копирай URL",
    description: "Button text for copying URL",
  },
  "page.settings.failedToUpdateVisibility": {
    message: "Неуспешна актуализация на видимостта на книгата",
    description: "Error message when visibility update fails",
  },
  "page.settings.copied": {
    message: "Копирано!",
    description: "Confirmation message when text is copied",
  },
  "page.settings.visibility": {
    message: "Видимост",
    description: "Section title for visibility settings",
  },
  "page.settings.visibilityDescription": {
    message: "Контролирайте кой има достъп до вашата книга",
    description: "Description for visibility settings section",
  },
  "page.settings.sharingDescription": {
    message: "Споделете вашата публична книга с други",
    description: "Description for sharing settings section",
  },
  "page.settings.shareableUrl": {
    message: "URL за споделяне",
    description: "Label for shareable URL field",
  },
  "page.settings.sharingOnlyPublic": {
    message:
      "Споделянето е достъпно само за публични книги. Променете видимостта на вашата книга по-горе, за да активирате споделянето.",
    description: "Info message when ledger is private",
  },
  "page.settings.sharing": {
    message: "Публично споделяне",
    description: "Subsection title for public sharing options",
  },
  "page.settings.privateLedgerDescription": {
    message:
      "Вашата книга е частна. Само вие и сътрудниците имат достъп до нея.",
    description: "Description for private ledger state",
  },
  "page.settings.privateLedger": {
    message: "Частна книга",
    description: "Label when ledger is private",
  },
  "page.settings.copyCode": {
    message: "Копирай код",
    description: "Button text for copying embed code",
  },
};

export default bgVisibilitySection;
