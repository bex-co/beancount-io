import skDashboardPage from "../pages/dashboard-page/locales/sk";
import skGalleryPage from "../pages/gallery-page/locales/sk";
import skWelcomePage from "../pages/welcome-page/locales/sk";
import { ledgerFormTranslations } from "../ledger-form-translations";

export type { TranslationEntry } from "../pages/dashboard-page/locales/sk";

const skLedgerList = {
  ...skDashboardPage,
  ...skGalleryPage,
  ...skWelcomePage,
  ...ledgerFormTranslations.sk,
};

export default skLedgerList;
