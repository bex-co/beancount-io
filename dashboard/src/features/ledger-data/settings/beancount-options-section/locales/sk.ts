export interface TranslationEntry {
  message: string;
  description: string;
}

const skBeancountOptionsSection: Record<string, TranslationEntry> = {
  "page.settings.beancountOptions": {
    message: "Možnosti Beancount",
    description: "Section title for beancount options display",
  },
  "page.settings.beancountOptionsDescription": {
    message:
      "Základné konfiguračné možnosti beancount analyzované z direktív option vo vašom súbore beancount",
    description: "Description for beancount options section",
  },
};

export default skBeancountOptionsSection;
