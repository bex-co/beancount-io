import nlDashboardPage from "../pages/dashboard-page/locales/nl";
import nlGalleryPage from "../pages/gallery-page/locales/nl";
import nlWelcomePage from "../pages/welcome-page/locales/nl";
import { ledgerFormTranslations } from "../ledger-form-translations";

export type { TranslationEntry } from "../pages/dashboard-page/locales/nl";

const nlLedgerList = {
  ...nlDashboardPage,
  ...nlGalleryPage,
  ...nlWelcomePage,
  ...ledgerFormTranslations.nl,
};

export default nlLedgerList;
