import skGeneralSettingsSection from "../general-settings-section/locales/sk";
import skVisibilitySection from "../visibility-section/locales/sk";
import skDangerZoneSection from "../danger-zone-section/locales/sk";
import skCollaboratorsSection from "../collaborators-section/locales/sk";
import skBeancountOptionsSection from "../beancount-options-section/locales/sk";
import skFavaOptionsSection from "../fava-options-section/locales/sk";
import skBcioOptionsSection from "../bcio-options-section/locales/sk";

export type { TranslationEntry } from "../general-settings-section/locales/en";

const skSettings: Record<string, { message: string; description: string }> = {
  "page.settings.failedToLoadLedgerSettings": {
    message: "Nepodarilo sa načítať nastavenia knihy. Prosím skúste to znova.",
    description: "Error message when ledger settings fail to load",
  },
};

const skAllSettings = {
  ...skGeneralSettingsSection,
  ...skVisibilitySection,
  ...skDangerZoneSection,
  ...skCollaboratorsSection,
  ...skBeancountOptionsSection,
  ...skFavaOptionsSection,
  ...skBcioOptionsSection,
  ...skSettings,
};

export default skAllSettings;
