import { useLoaderData, useParams } from "@tanstack/react-router";
import { LedgerPage } from "@/common/components/ledger-page";
import LedgerDirectoryView from "./components/ledger-directory-view";
import { createLedgerId } from "@/common/lib/utils/encode";

export default function LedgerDirectoryPage() {
  const params = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/files/tree/$branch/$",
  });
  const { ledgerOwner, ledgerName } = params;
  const dirPath = params._splat || "";
  const loaded = useLoaderData({
    from: "/ledger/$ledgerOwner/$ledgerName/files/tree/$branch/$",
  });

  const ledgerId = createLedgerId(ledgerOwner, ledgerName);

  return (
    <LedgerPage className="space-y-5 sm:space-y-6">
      <LedgerDirectoryView
        ledgerId={ledgerId}
        currentPath={dirPath}
        initialReadFailed={loaded?.readFailed}
      />
    </LedgerPage>
  );
}
