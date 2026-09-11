import { useLedger } from "@/common/providers/ledger-provider/use-ledger";
import { LedgerSEO } from "./ledger-seo";

export function LedgerPageSEO({
  seoKey,
  params,
  noIndex = false,
  canonicalUrl,
  titlePrefix,
}: {
  seoKey: string;
  params?: Record<string, string>;
  /**
   * When true, emit robots noindex and skip hreflang. Overview keeps default false.
   * See `@/common/lib/seo/indexability`.
   */
  noIndex?: boolean;
  /** Bespoke canonical URL — see `LedgerSEO`'s prop of the same name. */
  canonicalUrl?: string;
  /** Optional path/identity prefix kept in sync with route `head()` titles. */
  titlePrefix?: string;
}) {
  const { ledgerDisplayName, ledgerDescription, ledgerData } = useLedger();
  return (
    <LedgerSEO
      titleKey={`seo.${seoKey}.title`}
      descriptionKey={`seo.${seoKey}.description`}
      ledgerName={ledgerDisplayName}
      ledgerDescription={ledgerDescription}
      params={{ ledgerName: ledgerDisplayName, ...params }}
      noIndex={noIndex}
      canonicalUrl={canonicalUrl}
      smartAppBanner={!ledgerData.private}
      titlePrefix={titlePrefix}
    />
  );
}
