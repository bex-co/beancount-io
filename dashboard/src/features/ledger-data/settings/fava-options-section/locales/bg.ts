export interface TranslationEntry {
  message: string;
  description: string;
}

const bgFavaOptionsSection: Record<string, TranslationEntry> = {
  "page.settings.favaOptions": {
    message: "Fava Опции",
    description: "Section title for fava options display",
  },
  "page.settings.favaOptionsDescription": {
    message:
      "Опции за конфигурация, анализирани от fava-option директиви във вашия beancount файл",
    description: "Description for fava options section",
  },
};

export default bgFavaOptionsSection;
