export interface TranslationEntry {
  message: string;
  description: string;
}

const caBeancountOptionsSection: Record<string, TranslationEntry> = {
  "page.settings.beancountOptions": {
    message: "Opcions de Beancount",
    description: "Section title for beancount options display",
  },
  "page.settings.beancountOptionsDescription": {
    message:
      "Opcions de configuració bàsiques de beancount analitzades de les directives option del vostre fitxer beancount",
    description: "Description for beancount options section",
  },
};

export default caBeancountOptionsSection;
