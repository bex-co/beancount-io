export interface TranslationEntry {
  message: string;
  description: string;
}

const nlFavaOptionsSection: Record<string, TranslationEntry> = {
  "page.settings.favaOptions": {
    message: "Fava-opties",
    description: "Section title for fava options display",
  },
  "page.settings.favaOptionsDescription": {
    message:
      "Configuratieopties geparseerd uit fava-option richtlijnen in uw beancount-bestand",
    description: "Description for fava options section",
  },
};

export default nlFavaOptionsSection;
