export interface TranslationEntry {
  message: string;
  description: string;
}

const frBeancountOptionsSection: Record<string, TranslationEntry> = {
  "page.settings.beancountOptions": {
    message: "Options Beancount",
    description: "Section title for beancount options display",
  },
  "page.settings.beancountOptionsDescription": {
    message:
      "Options de configuration principales de beancount analysées à partir des directives option dans votre fichier beancount",
    description: "Description for beancount options section",
  },
};

export default frBeancountOptionsSection;
