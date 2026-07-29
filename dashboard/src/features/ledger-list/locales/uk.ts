import ukDashboardPage from "../pages/dashboard-page/locales/uk";
import ukGalleryPage from "../pages/gallery-page/locales/uk";
import ukWelcomePage from "../pages/welcome-page/locales/uk";
import { ledgerFormTranslations } from "../ledger-form-translations";

export type { TranslationEntry } from "../pages/dashboard-page/locales/uk";

const ukLedgerList = {
  ...ukDashboardPage,
  ...ukGalleryPage,
  ...ukWelcomePage,
  ...ledgerFormTranslations.uk,
};

export default ukLedgerList;
