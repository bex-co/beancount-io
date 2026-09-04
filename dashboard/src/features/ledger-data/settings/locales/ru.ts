import ruGeneralSettingsSection from "../general-settings-section/locales/ru";
import ruVisibilitySection from "../visibility-section/locales/ru";
import ruDangerZoneSection from "../danger-zone-section/locales/ru";
import ruCollaboratorsSection from "../collaborators-section/locales/ru";
import ruBeancountOptionsSection from "../beancount-options-section/locales/ru";
import ruFavaOptionsSection from "../fava-options-section/locales/ru";

export type { TranslationEntry } from "../general-settings-section/locales/en";

const ruSettings: Record<string, { message: string; description: string }> = {
  "page.settings.failedToLoadLedgerSettings": {
    message:
      "Не удалось загрузить настройки книги. Пожалуйста, попробуйте снова.",
    description: "Error message when ledger settings fail to load",
  },
};

const ruAllSettings = {
  ...ruGeneralSettingsSection,
  ...ruVisibilitySection,
  ...ruDangerZoneSection,
  ...ruCollaboratorsSection,
  ...ruBeancountOptionsSection,
  ...ruFavaOptionsSection,
  ...ruSettings,
  "page.settings.embedCodeDescription": {
    message:
      "Этот код для внедрения включает в себя адаптивный размер, преобразование масштаба и кнопку «Просмотр на Beancount.io» для указания авторства.",
    description: "Description of the generated public embed code",
  },
};

export default ruAllSettings;
