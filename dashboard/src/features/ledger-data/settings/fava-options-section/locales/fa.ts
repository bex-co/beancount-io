export interface TranslationEntry {
  message: string;
  description: string;
}

const faFavaOptionsSection: Record<string, TranslationEntry> = {
  "page.settings.favaOptions": {
    message: "گزینه‌های Fava",
    description: "Section title for fava options display",
  },
  "page.settings.favaOptionsDescription": {
    message:
      "گزینه‌های پیکربندی تجزیه شده از دستورات fava-option در فایل beancount شما",
    description: "Description for fava options section",
  },
};

export default faFavaOptionsSection;
