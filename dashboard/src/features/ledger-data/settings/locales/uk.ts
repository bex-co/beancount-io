import ukGeneralSettingsSection from "../general-settings-section/locales/uk";
import ukVisibilitySection from "../visibility-section/locales/uk";
import ukDangerZoneSection from "../danger-zone-section/locales/uk";
import ukCollaboratorsSection from "../collaborators-section/locales/uk";
import ukBeancountOptionsSection from "../beancount-options-section/locales/uk";
import ukFavaOptionsSection from "../fava-options-section/locales/uk";

export type { TranslationEntry } from "../general-settings-section/locales/en";

const ukSettings: Record<string, { message: string; description: string }> = {
  "page.settings.failedToLoadLedgerSettings": {
    message: "Не вдалося завантажити налаштування книги. Спробуйте ще раз.",
    description: "Error message when ledger settings fail to load",
  },
};

const ukAllSettings = {
  ...ukGeneralSettingsSection,
  ...ukVisibilitySection,
  ...ukDangerZoneSection,
  ...ukCollaboratorsSection,
  ...ukBeancountOptionsSection,
  ...ukFavaOptionsSection,
  ...ukSettings,
  "page.settings.embedCodeDescription": {
    message:
      "Цей код для вбудовування включає адаптивне змінення розміру, трансформацію масштабу та кнопку «Переглянути на Beancount.io» для атрибуції.",
    description: "Description of the generated public embed code",
  },
};

export default ukAllSettings;
