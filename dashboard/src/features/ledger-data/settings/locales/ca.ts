import caGeneralSettingsSection from "../general-settings-section/locales/ca";
import caVisibilitySection from "../visibility-section/locales/ca";
import caDangerZoneSection from "../danger-zone-section/locales/ca";
import caCollaboratorsSection from "../collaborators-section/locales/ca";
import caBeancountOptionsSection from "../beancount-options-section/locales/ca";
import caFavaOptionsSection from "../fava-options-section/locales/ca";

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
  ...caSettings,
  "page.settings.embedCodeDescription": {
    message:
      "Aquest codi d'inserció inclou la mida sensible, la transformació d'escala i un botó \"Mostra a Beancount.io\" per a l'atribució.",
    description: "Description of the generated public embed code",
  },
};

export default caAllSettings;
