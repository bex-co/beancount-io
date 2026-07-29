import { XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";

export function CancelSubscriptionDialog({
  open,
  onOpenChange,
  selectedSubscription,
  cancelLoading,
  t,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSubscription: {
    id: string;
    clientId: string;
    endDate: string;
  } | null;
  cancelLoading: boolean;
  t: (key: string) => string;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            {t("userSettings.cancelSubscriptionTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("userSettings.cancelSubscriptionDescription")}
            {selectedSubscription?.endDate && (
              <span className="block mt-2 text-sm font-medium text-foreground">
                {t("userSettings.accessUntil")}{" "}
                <strong>{selectedSubscription.endDate}</strong>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={cancelLoading}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={cancelLoading}
          >
            {cancelLoading
              ? t("userSettings.canceling")
              : t("userSettings.confirmCancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ResumeSubscriptionDialog({
  open,
  onOpenChange,
  selectedSubscription,
  resumeLoading,
  t,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSubscription: {
    id: string;
    clientId: string;
    renewalDate: string;
  } | null;
  resumeLoading: boolean;
  t: (key: string) => string;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            {t("userSettings.resumeSubscriptionTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("userSettings.resumeSubscriptionDescription")}
            {selectedSubscription?.renewalDate && (
              <span className="block mt-2 text-sm font-medium text-foreground">
                {t("userSettings.renewsOn")}{" "}
                <strong>{selectedSubscription.renewalDate}</strong>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={resumeLoading}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={onConfirm} disabled={resumeLoading}>
            {resumeLoading
              ? t("userSettings.resuming")
              : t("userSettings.confirmResume")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
