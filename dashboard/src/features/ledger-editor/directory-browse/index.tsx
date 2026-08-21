import { useParams } from "@tanstack/react-router";
import LedgerDirectoryView from "./components/ledger-directory-view";
import { createLedgerId } from "@/common/lib/utils/encode";
import { LedgerPageSEO } from "@/common/components/seo/ledger-page-seo";

export default function LedgerDirectoryPage() {
  const params = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/files/tree/$branch/$",
  });
  const { ledgerOwner, ledgerName } = params;
  const dirPath = params._splat || "";

  const ledgerId = createLedgerId(ledgerOwner, ledgerName);

  return (
    <div className="flex flex-col h-full space-y-4">
      <LedgerPageSEO seoKey="ledgerFiles" noIndex />
      <div className="flex-1">
        <LedgerDirectoryView ledgerId={ledgerId} currentPath={dirPath} />
      </div>
    </div>
  );
}
