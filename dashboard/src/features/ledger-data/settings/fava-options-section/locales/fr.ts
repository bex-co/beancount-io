export interface TranslationEntry {
  message: string;
  description: string;
}

const frFavaOptionsSection: Record<string, TranslationEntry> = {
  "page.settings.favaOptions": {
    message: "Options Fava",
    description: "Section title for fava options display",
  },
  "page.settings.favaOptionsDescription": {
    message:
      "Options de configuration analysées à partir des directives fava-option dans votre fichier beancount",
    description: "Description for fava options section",
  },
};

export default frFavaOptionsSection;
