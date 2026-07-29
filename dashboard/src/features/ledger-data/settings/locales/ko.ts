import koGeneralSettingsSection from "../general-settings-section/locales/ko";
import koVisibilitySection from "../visibility-section/locales/ko";
import koDangerZoneSection from "../danger-zone-section/locales/ko";
import koCollaboratorsSection from "../collaborators-section/locales/ko";
import koBeancountOptionsSection from "../beancount-options-section/locales/ko";
import koFavaOptionsSection from "../fava-options-section/locales/ko";
import koBcioOptionsSection from "../bcio-options-section/locales/ko";

export type { TranslationEntry } from "../general-settings-section/locales/en";

const koSettings: Record<string, { message: string; description: string }> = {
  "page.settings.failedToLoadLedgerSettings": {
    message: "장부 설정을 불러오지 못했습니다. 다시 시도해 주세요.",
    description: "Error message when ledger settings fail to load",
  },
};

const koAllSettings = {
  ...koGeneralSettingsSection,
  ...koVisibilitySection,
  ...koDangerZoneSection,
  ...koCollaboratorsSection,
  ...koBeancountOptionsSection,
  ...koFavaOptionsSection,
  ...koBcioOptionsSection,
  ...koSettings,
};

export default koAllSettings;
