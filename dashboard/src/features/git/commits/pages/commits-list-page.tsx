import { useParams } from "@tanstack/react-router";
import CommitsSplitView from "../components/commits-split-view";

export default function CommitsListPage() {
  const { ledgerOwner, ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/commits",
  });
  return <CommitsSplitView ledgerId={`${ledgerOwner}/${ledgerName}`} />;
}
