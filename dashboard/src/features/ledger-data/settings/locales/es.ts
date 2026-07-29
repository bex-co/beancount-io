import esGeneralSettingsSection from "../general-settings-section/locales/es";
import esVisibilitySection from "../visibility-section/locales/es";
import esDangerZoneSection from "../danger-zone-section/locales/es";
import esCollaboratorsSection from "../collaborators-section/locales/es";
import esBeancountOptionsSection from "../beancount-options-section/locales/es";
import esFavaOptionsSection from "../fava-options-section/locales/es";
import esBcioOptionsSection from "../bcio-options-section/locales/es";

export type { TranslationEntry } from "../general-settings-section/locales/en";

const esSettings: Record<string, { message: string; description: string }> = {
  "page.settings.failedToLoadLedgerSettings": {
    message:
      "Error al cargar la configuración del libro mayor. Por favor, inténtelo de nuevo.",
    description: "Error message when ledger settings fail to load",
  },
};

const esAllSettings = {
  ...esGeneralSettingsSection,
  ...esVisibilitySection,
  ...esDangerZoneSection,
  ...esCollaboratorsSection,
  ...esBeancountOptionsSection,
  ...esFavaOptionsSection,
  ...esBcioOptionsSection,
  ...esSettings,
};

export default esAllSettings;
