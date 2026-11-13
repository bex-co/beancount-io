export interface TranslationEntry {
  message: string;
  description: string;
}

const ukVisibilitySection: Record<string, TranslationEntry> = {
  "page.settings.makePublicTitle": {
    message: "Зробити цю книгу публічною?",
    description:
      "Title of the confirmation before a private ledger becomes public",
  },
  "page.settings.makePublicDescription": {
    message:
      "Будь-хто з посиланням, а також пошукові системи зможуть бачити транзакції, залишки, файли й повну історію змін цієї книги, зокрема кожну попередню версію кожного файлу, а також ім'я та адресу електронної пошти автора кожної зміни.",
    description: "What becomes visible when a private ledger is made public",
  },
  "page.settings.makePublic": {
    message: "Зробити публічною",
    description: "Button that confirms making a private ledger public",
  },
  "page.settings.publicLedger": {
    message: "Публічна книга",
    description: "Label when ledger is public",
  },
  "page.settings.publicLedgerDescription": {
    message:
      "Ваша книга публічна. Будь-хто з посиланням може її переглядати, зокрема повну історію змін: кожну попередню версію кожного файлу, а також ім'я та адресу електронної пошти автора кожної зміни.",
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
    message: "Приватна книга",
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
  "page.settings.copyShareableUrl": {
    message: "Скопіювати URL для спільного доступу",
    description: "Accessible name for the button that copies the shareable URL",
  },
  "page.settings.copyEmbedCode": {
    message: "Скопіювати код вбудовування",
    description: "Accessible name for the button that copies the embed code",
  },
  "page.settings.visibilityDescriptionReadOnly": {
    message:
      "Хто має доступ до цієї облікової книги. Змінити це можуть лише адміністратори книги.",
    description:
      "Visibility section description shown to viewers who cannot change it",
  },
  "page.settings.publicLedgerDescriptionReadOnly": {
    message:
      "Ця облікова книга публічна. Будь-хто з посиланням може її переглянути.",
    description:
      "Public ledger state described to viewers who cannot change it",
  },
  "page.settings.privateLedgerDescriptionReadOnly": {
    message:
      "Ця облікова книга приватна. Доступ мають лише власник і співавтори.",
    description:
      "Private ledger state described to viewers who cannot change it",
  },
};

export default ukVisibilitySection;
