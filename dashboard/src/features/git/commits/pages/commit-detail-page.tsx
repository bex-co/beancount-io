import { useParams } from "@tanstack/react-router";
import CommitsSplitView from "../components/commits-split-view";
import { LedgerPageSEO } from "@/common/components/seo/ledger-page-seo";

export default function CommitDetailPage() {
  const { ledgerOwner, ledgerName, commitSha } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/commit/$commitSha",
  });
  return (
    <>
      <LedgerPageSEO
        seoKey="ledgerCommit"
        params={{ shortSha: commitSha.slice(0, 7) }}
      />
      <CommitsSplitView
        ledgerId={`${ledgerOwner}/${ledgerName}`}
        selectedCommitSha={commitSha}
      />
    </>
  );
}
