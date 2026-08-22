import { useLocation } from "@tanstack/react-router";
import { useTranslations } from "@/common/hooks/use-translations";
import { getOgLocale } from "@/common/lib/seo/locale-map";
import {
  NOINDEX_ROBOTS_CONTENT,
  getSelfCanonicalUrl,
} from "@/common/lib/seo/indexability";
import { HreflangLinks } from "./hreflang-links";

interface LedgerSEOProps {
  /**
   * The title translation key (e.g., "seo.ledgerOverview.title")
   */
  titleKey: string;
  /**
   * The description translation key (e.g., "seo.ledgerOverview.description")
   */
  descriptionKey: string;
  /**
   * The ledger name to interpolate into the title
   */
  ledgerName: string;
  /**
   * Optional custom description from the ledger repository
   * If provided, this overrides the default i18n description
   */
  ledgerDescription?: string | null;
  /**
   * Optional additional parameters for i18n interpolation (e.g., accountName)
   */
  params?: Record<string, string>;
  /**
   * When true, emit robots noindex and skip hreflang (deep app routes).
   * See `@/common/lib/seo/indexability`.
   */
  noIndex?: boolean;
  /**
   * Bespoke canonical URL (e.g. commit detail, blob, ask → agent). Emitted
   * even with noIndex. When omitted, indexable pages self-canonicalize via
   * `getSelfCanonicalUrl` (path + supported `lang` only).
   */
  canonicalUrl?: string;
}

/**
 * LedgerSEO component for dynamically setting meta tags with ledger-specific information
 *
 * This component uses React 19's built-in metadata hoisting to set meta tags in both SSR and client-side rendering.
 * React 19 automatically hoists <title> and <meta> tags to <head> (no third-party libraries needed).
 * It supports title, description, Open Graph, and Twitter Card meta tags.
 *
 * @example
 * ```tsx
 * <LedgerSEO
 *   titleKey="seo.ledgerOverview.title"
 *   descriptionKey="seo.ledgerOverview.description"
 *   ledgerName={currentLedger.name}
 *   ledgerDescription={currentLedger.description}
 * />
 * ```
 */
export function LedgerSEO({
  titleKey,
  descriptionKey,
  ledgerName,
  ledgerDescription,
  params,
  noIndex = false,
  canonicalUrl,
}: LedgerSEOProps) {
  const { t, i18n } = useTranslations();
  const location = useLocation();
  const canonicalHref =
    canonicalUrl ??
    (noIndex
      ? undefined
      : getSelfCanonicalUrl({
          pathname: location.pathname,
          search: location.search,
        }));

  // Generate the title with interpolated ledger name and additional params
  const title = t(titleKey, { ledgerName, ...params });

  // Use custom description if available, otherwise use the default i18n one
  const description = ledgerDescription
    ? ledgerDescription
    : t(descriptionKey, { ledgerName, ...params });

  // Generate dynamic OG image URL using the page title
  const ogImageUrl = `https://opengraph-image.blockeden.xyz/api/og-beancount-io?title=${encodeURIComponent(title)}`;

  // Get OpenGraph locale for current language (use i18n from hook for SSR compatibility)
  const ogLocale = getOgLocale(i18n.language);

  // React 19 automatically hoists these tags to <head>
  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      {noIndex ? <meta name="robots" content={NOINDEX_ROBOTS_CONTENT} /> : null}
      {canonicalHref ? <link rel="canonical" href={canonicalHref} /> : null}

      {/* Open Graph meta tags for social sharing */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:locale" content={ogLocale} />

      {/* Twitter Card meta tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImageUrl} />

      {/* hreflang only on indexable pages — avoids ?lang= alternate explosion */}
      {noIndex ? null : <HreflangLinks />}
    </>
  );
}
