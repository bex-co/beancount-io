import ruDashboardPage from "../pages/dashboard-page/locales/ru";
import ruGalleryPage from "../pages/gallery-page/locales/ru";
import ruWelcomePage from "../pages/welcome-page/locales/ru";
import { ledgerFormTranslations } from "../ledger-form-translations";

export type { TranslationEntry } from "../pages/dashboard-page/locales/ru";

const ruLedgerList = {
  ...ruDashboardPage,
  ...ruGalleryPage,
  ...ruWelcomePage,
  ...ledgerFormTranslations.ru,
};

export default ruLedgerList;
