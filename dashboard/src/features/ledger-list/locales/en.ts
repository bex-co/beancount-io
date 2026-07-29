import enDashboardPage from "../pages/dashboard-page/locales/en";
import enGalleryPage from "../pages/gallery-page/locales/en";
import enWelcomePage from "../pages/welcome-page/locales/en";
import { ledgerFormTranslations } from "../ledger-form-translations";

export type { TranslationEntry } from "../pages/dashboard-page/locales/en";

const enLedgerList = {
  ...enDashboardPage,
  ...enGalleryPage,
  ...enWelcomePage,
  ...ledgerFormTranslations.en,
};

export default enLedgerList;
