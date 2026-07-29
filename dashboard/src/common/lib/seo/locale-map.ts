/**
 * OpenGraph locale mapping for SEO meta tags
 *
 * Maps i18n language codes to OpenGraph locale format (language_REGION)
 * Used for og:locale meta tag to help social media platforms display
 * content in the correct language/region context.
 */
export const OG_LOCALE_MAP: Record<string, string> = {
  en: "en_US",
  zh: "zh_CN",
  es: "es_ES",
  fr: "fr_FR",
  de: "de_DE",
  pt: "pt_BR",
  ru: "ru_RU",
  nl: "nl_NL",
  bg: "bg_BG",
  ca: "ca_ES",
  fa: "fa_IR",
  sk: "sk_SK",
  uk: "uk_UA",
};

/**
 * Get the OpenGraph locale for a given language code
 * @param langCode - The language code (e.g., "en", "zh", "fr")
 * @returns The OpenGraph locale (e.g., "en_US", "zh_CN", "fr_FR")
 */
export function getOgLocale(langCode: string): string {
  return OG_LOCALE_MAP[langCode] || "en_US";
}
