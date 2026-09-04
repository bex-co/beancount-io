import koGeneralSettingsSection from "../general-settings-section/locales/ko";
import koVisibilitySection from "../visibility-section/locales/ko";
import koDangerZoneSection from "../danger-zone-section/locales/ko";
import koCollaboratorsSection from "../collaborators-section/locales/ko";
import koBeancountOptionsSection from "../beancount-options-section/locales/ko";
import koFavaOptionsSection from "../fava-options-section/locales/ko";

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
  ...koSettings,
  "page.settings.embedCodeDescription": {
    message:
      '이 포함 코드에는 반응형 크기 조정, 크기 변환 및 속성을 위한 "Beancount.io에서 보기" 버튼이 포함되어 있습니다.',
    description: "Description of the generated public embed code",
  },
};

export default koAllSettings;
