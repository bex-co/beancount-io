import ptDashboardPage from "../pages/dashboard-page/locales/pt";
import ptGalleryPage from "../pages/gallery-page/locales/pt";
import ptWelcomePage from "../pages/welcome-page/locales/pt";
import { ledgerFormTranslations } from "../ledger-form-translations";

export type { TranslationEntry } from "../pages/dashboard-page/locales/pt";

const ptLedgerList = {
  ...ptDashboardPage,
  ...ptGalleryPage,
  ...ptWelcomePage,
  ...ledgerFormTranslations.pt,
};

export default ptLedgerList;
