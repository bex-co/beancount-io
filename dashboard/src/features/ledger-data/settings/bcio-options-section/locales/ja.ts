export interface TranslationEntry {
  message: string;
  description: string;
}

const jaBcioOptionsSection: Record<string, TranslationEntry> = {
  "page.settings.bcioOptionsDescription": {
    message:
      "beancountファイルのbeancountio-optionディレクティブから解析された設定オプション",
    description: "Description for beancount.io options section",
  },
  "page.settings.bcioOptions": {
    message: "Beancount.ioオプション",
    description: "Section title for beancount.io-specific options display",
  },
};

export default jaBcioOptionsSection;
