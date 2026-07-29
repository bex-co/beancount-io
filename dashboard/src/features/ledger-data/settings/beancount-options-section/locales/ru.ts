export interface TranslationEntry {
  message: string;
  description: string;
}

const ruBeancountOptionsSection: Record<string, TranslationEntry> = {
  "page.settings.beancountOptions": {
    message: "Опции Beancount",
    description: "Section title for beancount options display",
  },
  "page.settings.beancountOptionsDescription": {
    message:
      "Основные параметры конфигурации beancount, считанные из директив option в вашем файле beancount",
    description: "Description for beancount options section",
  },
};

export default ruBeancountOptionsSection;
