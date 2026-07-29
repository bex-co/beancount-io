import esDashboardPage from "../pages/dashboard-page/locales/es";
import esGalleryPage from "../pages/gallery-page/locales/es";
import esWelcomePage from "../pages/welcome-page/locales/es";
import { ledgerFormTranslations } from "../ledger-form-translations";

export type { TranslationEntry } from "../pages/dashboard-page/locales/es";

const esLedgerList = {
  ...esDashboardPage,
  ...esGalleryPage,
  ...esWelcomePage,
  ...ledgerFormTranslations.es,
};

export default esLedgerList;
