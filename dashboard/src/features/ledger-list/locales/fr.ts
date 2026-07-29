import frDashboardPage from "../pages/dashboard-page/locales/fr";
import frGalleryPage from "../pages/gallery-page/locales/fr";
import frWelcomePage from "../pages/welcome-page/locales/fr";
import { ledgerFormTranslations } from "../ledger-form-translations";

export type { TranslationEntry } from "../pages/dashboard-page/locales/fr";

const frLedgerList = {
  ...frDashboardPage,
  ...frGalleryPage,
  ...frWelcomePage,
  ...ledgerFormTranslations.fr,
};

export default frLedgerList;
