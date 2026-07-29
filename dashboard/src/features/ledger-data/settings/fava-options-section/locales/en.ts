export interface TranslationEntry {
  message: string;
  description: string;
}

const enFavaOptionsSection: Record<string, TranslationEntry> = {
  "page.settings.favaOptions": {
    message: "Fava Options",
    description: "Section title for fava options display",
  },
  "page.settings.favaOptionsDescription": {
    message:
      "Configuration options parsed from fava-option directives in your beancount file",
    description: "Description for fava options section",
  },
};

export default enFavaOptionsSection;
