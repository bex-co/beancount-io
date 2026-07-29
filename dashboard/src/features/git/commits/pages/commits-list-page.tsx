import { useParams } from "@tanstack/react-router";
import CommitsSplitView from "../components/commits-split-view";
import { LedgerPageSEO } from "@/common/components/seo/ledger-page-seo";

export default function CommitsListPage() {
  const { ledgerOwner, ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/commits",
  });
  return (
    <>
      <LedgerPageSEO seoKey="ledgerCommits" />
      <CommitsSplitView ledgerId={`${ledgerOwner}/${ledgerName}`} />
    </>
  );
}
