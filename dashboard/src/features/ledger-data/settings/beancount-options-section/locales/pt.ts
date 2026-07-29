export interface TranslationEntry {
  message: string;
  description: string;
}

const ptBeancountOptionsSection: Record<string, TranslationEntry> = {
  "page.settings.beancountOptions": {
    message: "Opções do Beancount",
    description: "Section title for beancount options display",
  },
  "page.settings.beancountOptionsDescription": {
    message:
      "Opções de configuração principais do beancount analisadas das diretivas option no seu arquivo beancount",
    description: "Description for beancount options section",
  },
};

export default ptBeancountOptionsSection;
