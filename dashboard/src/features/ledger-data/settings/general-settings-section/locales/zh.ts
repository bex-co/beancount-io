export interface TranslationEntry {
  message: string;
  description: string;
}

const zhGeneralSettingsSection: Record<string, TranslationEntry> = {
  "page.settings.description": {
    message: "描述",
    description: "Label for ledger description field in settings",
  },
  "page.settings.settingsUpdated": {
    message: "设置已成功更新",
    description: "Success message when settings are saved",
  },
  "page.settings.failedToUpdateGeneral": {
    message: "更新通用设置失败",
    description: "Error message when general settings update fails",
  },
  "page.settings.ledgerNameDescription": {
    message: "此名称将在应用程序中显示",
    description: "Help text for ledger name field",
  },
  "page.settings.generalSettings": {
    message: "常规设置",
    description: "Section title for general settings",
  },
  "page.settings.generalSettingsDescription": {
    message: "更新你的账本名称和基本信息",
    description: "Description for general settings section",
  },
  "page.settings.ledgerDescriptionDescription": {
    message: "此描述将用于SEO元标签，帮助其他人了解你账本的用途。",
    description: "Help text explaining the description field",
  },
  "page.settings.ledgerDescriptionPlaceholder": {
    message: "输入账本描述（可选）",
    description: "Placeholder text for description field",
  },
  "page.settings.failedToRenameLedger": {
    message: "重命名账本失败",
    description: "Error message when ledger rename fails",
  },
};

export default zhGeneralSettingsSection;
