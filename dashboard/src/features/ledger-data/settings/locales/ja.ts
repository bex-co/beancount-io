import jaGeneralSettingsSection from "../general-settings-section/locales/ja";
import jaVisibilitySection from "../visibility-section/locales/ja";
import jaDangerZoneSection from "../danger-zone-section/locales/ja";
import jaCollaboratorsSection from "../collaborators-section/locales/ja";
import jaBeancountOptionsSection from "../beancount-options-section/locales/ja";
import jaFavaOptionsSection from "../fava-options-section/locales/ja";
import jaBcioOptionsSection from "../bcio-options-section/locales/ja";

export type { TranslationEntry } from "../general-settings-section/locales/en";

const jaSettings: Record<string, { message: string; description: string }> = {
  "page.settings.failedToLoadLedgerSettings": {
    message: "元帳設定の読み込みに失敗しました。もう一度お試しください。",
    description: "Error message when ledger settings fail to load",
  },
};

const jaAllSettings = {
  ...jaGeneralSettingsSection,
  ...jaVisibilitySection,
  ...jaDangerZoneSection,
  ...jaCollaboratorsSection,
  ...jaBeancountOptionsSection,
  ...jaFavaOptionsSection,
  ...jaBcioOptionsSection,
  ...jaSettings,
  "page.settings.embedCodeDescription": {
    message:
      "この埋め込みコードには、レスポンシブなサイジング、スケール変換、および帰属を示すための「Beancount.io で表示」ボタンが含まれています。",
    description: "Description of the generated public embed code",
  },
};

export default jaAllSettings;
