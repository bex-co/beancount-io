import { useParams } from "@tanstack/react-router";
import CommitsSplitView from "../components/commits-split-view";
import { LedgerPageSEO } from "@/common/components/seo/ledger-page-seo";
import { getLedgerCommitCanonicalUrl } from "@/common/lib/seo/indexability";

export default function CommitDetailPage() {
  const { ledgerOwner, ledgerName, commitSha } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/commit/$commitSha",
  });
  return (
    <>
      <LedgerPageSEO
        seoKey="ledgerCommit"
        params={{ shortSha: commitSha.slice(0, 7) }}
        canonicalUrl={getLedgerCommitCanonicalUrl({
          ledgerOwner,
          ledgerName,
          commitSha,
        })}
      />
      <CommitsSplitView
        ledgerId={`${ledgerOwner}/${ledgerName}`}
        selectedCommitSha={commitSha}
      />
    </>
  );
}
