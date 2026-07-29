export interface TranslationEntry {
  message: string;
  description: string;
}

const zhBcioOptionsSection: Record<string, TranslationEntry> = {
  "page.settings.bcioOptionsDescription": {
    message:
      "Configuration options parsed from beancountio-option directives in your beancount file",
    description: "Description for beancount.io options section",
  },
  "page.settings.bcioOptions": {
    message: "Beancount.io Options",
    description: "Section title for beancount.io-specific options display",
  },
};

export default zhBcioOptionsSection;
