import { useParams, useSearch } from "@tanstack/react-router";
import { PageHeader } from "@/common/components/page-header";
import LedgerDirectoryView from "@/features/ledger-editor/directory-browse/components/ledger-directory-view";
import { createLedgerId } from "@/common/lib/utils/encode";
import { useTranslations } from "@/common/hooks/use-translations";
import { useLedger } from "@/common/hooks/use-ledger";
import { LedgerPageSEO } from "@/common/components/seo/ledger-page-seo";

export default function FilesContentPage() {
  const { ledgerOwner, ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/files/content",
  });
  const { path } = useSearch({
    from: "/ledger/$ledgerOwner/$ledgerName/files/content",
  });

  const { t } = useTranslations();
  const ledgerId = createLedgerId(ledgerOwner, ledgerName);
  const { ledgerName: ledgerDisplayName } = useLedger();

  return (
    <div className="flex flex-col h-full space-y-4">
      <LedgerPageSEO seoKey="ledgerFiles" />
      <PageHeader
        title={t("ledgerEditor.files")}
        description={t("common.pageDescription.files", {
          ledgerName: ledgerDisplayName ?? ledgerName,
        })}
      />
      <div className="flex-1">
        <LedgerDirectoryView ledgerId={ledgerId} currentPath={path || ""} />
      </div>
    </div>
  );
}
