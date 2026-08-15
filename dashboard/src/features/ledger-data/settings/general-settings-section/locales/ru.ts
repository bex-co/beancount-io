export interface TranslationEntry {
  message: string;
  description: string;
}

const ruGeneralSettingsSection: Record<string, TranslationEntry> = {
  "page.settings.description": {
    message: "Описание",
    description: "Label for ledger description field in settings",
  },
  "page.settings.settingsUpdated": {
    message: "Настройки успешно обновлены",
    description: "Success message when settings are saved",
  },
  "page.settings.ledgerNameDescription": {
    message: "Это имя будет отображаться во всем приложении",
    description: "Help text for ledger name field",
  },
  "page.settings.generalSettings": {
    message: "Основные настройки",
    description: "Section title for general settings",
  },
  "page.settings.generalSettingsDescription": {
    message: "Обновите название книги и основную информацию",
    description: "Description for general settings section",
  },
  "page.settings.ledgerDescriptionDescription": {
    message:
      "Это описание будет использоваться для SEO мета-тегов и помогает другим понять назначение вашей книги учета.",
    description: "Help text explaining the description field",
  },
  "page.settings.ledgerDescriptionPlaceholder": {
    message: "Введите описание для вашей книги учета (необязательно)",
    description: "Placeholder text for description field",
  },
};

export default ruGeneralSettingsSection;
