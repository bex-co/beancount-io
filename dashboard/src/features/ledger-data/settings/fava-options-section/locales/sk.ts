export interface TranslationEntry {
  message: string;
  description: string;
}

const skFavaOptionsSection: Record<string, TranslationEntry> = {
  "page.settings.favaOptions": {
    message: "Možnosti Fava",
    description: "Section title for fava options display",
  },
  "page.settings.favaOptionsDescription": {
    message:
      "Konfiguračné možnosti analyzované z direktív fava-option vo vašom súbore beancount",
    description: "Description for fava options section",
  },
};

export default skFavaOptionsSection;
