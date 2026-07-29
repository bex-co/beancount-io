import { getCookie } from "@tanstack/react-start/server";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n/config";
import { getSearchParamOnServer } from "@/common/lib/search-params/server";

/**
 * Detect the preferred language on the server side.
 * Priority: URL param (?lang=zh) > cookie (i18nextLng) > default "en"
 *
 * Reads the URL param directly from the current H3 request via getRequest().
 * Server-only: do not import this file on the client.
 */
export function detectLanguageOnServer(): SupportedLanguage {
  const urlLang = getSearchParamOnServer("lang");

  if (urlLang && (SUPPORTED_LANGUAGES as readonly string[]).includes(urlLang)) {
    return urlLang as SupportedLanguage;
  }

  const cookieLang = getCookie("i18nextLng");
  if (
    cookieLang &&
    (SUPPORTED_LANGUAGES as readonly string[]).includes(cookieLang)
  ) {
    return cookieLang as SupportedLanguage;
  }

  return "en";
}
