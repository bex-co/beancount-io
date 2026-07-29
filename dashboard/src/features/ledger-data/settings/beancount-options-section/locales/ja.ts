export interface TranslationEntry {
  message: string;
  description: string;
}

const jaBeancountOptionsSection: Record<string, TranslationEntry> = {
  "page.settings.beancountOptions": {
    message: "Beancountオプション",
    description: "Section title for beancount options display",
  },
  "page.settings.beancountOptionsDescription": {
    message:
      "beancountファイルのoptionディレクティブから解析されたコアbeancount設定オプション",
    description: "Description for beancount options section",
  },
};

export default jaBeancountOptionsSection;
