import { useParams } from "@tanstack/react-router";
import CommitsSplitView from "../components/commits-split-view";

export default function CommitDetailPage() {
  const { ledgerOwner, ledgerName, commitSha } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/commit/$commitSha",
  });
  return (
    <CommitsSplitView
      ledgerId={`${ledgerOwner}/${ledgerName}`}
      selectedCommitSha={commitSha}
    />
  );
}
