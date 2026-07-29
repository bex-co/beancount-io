import caGeneralSettingsSection from "../general-settings-section/locales/ca";
import caVisibilitySection from "../visibility-section/locales/ca";
import caDangerZoneSection from "../danger-zone-section/locales/ca";
import caCollaboratorsSection from "../collaborators-section/locales/ca";
import caBeancountOptionsSection from "../beancount-options-section/locales/ca";
import caFavaOptionsSection from "../fava-options-section/locales/ca";
import caBcioOptionsSection from "../bcio-options-section/locales/ca";

export type { TranslationEntry } from "../general-settings-section/locales/en";

const caSettings: Record<string, { message: string; description: string }> = {
  "page.settings.failedToLoadLedgerSettings": {
    message:
      "Error en carregar la configuració del llibre. Si us plau, torneu-ho a intentar.",
    description: "Error message when ledger settings fail to load",
  },
};

const caAllSettings = {
  ...caGeneralSettingsSection,
  ...caVisibilitySection,
  ...caDangerZoneSection,
  ...caCollaboratorsSection,
  ...caBeancountOptionsSection,
  ...caFavaOptionsSection,
  ...caBcioOptionsSection,
  ...caSettings,
};

export default caAllSettings;
