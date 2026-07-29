export interface TranslationEntry {
  message: string;
  description: string;
}

const koBeancountOptionsSection: Record<string, TranslationEntry> = {
  "page.settings.beancountOptions": {
    message: "Beancount 옵션",
    description: "Section title for beancount options display",
  },
  "page.settings.beancountOptionsDescription": {
    message:
      "beancount 파일의 option 지시문에서 파싱된 핵심 beancount 구성 옵션",
    description: "Description for beancount options section",
  },
};

export default koBeancountOptionsSection;
