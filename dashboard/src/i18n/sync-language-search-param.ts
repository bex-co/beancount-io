import type { SupportedLanguage } from "./config";

/**
 * Keep `?lang=` aligned with an explicit user (or recovery) language choice.
 * Preserves pathname, other search params, and hash. No-ops when already set.
 */
export function buildUrlWithLanguage(
  href: string,
  language: SupportedLanguage,
): string | null {
  const url = new URL(href, "http://localhost");
  if (url.searchParams.get("lang") === language) {
    return null;
  }
  url.searchParams.set("lang", language);
  return `${url.pathname}${url.search}${url.hash}`;
}
