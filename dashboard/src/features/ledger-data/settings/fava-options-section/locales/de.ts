export interface TranslationEntry {
  message: string;
  description: string;
}

const deFavaOptionsSection: Record<string, TranslationEntry> = {
  "page.settings.favaOptions": {
    message: "Fava-Optionen",
    description: "Section title for fava options display",
  },
  "page.settings.favaOptionsDescription": {
    message:
      "Konfigurationsoptionen, die aus fava-option-Direktiven in Ihrer Beancount-Datei analysiert wurden",
    description: "Description for fava options section",
  },
};

export default deFavaOptionsSection;
