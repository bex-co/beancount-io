import enGeneralSettingsSection from "../general-settings-section/locales/en";
import enVisibilitySection from "../visibility-section/locales/en";
import enDangerZoneSection from "../danger-zone-section/locales/en";
import enCollaboratorsSection from "../collaborators-section/locales/en";
import enBeancountOptionsSection from "../beancount-options-section/locales/en";
import enFavaOptionsSection from "../fava-options-section/locales/en";

export type { TranslationEntry } from "../general-settings-section/locales/en";

const enSettings: Record<string, { message: string; description: string }> = {
  "page.settings.failedToLoadLedgerSettings": {
    message: "Failed to load ledger settings. Please try again.",
    description: "Error message when ledger settings fail to load",
  },
};

const enAllSettings = {
  ...enGeneralSettingsSection,
  ...enVisibilitySection,
  ...enDangerZoneSection,
  ...enCollaboratorsSection,
  ...enBeancountOptionsSection,
  ...enFavaOptionsSection,
  ...enSettings,
  "page.settings.embedCodeDescription": {
    message:
      'This embed code includes responsive sizing, scale transformation, and a "View on Beancount.io" button for attribution.',
    description: "Description of the generated public embed code",
  },
};

export default enAllSettings;
