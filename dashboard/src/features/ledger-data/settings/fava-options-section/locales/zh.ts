export interface TranslationEntry {
  message: string;
  description: string;
}

const zhFavaOptionsSection: Record<string, TranslationEntry> = {
  "page.settings.favaOptions": {
    message: "Fava 选项",
    description: "Section title for fava options display",
  },
  "page.settings.favaOptionsDescription": {
    message: "从 beancount 文件中的 fava-option 指令解析的配置选项",
    description: "Description for fava options section",
  },
};

export default zhFavaOptionsSection;
