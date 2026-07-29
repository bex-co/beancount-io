import deDashboardPage from "../pages/dashboard-page/locales/de";
import deGalleryPage from "../pages/gallery-page/locales/de";
import deWelcomePage from "../pages/welcome-page/locales/de";
import { ledgerFormTranslations } from "../ledger-form-translations";

export type { TranslationEntry } from "../pages/dashboard-page/locales/de";

const deLedgerList = {
  ...deDashboardPage,
  ...deGalleryPage,
  ...deWelcomePage,
  ...ledgerFormTranslations.de,
};

export default deLedgerList;
