import i18n from "@/i18n/init";
import { getOgLocale } from "./locale-map";

interface SEOMetadata {
  title: string;
  description: string;
}

interface SEOOptions {
  /**
   * Optional custom description that overrides the i18n description
   * Useful for dynamic content like ledger descriptions
   */
  customDescription?: string | null;
}

/**
 * Get SEO metadata (title and description) from i18n keys
 * @param titleKey - Full translation key for the title (e.g., "common.seo.login.title")
 * @param descriptionKey - Full translation key for the description (e.g., "common.seo.login.description")
 * @param params - Optional parameters for interpolation (e.g., { ledgerName: "My Ledger" })
 * @param options - Optional SEO configuration
 * @returns SEO metadata object with title and description
 */
export function getSEOMetadata(
  titleKey: string,
  descriptionKey: string,
  params?: Record<string, string>,
  options?: SEOOptions,
): SEOMetadata {
  const title = params ? i18n.t(titleKey, params) : i18n.t(titleKey);

  // Use custom description if provided, otherwise fall back to i18n
  let description: string;
  if (options?.customDescription) {
    description = options.customDescription;
  } else {
    description = params
      ? i18n.t(descriptionKey, params)
      : i18n.t(descriptionKey);
  }

  return {
    title: title,
    description,
  };
}

interface HeadMetaOptions {
  /**
   * Explicit language code (e.g. "en", "de") to use for og:locale resolution.
   * If not provided, falls back to the global i18n singleton.
   * For SSR, pass the request-scoped language from I18nextProvider.
   */
  language?: string;
}

/**
 * Create head meta configuration for TanStack Router
 * @param metadata - SEO metadata with title and description
 * @param options - Optional configuration allowing an explicit language
 * @returns Head configuration object for route's head property
 */
export function createHeadMeta(
  metadata: SEOMetadata,
  options?: HeadMetaOptions,
) {
  // Use explicit language if provided, otherwise fall back to global singleton
  const resolvedLanguage = options?.language ?? i18n.language;
  const ogLocale = getOgLocale(resolvedLanguage);

  return {
    meta: [
      {
        title: metadata.title,
      },
      {
        name: "description",
        content: metadata.description,
      },
      {
        property: "og:locale",
        content: ogLocale,
      },
    ],
  };
}
