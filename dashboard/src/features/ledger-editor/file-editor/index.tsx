import {
  useParams,
  useSearch,
  useNavigate,
  ClientOnly,
} from "@tanstack/react-router";
import { useEffect } from "react";
import LedgerFileView from "./components/ledger-file-view";
import { createLedgerId } from "@/common/lib/utils/encode";
import { LedgerPageSEO } from "@/common/components/seo/ledger-page-seo";

export default function LedgerFilePage() {
  const params = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/files/blob/$branch/$",
  });
  const { ledgerOwner, ledgerName, branch } = params;
  const filePath = params._splat || "";

  const navigate = useNavigate();

  // Redirect to directory view if no file path is provided
  // The blob route should only be used for viewing specific files
  useEffect(() => {
    if (!filePath) {
      void navigate({
        to: "/ledger/$ledgerOwner/$ledgerName/files/tree/$branch/$",
        params: {
          ledgerOwner,
          ledgerName,
          branch: branch || "main",
          _splat: "", // Root directory
        },
        replace: true, // Replace history entry to prevent back button issues
      });
    }
  }, [filePath, navigate, ledgerOwner, ledgerName, branch]);

  const search = useSearch({
    from: "/ledger/$ledgerOwner/$ledgerName/files/blob/$branch/$",
  });

  const ledgerId = createLedgerId(ledgerOwner, ledgerName);

  return (
    <div className="flex flex-col h-full min-h-0">
      <LedgerPageSEO seoKey="ledgerFiles" />
      <ClientOnly>
        <LedgerFileView
          ledgerId={ledgerId}
          filePath={filePath}
          isEditMode={search.editMode}
          lineNumber={search.lineNumber}
        />
      </ClientOnly>
    </div>
  );
}
