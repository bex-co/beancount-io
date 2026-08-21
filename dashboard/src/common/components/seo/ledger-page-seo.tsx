import { useLedger } from "@/common/providers/ledger-provider/use-ledger";
import { LedgerSEO } from "./ledger-seo";

export function LedgerPageSEO({
  seoKey,
  params,
  noIndex = false,
}: {
  seoKey: string;
  params?: Record<string, string>;
  /**
   * When true, emit robots noindex and skip hreflang. Overview keeps default false.
   * See `@/common/lib/seo/indexability`.
   */
  noIndex?: boolean;
}) {
  const { ledgerDisplayName, ledgerDescription } = useLedger();
  return (
    <LedgerSEO
      titleKey={`seo.${seoKey}.title`}
      descriptionKey={`seo.${seoKey}.description`}
      ledgerName={ledgerDisplayName}
      ledgerDescription={ledgerDescription}
      params={{ ledgerName: ledgerDisplayName, ...params }}
      noIndex={noIndex}
    />
  );
}
