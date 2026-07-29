export interface TranslationEntry {
  message: string;
  description: string;
}

const zhBeancountOptionsSection: Record<string, TranslationEntry> = {
  "page.settings.beancountOptions": {
    message: "Beancount 选项",
    description: "Section title for beancount options display",
  },
  "page.settings.beancountOptionsDescription": {
    message: "从 beancount 文件中的 option 指令解析的核心 beancount 配置选项",
    description: "Description for beancount options section",
  },
};

export default zhBeancountOptionsSection;
