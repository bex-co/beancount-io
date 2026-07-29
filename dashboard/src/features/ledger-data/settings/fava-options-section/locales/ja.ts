export interface TranslationEntry {
  message: string;
  description: string;
}

const jaFavaOptionsSection: Record<string, TranslationEntry> = {
  "page.settings.favaOptions": {
    message: "Favaオプション",
    description: "Section title for fava options display",
  },
  "page.settings.favaOptionsDescription": {
    message:
      "beancountファイルのfava-optionディレクティブから解析された設定オプション",
    description: "Description for fava options section",
  },
};

export default jaFavaOptionsSection;
