export interface TranslationEntry {
  message: string;
  description: string;
}

const faBeancountOptionsSection: Record<string, TranslationEntry> = {
  "page.settings.beancountOptions": {
    message: "گزینه‌های Beancount",
    description: "Section title for beancount options display",
  },
  "page.settings.beancountOptionsDescription": {
    message:
      "گزینه‌های پیکربندی اصلی beancount تجزیه شده از دستورات option در فایل beancount شما",
    description: "Description for beancount options section",
  },
};

export default faBeancountOptionsSection;
