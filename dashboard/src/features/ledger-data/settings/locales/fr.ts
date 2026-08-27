import frGeneralSettingsSection from "../general-settings-section/locales/fr";
import frVisibilitySection from "../visibility-section/locales/fr";
import frDangerZoneSection from "../danger-zone-section/locales/fr";
import frCollaboratorsSection from "../collaborators-section/locales/fr";
import frBeancountOptionsSection from "../beancount-options-section/locales/fr";
import frFavaOptionsSection from "../fava-options-section/locales/fr";
import frBcioOptionsSection from "../bcio-options-section/locales/fr";

export type { TranslationEntry } from "../general-settings-section/locales/en";

const frSettings: Record<string, { message: string; description: string }> = {
  "page.settings.failedToLoadLedgerSettings": {
    message:
      "Échec du chargement des paramètres du grand livre. Veuillez réessayer.",
    description: "Error message when ledger settings fail to load",
  },
};

const frAllSettings = {
  ...frGeneralSettingsSection,
  ...frVisibilitySection,
  ...frDangerZoneSection,
  ...frCollaboratorsSection,
  ...frBeancountOptionsSection,
  ...frFavaOptionsSection,
  ...frBcioOptionsSection,
  ...frSettings,
  "page.settings.embedCodeDescription": {
    message:
      "Ce code intégré inclut un dimensionnement réactif, une transformation d'échelle et un bouton « Afficher sur Beancount.io » pour l'attribution.",
    description: "Description of the generated public embed code",
  },
};

export default frAllSettings;
