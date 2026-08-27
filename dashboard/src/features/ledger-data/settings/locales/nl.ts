import nlGeneralSettingsSection from "../general-settings-section/locales/nl";
import nlVisibilitySection from "../visibility-section/locales/nl";
import nlDangerZoneSection from "../danger-zone-section/locales/nl";
import nlCollaboratorsSection from "../collaborators-section/locales/nl";
import nlBeancountOptionsSection from "../beancount-options-section/locales/nl";
import nlFavaOptionsSection from "../fava-options-section/locales/nl";
import nlBcioOptionsSection from "../bcio-options-section/locales/nl";

export type { TranslationEntry } from "../general-settings-section/locales/en";

const nlSettings: Record<string, { message: string; description: string }> = {
  "page.settings.failedToLoadLedgerSettings": {
    message: "Grootboekinstellingen laden mislukt. Probeer het opnieuw.",
    description: "Error message when ledger settings fail to load",
  },
};

const nlAllSettings = {
  ...nlGeneralSettingsSection,
  ...nlVisibilitySection,
  ...nlDangerZoneSection,
  ...nlCollaboratorsSection,
  ...nlBeancountOptionsSection,
  ...nlFavaOptionsSection,
  ...nlBcioOptionsSection,
  ...nlSettings,
  "page.settings.embedCodeDescription": {
    message:
      "Deze insluitcode bevat responsieve afmetingen, schaaltransformatie en een knop 'Bekijken op Beancount.io' voor attributie.",
    description: "Description of the generated public embed code",
  },
};

export default nlAllSettings;
