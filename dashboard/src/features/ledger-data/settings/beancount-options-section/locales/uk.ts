export interface TranslationEntry {
  message: string;
  description: string;
}

const ukBeancountOptionsSection: Record<string, TranslationEntry> = {
  "page.settings.beancountOptions": {
    message: "Опції Beancount",
    description: "Section title for beancount options display",
  },
  "page.settings.beancountOptionsDescription": {
    message:
      "Основні параметри конфігурації beancount, отримані з директив option у вашому файлі beancount",
    description: "Description for beancount options section",
  },
};

export default ukBeancountOptionsSection;
