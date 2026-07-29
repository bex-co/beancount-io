import { useState } from "react";
import { useMutation, useApolloClient } from "@apollo/client/react";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  GetLedgerEntryContextDocument,
  DeleteLedgerEntrySourceSliceDocument,
} from "@/graphql/definitions";
import { useApolloCacheClear } from "@/common/hooks/use-apollo-cache";
import { Button } from "@/common/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/common/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import type { BudgetGroup } from "./types";

interface DeleteBudgetDialogProps {
  target: BudgetGroup | null;
  ledgerId: string;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteBudgetDialog({
  target,
  ledgerId,
  onOpenChange,
  onSuccess,
}: DeleteBudgetDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { t } = useTranslations();
  const client = useApolloClient();
  const clearCache = useApolloCacheClear();
  const [deleteMutation] = useMutation(DeleteLedgerEntrySourceSliceDocument);

  const handleDelete = async () => {
    if (!target) return;
    setIsDeleting(true);
    try {
      const { data } = await client.query({
        query: GetLedgerEntryContextDocument,
        variables: { entryHash: target.entry_hash, ledgerId },
        fetchPolicy: "network-only",
      });
      const sha256sum = data?.getLedgerEntryContext?.sha256sum;
      if (!sha256sum) return;

      await deleteMutation({
        variables: {
          ledgerId,
          input: { entryHash: target.entry_hash, sha256sum },
        },
      });
      onOpenChange(false);
      clearCache();
      onSuccess();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog
      open={target !== null}
      onOpenChange={(v) => {
        if (!v && !isDeleting) onOpenChange(v);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("page.budget.budgetDeleteTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {target &&
              t("page.budget.budgetDeleteDescription", {
                interval: target.interval.toLowerCase(),
                amount: target.amount,
                account: target.account,
                date: target.date ?? "",
              })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            {t("common.cancel")}
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t("page.budget.budgetDeleting")}
              </>
            ) : (
              t("common.delete")
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
