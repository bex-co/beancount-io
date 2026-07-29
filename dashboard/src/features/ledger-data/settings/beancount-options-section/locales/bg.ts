export interface TranslationEntry {
  message: string;
  description: string;
}

const bgBeancountOptionsSection: Record<string, TranslationEntry> = {
  "page.settings.beancountOptions": {
    message: "Beancount Опции",
    description: "Section title for beancount options display",
  },
  "page.settings.beancountOptionsDescription": {
    message:
      "Основни опции за конфигурация на beancount, анализирани от директиви option във вашия beancount файл",
    description: "Description for beancount options section",
  },
};

export default bgBeancountOptionsSection;
