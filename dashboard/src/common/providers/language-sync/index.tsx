import { useEffect } from "react";
import { useLocation, ClientOnly } from "@tanstack/react-router";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n";
import { useTranslation } from "react-i18next";
import { persistLanguage } from "@/i18n/funcs";
import { useChangeLanguage } from "@/common/hooks/use-change-language";

const LanguageSyncImpl = () => {
  const location = useLocation();
  const { i18n } = useTranslation();
  const { changeLanguage } = useChangeLanguage();

  useEffect(() => {
    // Priority 1: ?lang= URL param always wins
    const lang = new URLSearchParams(location.searchStr).get("lang");
    if (lang && (SUPPORTED_LANGUAGES as readonly string[]).includes(lang)) {
      const supportedLang = lang as SupportedLanguage;
      if (i18n.language !== supportedLang) {
        void changeLanguage(supportedLang);
      } else {
        persistLanguage(supportedLang);
      }
      return;
    }
  }, [location.searchStr, i18n, changeLanguage]);

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
  }, [i18n]);

  return null;
};

export const LanguageSync = () => (
  <ClientOnly>
    <LanguageSyncImpl />
  </ClientOnly>
);
