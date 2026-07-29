import faDashboardPage from "../pages/dashboard-page/locales/fa";
import faGalleryPage from "../pages/gallery-page/locales/fa";
import faWelcomePage from "../pages/welcome-page/locales/fa";
import { ledgerFormTranslations } from "../ledger-form-translations";

export type { TranslationEntry } from "../pages/dashboard-page/locales/fa";

const faLedgerList = {
  ...faDashboardPage,
  ...faGalleryPage,
  ...faWelcomePage,
  ...ledgerFormTranslations.fa,
};

export default faLedgerList;
