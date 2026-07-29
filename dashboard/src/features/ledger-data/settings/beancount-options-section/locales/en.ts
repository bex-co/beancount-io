export interface TranslationEntry {
  message: string;
  description: string;
}

const enBeancountOptionsSection: Record<string, TranslationEntry> = {
  "page.settings.beancountOptions": {
    message: "Beancount Options",
    description: "Section title for beancount options display",
  },
  "page.settings.beancountOptionsDescription": {
    message:
      "Core beancount configuration options parsed from option directives in your beancount file",
    description: "Description for beancount options section",
  },
};

export default enBeancountOptionsSection;
