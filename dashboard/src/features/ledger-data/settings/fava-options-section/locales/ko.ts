export interface TranslationEntry {
  message: string;
  description: string;
}

const koFavaOptionsSection: Record<string, TranslationEntry> = {
  "page.settings.favaOptions": {
    message: "Fava 옵션",
    description: "Section title for fava options display",
  },
  "page.settings.favaOptionsDescription": {
    message: "beancount 파일의 fava-option 지시문에서 파싱된 구성 옵션",
    description: "Description for fava options section",
  },
};

export default koFavaOptionsSection;
