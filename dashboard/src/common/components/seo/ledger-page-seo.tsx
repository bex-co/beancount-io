import { useLedger } from "@/common/providers/ledger-provider/use-ledger";
import { LedgerSEO } from "./ledger-seo";

export function LedgerPageSEO({
  seoKey,
  params,
}: {
  seoKey: string;
  params?: Record<string, string>;
}) {
  const { ledgerDisplayName, ledgerDescription } = useLedger();
  return (
    <LedgerSEO
      titleKey={`seo.${seoKey}.title`}
      descriptionKey={`seo.${seoKey}.description`}
      ledgerName={ledgerDisplayName}
      ledgerDescription={ledgerDescription}
      params={{ ledgerName: ledgerDisplayName, ...params }}
    />
  );
}
