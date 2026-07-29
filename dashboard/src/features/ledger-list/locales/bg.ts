import bgDashboardPage from "../pages/dashboard-page/locales/bg";
import bgGalleryPage from "../pages/gallery-page/locales/bg";
import bgWelcomePage from "../pages/welcome-page/locales/bg";
import { ledgerFormTranslations } from "../ledger-form-translations";

export type { TranslationEntry } from "../pages/dashboard-page/locales/bg";

const bgLedgerList = {
  ...bgDashboardPage,
  ...bgGalleryPage,
  ...bgWelcomePage,
  ...ledgerFormTranslations.bg,
};

export default bgLedgerList;
