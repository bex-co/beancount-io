export interface TranslationEntry {
  message: string;
  description: string;
}

const nlBeancountOptionsSection: Record<string, TranslationEntry> = {
  "page.settings.beancountOptions": {
    message: "Beancount-opties",
    description: "Section title for beancount options display",
  },
  "page.settings.beancountOptionsDescription": {
    message:
      "Basisconfiguratieopties van beancount geparseerd uit option richtlijnen in uw beancount-bestand",
    description: "Description for beancount options section",
  },
};

export default nlBeancountOptionsSection;
