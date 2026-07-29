export interface TranslationEntry {
  message: string;
  description: string;
}

const caFavaOptionsSection: Record<string, TranslationEntry> = {
  "page.settings.favaOptions": {
    message: "Opcions de Fava",
    description: "Section title for fava options display",
  },
  "page.settings.favaOptionsDescription": {
    message:
      "Opcions de configuració analitzades de les directives fava-option del vostre fitxer beancount",
    description: "Description for fava options section",
  },
};

export default caFavaOptionsSection;
