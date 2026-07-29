import { useState } from "react";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { useMutation } from "@apollo/client/react";
import { format } from "date-fns";
import { BulkEntriesDocument, LedgerEntryType } from "@/graphql/definitions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/common/components/ui/dialog";
import { Button } from "@/common/components/ui/button";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { X } from "lucide-react";
import { toast } from "sonner";
import type { AccountDirective } from "./types";

interface CloseAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: AccountDirective | null;
  ledgerId: string;
  onSuccess: () => void;
}

export function CloseAccountDialog({
  open,
  onOpenChange,
  account,
  ledgerId,
  onSuccess,
}: CloseAccountDialogProps) {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const [error, setError] = useState<string | null>(null);
  const [addEntryClose, { loading }] = useMutation(BulkEntriesDocument);

  const closeDate = format(new Date(), "yyyy-MM-dd");

  const handleOpenChange = (v: boolean) => {
    if (!v) setError(null);
    onOpenChange(v);
  };

  const handleConfirm = async () => {
    if (!account) return;
    setError(null);
    try {
      const result = await addEntryClose({
        variables: {
          ledgerId,
          entries: [
            {
              type: LedgerEntryType.Close,
              close: { account: account.account, date: closeDate },
            },
          ],
        },
      });
      if (result.data?.bulkEntries.success) {
        toast.success(`Account ${account.account} closed`);
        onSuccess();
        handleOpenChange(false);
      } else {
        setError(result.data?.bulkEntries.message ?? formatError(undefined));
      }
    } catch (err) {
      setError(formatError(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <X className="h-4 w-4" />
            {t("page.accounts.closeAccount")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            {t("page.accounts.closeAccountDescription", {
              account: account?.account ?? "",
              date: closeDate,
            })}
          </p>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleConfirm} loading={loading}>
            {t("page.accounts.closeAccount")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
