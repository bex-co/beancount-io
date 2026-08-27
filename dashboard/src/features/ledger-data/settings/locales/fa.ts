import faGeneralSettingsSection from "../general-settings-section/locales/fa";
import faVisibilitySection from "../visibility-section/locales/fa";
import faDangerZoneSection from "../danger-zone-section/locales/fa";
import faCollaboratorsSection from "../collaborators-section/locales/fa";
import faBeancountOptionsSection from "../beancount-options-section/locales/fa";
import faFavaOptionsSection from "../fava-options-section/locales/fa";
import faBcioOptionsSection from "../bcio-options-section/locales/fa";

export type { TranslationEntry } from "../general-settings-section/locales/en";

const faSettings: Record<string, { message: string; description: string }> = {
  "page.settings.failedToLoadLedgerSettings": {
    message: "بارگذاری تنظیمات دفتر ناموفق بود. لطفاً دوباره تلاش کنید.",
    description: "Error message when ledger settings fail to load",
  },
};

const faAllSettings = {
  ...faGeneralSettingsSection,
  ...faVisibilitySection,
  ...faDangerZoneSection,
  ...faCollaboratorsSection,
  ...faBeancountOptionsSection,
  ...faFavaOptionsSection,
  ...faBcioOptionsSection,
  ...faSettings,
  "page.settings.embedCodeDescription": {
    message:
      'این کد جاسازی شده شامل اندازه پاسخگو، تغییر مقیاس، و دکمه "View on Beancount.io" برای انتساب است.',
    description: "Description of the generated public embed code",
  },
};

export default faAllSettings;
