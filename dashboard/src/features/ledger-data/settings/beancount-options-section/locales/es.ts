export interface TranslationEntry {
  message: string;
  description: string;
}

const esBeancountOptionsSection: Record<string, TranslationEntry> = {
  "page.settings.beancountOptions": {
    message: "Opciones de Beancount",
    description: "Section title for beancount options display",
  },
  "page.settings.beancountOptionsDescription": {
    message:
      "Opciones de configuración principales de beancount analizadas de las directivas option en su archivo beancount",
    description: "Description for beancount options section",
  },
};

export default esBeancountOptionsSection;
