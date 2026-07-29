import zhGeneralSettingsSection from "../general-settings-section/locales/zh";
import zhVisibilitySection from "../visibility-section/locales/zh";
import zhDangerZoneSection from "../danger-zone-section/locales/zh";
import zhCollaboratorsSection from "../collaborators-section/locales/zh";
import zhBeancountOptionsSection from "../beancount-options-section/locales/zh";
import zhFavaOptionsSection from "../fava-options-section/locales/zh";
import zhBcioOptionsSection from "../bcio-options-section/locales/zh";

export type { TranslationEntry } from "../general-settings-section/locales/en";

const zhSettings: Record<string, { message: string; description: string }> = {
  "page.settings.failedToLoadLedgerSettings": {
    message: "加载账本设置失败。请重试。",
    description: "Error message when ledger settings fail to load",
  },
};

const zhAllSettings = {
  ...zhGeneralSettingsSection,
  ...zhVisibilitySection,
  ...zhDangerZoneSection,
  ...zhCollaboratorsSection,
  ...zhBeancountOptionsSection,
  ...zhFavaOptionsSection,
  ...zhBcioOptionsSection,
  ...zhSettings,
};

export default zhAllSettings;
