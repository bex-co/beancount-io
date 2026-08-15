export interface TranslationEntry {
  message: string;
  description: string;
}

const faVisibilitySection: Record<string, TranslationEntry> = {
  "page.settings.publicLedger": {
    message: "دفتر عمومی",
    description: "Label when ledger is public",
  },
  "page.settings.publicLedgerDescription": {
    message:
      "دفتر شما عمومی است. هر کسی با داشتن لینک می‌تواند آن را مشاهده کند.",
    description: "Description for public ledger state",
  },
  "page.settings.embedCode": {
    message: "کد جاسازی",
    description: "Label for embed code field",
  },
  "page.settings.copied": {
    message: "کپی شد!",
    description: "Confirmation message when text is copied",
  },
  "page.settings.visibility": {
    message: "سطح دسترسی",
    description: "Section title for visibility settings",
  },
  "page.settings.visibilityDescription": {
    message: "کنترل کنید چه کسانی می‌توانند به دفتر شما دسترسی داشته باشند",
    description: "Description for visibility settings section",
  },
  "page.settings.sharingDescription": {
    message: "دفتر عمومی خود را با دیگران به اشتراک بگذارید",
    description: "Description for sharing settings section",
  },
  "page.settings.shareableUrl": {
    message: "URL قابل اشتراک‌گذاری",
    description: "Label for shareable URL field",
  },
  "page.settings.sharing": {
    message: "اشتراک‌گذاری عمومی",
    description: "Subsection title for public sharing options",
  },
  "page.settings.privateLedgerDescription": {
    message:
      "دفتر شما خصوصی است. فقط شما و همکاران می‌توانید به آن دسترسی داشته باشند.",
    description: "Description for private ledger state",
  },
  "page.settings.privateLedger": {
    message: "دفتر خصوصی",
    description: "Label when ledger is private",
  },
  "page.settings.embedViewOnBeancount": {
    message: "مشاهده در Beancount.io",
    description:
      "Link label in the generated embed code pointing back to Beancount.io",
  },
  "page.settings.copyUrlFailed": {
    message: "کپی URL ناموفق بود",
    description: "Toast when copying the shareable URL failed",
  },
  "page.settings.copyCodeFailed": {
    message: "کپی کد ناموفق بود",
    description: "Toast when copying the embed code failed",
  },
};

export default faVisibilitySection;
