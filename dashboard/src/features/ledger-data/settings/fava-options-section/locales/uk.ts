export interface TranslationEntry {
  message: string;
  description: string;
}

const ukFavaOptionsSection: Record<string, TranslationEntry> = {
  "page.settings.favaOptions": {
    message: "Опції Fava",
    description: "Section title for fava options display",
  },
  "page.settings.favaOptionsDescription": {
    message:
      "Параметри конфігурації, отримані з директив fava-option у вашому файлі beancount",
    description: "Description for fava options section",
  },
};

export default ukFavaOptionsSection;
