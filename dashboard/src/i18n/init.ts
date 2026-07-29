import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { detectLanguage } from "./detect-language";
import { SUPPORTED_LANGUAGES } from "./config";
// Import all translation files from aggregated locales
import {
  en,
  zh,
  es,
  fr,
  de,
  pt,
  ru,
  nl,
  bg,
  ca,
  fa,
  sk,
  uk,
  ja,
  ko,
} from "./locales";

// Initialize i18next WITHOUT LanguageDetector to prevent hydration mismatch.
// Language is read from ?lang= at module load time on the client, and synced
// via i18n.changeLanguage() in beforeLoad on the server.
void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
    es: { translation: es },
    fr: { translation: fr },
    de: { translation: de },
    pt: { translation: pt },
    ru: { translation: ru },
    nl: { translation: nl },
    bg: { translation: bg },
    ca: { translation: ca },
    fa: { translation: fa },
    sk: { translation: sk },
    uk: { translation: uk },
    ja: { translation: ja },
    ko: { translation: ko },
  },
  lng: detectLanguage(), // Match the server-rendered language via ?lang= param
  fallbackLng: "en", // Fallback language
  supportedLngs: SUPPORTED_LANGUAGES,
  nonExplicitSupportedLngs: true, // Allow regional variants like zh-CN to match zh
  debug: false, // Set to true for debugging
  interpolation: {
    escapeValue: false, // React already protects from XSS
    prefix: "{", // Use single braces for interpolation
    suffix: "}", // Use single braces for interpolation
  },
  react: {
    useSuspense: false, // Disable Suspense since translations are bundled
  },
});

export default i18n;
