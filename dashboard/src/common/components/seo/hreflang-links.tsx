import { useLocation } from "@tanstack/react-router";
import { SUPPORTED_LANGUAGES } from "@/i18n";

// Production base URL - hreflang is for SEO/search engines which crawl production
// Using beancount.io as it's the canonical domain (dashboard.v3.beancount.io redirects to it)
const BASE_URL = "https://beancount.io";

/**
 * HreflangLinks component for SEO internationalization
 *
 * Generates hreflang alternate links for all supported languages to help
 * search engines understand the language versions of the page.
 *
 * Uses TanStack Router's useLocation() which works during SSR (via memory history),
 * combined with a constant production base URL for proper hreflang URLs.
 *
 * React 19 automatically hoists <link> tags to <head>.
 *
 * @example
 * ```tsx
 * <HreflangLinks />
 * ```
 */
export function HreflangLinks() {
  const location = useLocation();

  /**
   * Generate the hreflang URL for a given language
   * Preserves the current path and replaces/adds the lang query parameter
   *
   * Note: TanStack Router's location.searchStr gives the raw query string (e.g., "?foo=bar")
   * while location.search is the parsed search params object.
   */
  const getHreflangUrl = (lang: string): string => {
    const url = new URL(
      location.pathname + (location.searchStr || ""),
      BASE_URL,
    );
    url.searchParams.set("lang", lang);
    return url.toString();
  };

  /**
   * Get the base URL without the lang query parameter (for x-default)
   */
  const getDefaultUrl = (): string => {
    const url = new URL(
      location.pathname + (location.searchStr || ""),
      BASE_URL,
    );
    url.searchParams.delete("lang");
    return url.toString();
  };

  return (
    <>
      {SUPPORTED_LANGUAGES.map((lang) => (
        <link
          key={lang}
          rel="alternate"
          hrefLang={lang}
          href={getHreflangUrl(lang)}
        />
      ))}
      {/* x-default points to the default version (without explicit lang param) */}
      <link rel="alternate" hrefLang="x-default" href={getDefaultUrl()} />
    </>
  );
}
