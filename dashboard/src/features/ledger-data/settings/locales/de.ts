import deGeneralSettingsSection from "../general-settings-section/locales/de";
import deVisibilitySection from "../visibility-section/locales/de";
import deDangerZoneSection from "../danger-zone-section/locales/de";
import deCollaboratorsSection from "../collaborators-section/locales/de";
import deBeancountOptionsSection from "../beancount-options-section/locales/de";
import deFavaOptionsSection from "../fava-options-section/locales/de";
import deBcioOptionsSection from "../bcio-options-section/locales/de";

export type { TranslationEntry } from "../general-settings-section/locales/en";

const deSettings: Record<string, { message: string; description: string }> = {
  "page.settings.failedToLoadLedgerSettings": {
    message:
      "Hauptbuch-Einstellungen konnten nicht geladen werden. Bitte versuchen Sie es erneut.",
    description: "Error message when ledger settings fail to load",
  },
};

const deAllSettings = {
  ...deGeneralSettingsSection,
  ...deVisibilitySection,
  ...deDangerZoneSection,
  ...deCollaboratorsSection,
  ...deBeancountOptionsSection,
  ...deFavaOptionsSection,
  ...deBcioOptionsSection,
  ...deSettings,
};

export default deAllSettings;
