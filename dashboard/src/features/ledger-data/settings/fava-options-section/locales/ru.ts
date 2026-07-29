export interface TranslationEntry {
  message: string;
  description: string;
}

const ruFavaOptionsSection: Record<string, TranslationEntry> = {
  "page.settings.favaOptions": {
    message: "Опции Fava",
    description: "Section title for fava options display",
  },
  "page.settings.favaOptionsDescription": {
    message:
      "Параметры конфигурации, считанные из директив fava-option в вашем файле beancount",
    description: "Description for fava options section",
  },
};

export default ruFavaOptionsSection;
