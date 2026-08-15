export interface TranslationEntry {
  message: string;
  description: string;
}

const ruVisibilitySection: Record<string, TranslationEntry> = {
  "page.settings.publicLedger": {
    message: "Публичная книга",
    description: "Label when ledger is public",
  },
  "page.settings.publicLedgerDescription": {
    message:
      "Ваша книга публичная. Любой пользователь со ссылкой может просматривать её.",
    description: "Description for public ledger state",
  },
  "page.settings.embedCode": {
    message: "Код для встраивания",
    description: "Label for embed code field",
  },
  "page.settings.copied": {
    message: "Скопировано!",
    description: "Confirmation message when text is copied",
  },
  "page.settings.visibility": {
    message: "Видимость",
    description: "Section title for visibility settings",
  },
  "page.settings.visibilityDescription": {
    message: "Управляйте доступом к вашей книге",
    description: "Description for visibility settings section",
  },
  "page.settings.sharingDescription": {
    message: "Поделитесь своей публичной книгой с другими",
    description: "Description for sharing settings section",
  },
  "page.settings.shareableUrl": {
    message: "Ссылка для публикации",
    description: "Label for shareable URL field",
  },
  "page.settings.sharing": {
    message: "Публичный доступ",
    description: "Subsection title for public sharing options",
  },
  "page.settings.privateLedgerDescription": {
    message:
      "Ваша книга приватная. Только вы и соавторы можете получить к ней доступ.",
    description: "Description for private ledger state",
  },
  "page.settings.privateLedger": {
    message: "Приватная книга",
    description: "Label when ledger is private",
  },
  "page.settings.embedViewOnBeancount": {
    message: "Открыть на Beancount.io",
    description:
      "Link label in the generated embed code pointing back to Beancount.io",
  },
  "page.settings.copyUrlFailed": {
    message: "Не удалось скопировать URL",
    description: "Toast when copying the shareable URL failed",
  },
  "page.settings.copyCodeFailed": {
    message: "Не удалось скопировать код",
    description: "Toast when copying the embed code failed",
  },
};

export default ruVisibilitySection;
