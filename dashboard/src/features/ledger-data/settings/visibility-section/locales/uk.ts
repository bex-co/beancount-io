export interface TranslationEntry {
  message: string;
  description: string;
}

const ukVisibilitySection: Record<string, TranslationEntry> = {
  "page.settings.publicLedger": {
    message: "Публічний Ledger",
    description: "Label when ledger is public",
  },
  "page.settings.publicLedgerDescription": {
    message: "Ваша книга публічна. Будь-хто з посиланням може її переглядати.",
    description: "Description for public ledger state",
  },
  "page.settings.embedCode": {
    message: "Код для вбудовування",
    description: "Label for embed code field",
  },
  "page.settings.copied": {
    message: "Скопійовано!",
    description: "Confirmation message when text is copied",
  },
  "page.settings.visibility": {
    message: "Видимість",
    description: "Section title for visibility settings",
  },
  "page.settings.visibilityDescription": {
    message: "Контролюйте, хто може отримати доступ до вашої книги",
    description: "Description for visibility settings section",
  },
  "page.settings.sharingDescription": {
    message: "Поділіться своєю публічною книгою з іншими",
    description: "Description for sharing settings section",
  },
  "page.settings.shareableUrl": {
    message: "URL для спільного використання",
    description: "Label for shareable URL field",
  },
  "page.settings.sharing": {
    message: "Публічне спільне використання",
    description: "Subsection title for public sharing options",
  },
  "page.settings.privateLedgerDescription": {
    message:
      "Ваша книга приватна. Тільки ви та співробітники можете отримати до неї доступ.",
    description: "Description for private ledger state",
  },
  "page.settings.privateLedger": {
    message: "Приватний Ledger",
    description: "Label when ledger is private",
  },
  "page.settings.embedViewOnBeancount": {
    message: "Переглянути на Beancount.io",
    description:
      "Link label in the generated embed code pointing back to Beancount.io",
  },
  "page.settings.copyUrlFailed": {
    message: "Не вдалося скопіювати URL",
    description: "Toast when copying the shareable URL failed",
  },
  "page.settings.copyCodeFailed": {
    message: "Не вдалося скопіювати код",
    description: "Toast when copying the embed code failed",
  },
};

export default ukVisibilitySection;
