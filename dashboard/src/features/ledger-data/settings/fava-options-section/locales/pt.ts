export interface TranslationEntry {
  message: string;
  description: string;
}

const ptFavaOptionsSection: Record<string, TranslationEntry> = {
  "page.settings.favaOptions": {
    message: "Opções do Fava",
    description: "Section title for fava options display",
  },
  "page.settings.favaOptionsDescription": {
    message:
      "Opções de configuração analisadas das diretivas fava-option no seu arquivo beancount",
    description: "Description for fava options section",
  },
};

export default ptFavaOptionsSection;
