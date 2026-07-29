import Cookies from "js-cookie";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n/config";
import { getSearchParamOnClient } from "@/common/lib/search-params/client";

/**
 * Detect language on the client by reading the i18nextLng cookie.
 * Falls back to URL ?lang= param, then to "en" if neither is present.
 */
export function detectLanguageOnClient(): SupportedLanguage {
  // Fallback to URL query parameter
  const lang = getSearchParamOnClient("lang");
  if (lang && (SUPPORTED_LANGUAGES as readonly string[]).includes(lang)) {
    return lang as SupportedLanguage;
  }

  // Try to get language from i18nextLng cookie
  const cookieLang = Cookies.get("i18nextLng");
  if (
    cookieLang &&
    (SUPPORTED_LANGUAGES as readonly string[]).includes(cookieLang)
  ) {
    return cookieLang as SupportedLanguage;
  }

  return "en";
}
