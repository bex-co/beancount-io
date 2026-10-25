import { useState, type RefObject } from "react";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { restoreFocusOnDialogClose } from "@/common/lib/focus/restore-focus-on-dialog-close";
import { usePendingAction } from "@/common/hooks/use-pending-action";
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
  returnFocusRef?: RefObject<HTMLElement | null>;
  fallbackFocusRef?: RefObject<HTMLElement | null>;
}

export function CloseAccountDialog({
  open,
  onOpenChange,
  account,
  ledgerId,
  onSuccess,
  returnFocusRef,
  fallbackFocusRef,
}: CloseAccountDialogProps) {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const [error, setError] = useState<string | null>(null);
  const [addEntryClose] = useMutation(BulkEntriesDocument);
  // One in-flight close owns this opening: dismissal waits for it, and its
  // completion cannot land on a later account's confirmation (w4/1085).
  const { run, pending } = usePendingAction();

  // The offered date is snapshotted when this confirmation opens, so the
  // busy text and the prepared request always name the same day even if
  // the clock rolls over while the request is in flight (w4/1084). A
  // failed attempt refreshes the offer for the next one (below).
  const today = () => format(new Date(), "yyyy-MM-dd");
  const openKey = open && account ? account.entryHash : null;
  const [offered, setOffered] = useState<{ key: string; date: string } | null>(
    null,
  );
  if (openKey !== (offered?.key ?? null)) {
    setOffered(openKey ? { key: openKey, date: today() } : null);
  }
  const closeDate = offered?.date ?? today();

  const handleOpenChange = (v: boolean) => {
    if (!v && pending) return;
    if (!v) setError(null);
    onOpenChange(v);
  };

  const doConfirm = async (): Promise<boolean | void> => {
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
        toast.success(
          t("page.accounts.accountClosedToast", { account: account.account }),
        );
        onSuccess();
        handleOpenChange(false);
        return true;
      } else {
        setError(result.data?.bulkEntries.message ?? formatError(undefined));
        if (openKey) setOffered({ key: openKey, date: today() });
      }
    } catch (err) {
      setError(formatError(err));
      if (openKey) setOffered({ key: openKey, date: today() });
    }
    return undefined;
  };

  const handleConfirm = () => {
    void run(doConfirm);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        busy={pending}
        className="sm:max-w-[440px]"
        onCloseAutoFocus={(event) => {
          restoreFocusOnDialogClose(
            event,
            returnFocusRef?.current,
            fallbackFocusRef?.current,
          );
        }}
      >
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
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => handleOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={handleConfirm} loading={pending}>
            {t("page.accounts.closeAccount")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
