import { useTranslations } from "@/common/hooks/use-translations";
import { getOgLocale } from "@/common/lib/seo/locale-map";
import { HreflangLinks } from "./hreflang-links";

interface PageSEOProps {
  /**
   * The title translation key (e.g., "seo.login.title")
   */
  titleKey: string;
  /**
   * The description translation key (e.g., "seo.login.description")
   */
  descriptionKey?: string;
  /**
   * Optional parameters for i18n interpolation
   */
  params?: Record<string, string>;
}

/**
 * PageSEO component for dynamically setting meta tags on non-ledger pages
 *
 * This component uses React 19's built-in metadata hoisting to set meta tags in both SSR and client-side rendering.
 * React 19 automatically hoists <title> and <meta> tags to <head> (no third-party libraries needed).
 * It supports title, description, Open Graph, and Twitter Card meta tags.
 *
 * Use this component for pages that don't have ledger context (auth pages, settings, gallery, etc.).
 * For ledger-specific pages, use <LedgerSEO> instead.
 *
 * @example
 * ```tsx
 * <PageSEO
 *   titleKey="seo.login.title"
 *   descriptionKey="seo.login.description"
 * />
 * ```
 */
export function PageSEO({ titleKey, descriptionKey, params }: PageSEOProps) {
  const { t, i18n } = useTranslations();

  // Generate the title with interpolated params
  const title = params ? t(titleKey, params) : t(titleKey);

  // Generate description if key is provided
  const description = descriptionKey
    ? params
      ? t(descriptionKey, params)
      : t(descriptionKey)
    : "";

  // Generate dynamic OG image URL using the page title
  const ogImageUrl = `https://opengraph-image.blockeden.xyz/api/og-beancount-io?title=${encodeURIComponent(title)}`;

  // Get OpenGraph locale for current language (use i18n from hook for SSR compatibility)
  const ogLocale = getOgLocale(i18n.language);

  // React 19 automatically hoists these tags to <head>
  return (
    <>
      <title>{title}</title>
      {description && <meta name="description" content={description} />}

      {/* Open Graph meta tags for social sharing */}
      <meta property="og:title" content={title} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:locale" content={ogLocale} />

      {/* Twitter Card meta tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={ogImageUrl} />

      {/* hreflang links for international SEO */}
      <HreflangLinks />
    </>
  );
}
