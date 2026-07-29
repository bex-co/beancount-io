export interface TranslationEntry {
  message: string;
  description: string;
}

const deBeancountOptionsSection: Record<string, TranslationEntry> = {
  "page.settings.beancountOptions": {
    message: "Beancount-Optionen",
    description: "Section title for beancount options display",
  },
  "page.settings.beancountOptionsDescription": {
    message:
      "Grundlegende Beancount-Konfigurationsoptionen, die aus option-Direktiven in Ihrer Beancount-Datei analysiert wurden",
    description: "Description for beancount options section",
  },
};

export default deBeancountOptionsSection;
