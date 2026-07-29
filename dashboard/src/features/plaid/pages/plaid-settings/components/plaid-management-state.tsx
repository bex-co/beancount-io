import { Loader2, RefreshCw, Settings } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/common/components/ui/button";
import { useTranslations } from "@/common/hooks/use-translations";
import { useToast } from "@/common/hooks/use-toast";
import {
  usePlaidItems,
  useUnsyncedTransactions,
  useSyncAllTransactions,
} from "../../../hooks/use-plaid-accounts";
import { TransactionReviewTable } from "../../../components/transaction-review-table";
import { useState } from "react";
import type { PlaidItem } from "../../../types";
import { decodeLedgerId } from "@/common/lib/utils/encode";

interface PlaidManagementStateProps {
  items: PlaidItem[];
  ledgerId: string;
}

export function PlaidManagementState({
  items,
  ledgerId,
}: PlaidManagementStateProps) {
  const { t } = useTranslations();
  const { toast } = useToast();
  const { refetch: refetchItems } = usePlaidItems(ledgerId);
  const { refetch: refetchTransactions } = useUnsyncedTransactions(ledgerId);
  const { syncAllTransactions, loading: syncing } = useSyncAllTransactions();
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const { ledgerOwner, ledgerName } = decodeLedgerId(ledgerId);

  const handleSyncAll = async () => {
    try {
      setIsSyncingAll(true);
      const { transactionsAdded, institutionsSynced, skippedCount } =
        await syncAllTransactions(ledgerId, items);
      await Promise.all([refetchItems(), refetchTransactions()]);
      toast({
        title: t("plaid.management.toast.syncAllComplete"),
        description: t("plaid.management.toast.syncAllCompleteDescription", {
          count: transactionsAdded,
          institutionCount: institutionsSynced,
        }),
      });
      if (skippedCount > 0) {
        toast({
          title: t("plaid.management.toast.syncAllSkipped", {
            count: skippedCount,
          }),
          description: t("plaid.management.manageBanks"),
        });
      }
    } catch {
      toast({
        title: t("plaid.management.toast.error"),
        description: t("plaid.management.toast.syncAllFailedDescription"),
        variant: "destructive",
      });
    } finally {
      setIsSyncingAll(false);
    }
  };

  return (
    <div className="container mx-auto space-y-4 pb-4">
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => void handleSyncAll()}
          disabled={isSyncingAll || syncing || items.length === 0}
        >
          {isSyncingAll || syncing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("plaid.management.syncing")}
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              {t("plaid.management.sync")}
            </>
          )}
        </Button>
        <Link
          to="/ledger/$ledgerOwner/$ledgerName/plaid-connections"
          params={{ ledgerOwner, ledgerName }}
        >
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
            {t("plaid.management.manageBanks")}
          </Button>
        </Link>
      </div>

      <TransactionReviewTable ledgerId={ledgerId} />
    </div>
  );
}
