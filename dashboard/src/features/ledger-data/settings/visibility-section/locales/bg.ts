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
  "page.settings.embedViewOnBeancount": {
    message: "Преглед в Beancount.io",
    description:
      "Link label in the generated embed code pointing back to Beancount.io",
  },
  "page.settings.copyUrlFailed": {
    message: "Неуспешно копиране на URL адреса",
    description: "Toast when copying the shareable URL failed",
  },
  "page.settings.copyCodeFailed": {
    message: "Неуспешно копиране на кода",
    description: "Toast when copying the embed code failed",
  },
};

export default bgVisibilitySection;
