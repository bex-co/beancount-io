import { PageHeader } from "@/common/components/page-header";
import { RelatedLinks } from "@/common/components/related-links";
import { useParams } from "@tanstack/react-router";
import { PostingsPerAccount } from "./postings-per-account";
import { EntriesCountByType } from "./entries-count-by-type";
import { AccountLastEntries } from "./account-last-entries";
import { createLedgerId } from "@/common/lib/utils/encode";
import { useTranslations } from "@/common/hooks/use-translations";
import { useLedger } from "@/common/hooks/use-ledger";
import { LedgerPageSEO } from "@/common/components/seo/ledger-page-seo";

/**
 * Ledger Statistics Page Component
 * Displays statistics about ledger entries and account information
 */
export default function LedgerStatisticsPage() {
  const { t } = useTranslations();
  const { ledgerOwner, ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/statistics",
  });
  const ledgerId = createLedgerId(ledgerOwner, ledgerName);
  const { ledgerName: ledgerDisplayName } = useLedger();

  return (
    <div className="space-y-4">
      <LedgerPageSEO seoKey="ledgerStatistics" />
      <PageHeader
        title={t("page.statistics.statistics")}
        description={t("common.pageDescription.statistics", {
          ledgerName: ledgerDisplayName ?? ledgerName,
        })}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Postings per Account Table (BQL Query) */}
        <PostingsPerAccount ledgerId={ledgerId} />

        {/* Account Last Entries Table */}
        <AccountLastEntries ledgerId={ledgerId} />

        {/* Entries Count by Type Table */}
        <EntriesCountByType ledgerId={ledgerId} />
      </div>

      <RelatedLinks
        links={[
          {
            label: t("common.relatedLinks.overview"),
            to: `/ledger/${ledgerOwner}/${ledgerName}`,
          },
          {
            label: t("common.relatedLinks.journal"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/journal`,
          },
          {
            label: t("common.relatedLinks.errors"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/errors`,
          },
        ]}
      />
    </div>
  );
}
