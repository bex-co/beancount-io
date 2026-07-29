export interface TranslationEntry {
  message: string;
  description: string;
}

const esFavaOptionsSection: Record<string, TranslationEntry> = {
  "page.settings.favaOptions": {
    message: "Opciones de Fava",
    description: "Section title for fava options display",
  },
  "page.settings.favaOptionsDescription": {
    message:
      "Opciones de configuración analizadas de las directivas fava-option en su archivo beancount",
    description: "Description for fava options section",
  },
};

export default esFavaOptionsSection;
