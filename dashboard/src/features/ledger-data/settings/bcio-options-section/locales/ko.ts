export interface TranslationEntry {
  message: string;
  description: string;
}

const koBcioOptionsSection: Record<string, TranslationEntry> = {
  "page.settings.bcioOptionsDescription": {
    message: "beancount 파일의 beancountio-option 지시문에서 파싱된 구성 옵션",
    description: "Description for beancount.io options section",
  },
  "page.settings.bcioOptions": {
    message: "Beancount.io 옵션",
    description: "Section title for beancount.io-specific options display",
  },
};

export default koBcioOptionsSection;
