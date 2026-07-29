import caDashboardPage from "../pages/dashboard-page/locales/ca";
import caGalleryPage from "../pages/gallery-page/locales/ca";
import caWelcomePage from "../pages/welcome-page/locales/ca";
import { ledgerFormTranslations } from "../ledger-form-translations";

export type { TranslationEntry } from "../pages/dashboard-page/locales/ca";

const caLedgerList = {
  ...caDashboardPage,
  ...caGalleryPage,
  ...caWelcomePage,
  ...ledgerFormTranslations.ca,
};

export default caLedgerList;
