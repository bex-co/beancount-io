import zhDashboardPage from "../pages/dashboard-page/locales/zh";
import zhGalleryPage from "../pages/gallery-page/locales/zh";
import zhWelcomePage from "../pages/welcome-page/locales/zh";
import { ledgerFormTranslations } from "../ledger-form-translations";

export type { TranslationEntry } from "../pages/dashboard-page/locales/zh";

const zhLedgerList = {
  ...zhDashboardPage,
  ...zhGalleryPage,
  ...zhWelcomePage,
  ...ledgerFormTranslations.zh,
};

export default zhLedgerList;
