import { LedgerPage, LedgerPageHeading } from "@/common/components/ledger-page";
import { RelatedLinks } from "@/common/components/related-links";
import { getLedgerFilesRootPath } from "@/common/hooks/use-file-navigate";
import { useParams, ClientOnly } from "@tanstack/react-router";
import { ImportWorkflowContainer } from "../components/import-workflow-container";
import { AiCfoUpgradePanel } from "@/common/components/ai-cfo-upgrade-panel";
import { createLedgerId } from "@/common/lib/utils/encode";
import { useLedger } from "@/common/hooks/use-ledger";
import { useLedgerPermission } from "@/common/hooks/use-ledger-permission";
import { useTranslations } from "@/common/hooks/use-translations";
import { LedgerWriteAccessNotice } from "@/common/components/ledger-write-access-notice";

export default function ImportPage() {
  const { t } = useTranslations();
  const { ledgerOwner, ledgerName } = useParams({ strict: false }) as {
    ledgerOwner: string;
    ledgerName: string;
  };
  const ledgerId = createLedgerId(ledgerOwner, ledgerName);
  const { ledgerName: ledgerDisplayName } = useLedger();
  const { canWrite } = useLedgerPermission();

  return (
    <LedgerPage className="space-y-5 sm:space-y-6">
      {/* Header */}
      <LedgerPageHeading
        title={t("page.importer.title")}
        description={t("common.pageDescription.import", {
          ledgerName: ledgerDisplayName ?? ledgerName,
        })}
      />

      {/* Main Content */}
      <div className="space-y-6">
        {canWrite ? (
          <>
            <ClientOnly>
              <AiCfoUpgradePanel />
            </ClientOnly>
            <ImportWorkflowContainer
              ledgerId={ledgerId}
              ledgerOwner={ledgerOwner}
              ledgerName={ledgerName}
            />
          </>
        ) : (
          <LedgerWriteAccessNotice
            title={t("importer.access.title")}
            signedOut={t("importer.access.signedOut")}
            readOnly={t("importer.access.readOnly")}
            unresolved={t("importer.access.unresolved")}
          />
        )}
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
            to: getLedgerFilesRootPath(ledgerOwner, ledgerName),
          },
          {
            label: t("common.relatedLinks.query"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/query`,
          },
        ]}
      />
    </LedgerPage>
  );
}
