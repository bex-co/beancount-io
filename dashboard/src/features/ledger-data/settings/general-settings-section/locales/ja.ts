export interface TranslationEntry {
  message: string;
  description: string;
}

const jaGeneralSettingsSection: Record<string, TranslationEntry> = {
  "page.settings.description": {
    message: "説明",
    description: "Label for ledger description field in settings",
  },
  "page.settings.settingsUpdated": {
    message: "設定が正常に更新されました",
    description: "Success message when settings are saved",
  },
  "page.settings.ledgerNameDescription": {
    message: "この名前はアプリケーション全体に表示されます",
    description: "Help text for ledger name field",
  },
  "page.settings.generalSettings": {
    message: "一般設定",
    description: "Section title for general settings",
  },
  "page.settings.generalSettingsDescription": {
    message: "元帳名と基本情報を更新する",
    description: "Description for general settings section",
  },
  "page.settings.ledgerDescriptionDescription": {
    message:
      "この説明はSEOメタタグに使用され、他のユーザーが元帳の目的を理解するのに役立ちます。",
    description: "Help text explaining the description field",
  },
  "page.settings.ledgerDescriptionPlaceholder": {
    message: "元帳の説明を入力（任意）",
    description: "Placeholder text for description field",
  },
  "page.settings.generalSettingsDescriptionReadOnly": {
    message: "この元帳の名前と説明です。変更できるのは元帳の管理者だけです。",
    description:
      "General settings description shown to viewers who cannot edit the ledger",
  },
};

export default jaGeneralSettingsSection;
