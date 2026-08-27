import bgGeneralSettingsSection from "../general-settings-section/locales/bg";
import bgVisibilitySection from "../visibility-section/locales/bg";
import bgDangerZoneSection from "../danger-zone-section/locales/bg";
import bgCollaboratorsSection from "../collaborators-section/locales/bg";
import bgBeancountOptionsSection from "../beancount-options-section/locales/bg";
import bgFavaOptionsSection from "../fava-options-section/locales/bg";
import bgBcioOptionsSection from "../bcio-options-section/locales/bg";

export type { TranslationEntry } from "../general-settings-section/locales/en";

const bgSettings: Record<string, { message: string; description: string }> = {
  "page.settings.failedToLoadLedgerSettings": {
    message:
      "Неуспешно зареждане на настройките на книгата. Моля, опитайте отново.",
    description: "Error message when ledger settings fail to load",
  },
};

const bgAllSettings = {
  ...bgGeneralSettingsSection,
  ...bgVisibilitySection,
  ...bgDangerZoneSection,
  ...bgCollaboratorsSection,
  ...bgBeancountOptionsSection,
  ...bgFavaOptionsSection,
  ...bgBcioOptionsSection,
  ...bgSettings,
  "page.settings.embedCodeDescription": {
    message:
      "Този код за вграждане включва адаптивно оразмеряване, трансформация на мащаба и бутон „Преглед на Beancount.io“ за приписване.",
    description: "Description of the generated public embed code",
  },
};

export default bgAllSettings;
