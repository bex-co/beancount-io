import jaDashboardPage from "../pages/dashboard-page/locales/ja";
import jaGalleryPage from "../pages/gallery-page/locales/ja";
import jaWelcomePage from "../pages/welcome-page/locales/ja";
import { ledgerFormTranslations } from "../ledger-form-translations";

export type { TranslationEntry } from "../pages/dashboard-page/locales/ja";

const jaLedgerList = {
  ...jaDashboardPage,
  ...jaGalleryPage,
  ...jaWelcomePage,
  ...ledgerFormTranslations.ja,
};

export default jaLedgerList;
