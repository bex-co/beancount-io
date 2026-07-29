import { useEffect } from "react";
import { useLocation, ClientOnly } from "@tanstack/react-router";
import {
  persistLanguage,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "@/i18n";
import i18n from "@/i18n/init";

const LanguageSyncImpl = () => {
  const location = useLocation();

  useEffect(() => {
    // Priority 1: ?lang= URL param always wins
    const lang = new URLSearchParams(location.searchStr).get("lang");
    if (lang && (SUPPORTED_LANGUAGES as readonly string[]).includes(lang)) {
      const supportedLang = lang as SupportedLanguage;
      if (i18n.language !== supportedLang) {
        void i18n.changeLanguage(supportedLang);
      }
      persistLanguage(supportedLang);
      return;
    }
  }, [location.searchStr]);

  // Sync document.documentElement.lang whenever i18n language changes
  useEffect(() => {
    const update = (lng: string) => {
      document.documentElement.lang = lng;
    };
    update(i18n.language);
    i18n.on("languageChanged", update);
    return () => {
      i18n.off("languageChanged", update);
    };
  }, []);

  return null;
};

export const LanguageSync = () => (
  <ClientOnly>
    <LanguageSyncImpl />
  </ClientOnly>
);
