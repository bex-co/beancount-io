import { PageHeader } from "@/common/components/page-header";
import { RelatedLinks } from "@/common/components/related-links";
import { useParams, ClientOnly } from "@tanstack/react-router";
import { ImportWorkflowContainer } from "../components/import-workflow-container";
import { AiCfoUpgradePanel } from "@/common/components/ai-cfo-upgrade-panel";
import { createLedgerId } from "@/common/lib/utils/encode";
import { useLedger } from "@/common/hooks/use-ledger";
import { useTranslations } from "@/common/hooks/use-translations";
import { LedgerPageSEO } from "@/common/components/seo/ledger-page-seo";

export default function ImportPage() {
  const { t } = useTranslations();
  const { ledgerOwner, ledgerName } = useParams({ strict: false }) as {
    ledgerOwner: string;
    ledgerName: string;
  };
  const ledgerId = createLedgerId(ledgerOwner, ledgerName);
  const { ledgerName: ledgerDisplayName } = useLedger();

  return (
    <div className="space-y-6">
      <LedgerPageSEO seoKey="ledgerImport" noIndex />
      {/* Header */}
      <PageHeader
        title={t("page.importer.title")}
        description={t("common.pageDescription.import", {
          ledgerName: ledgerDisplayName ?? ledgerName,
        })}
      />

      {/* AI CFO Upgrade Panel */}
      <ClientOnly>
        <AiCfoUpgradePanel />
      </ClientOnly>

      {/* Main Content */}
      <div className="space-y-6">
        <ImportWorkflowContainer
          ledgerId={ledgerId}
          ledgerOwner={ledgerOwner}
          ledgerName={ledgerName}
        />
      </div>

      {/* Footer */}
      <RelatedLinks
        links={[
          {
            label: t("common.relatedLinks.journal"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/journal`,
          },
          {
            label: t("common.relatedLinks.files"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/files`,
          },
          {
            label: t("common.relatedLinks.query"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/query`,
          },
        ]}
      />
    </div>
  );
}
