import koDashboardPage from "../pages/dashboard-page/locales/ko";
import koGalleryPage from "../pages/gallery-page/locales/ko";
import koWelcomePage from "../pages/welcome-page/locales/ko";
import { ledgerFormTranslations } from "../ledger-form-translations";

export type { TranslationEntry } from "../pages/dashboard-page/locales/ko";

const koLedgerList = {
  ...koDashboardPage,
  ...koGalleryPage,
  ...koWelcomePage,
  ...ledgerFormTranslations.ko,
};

export default koLedgerList;
