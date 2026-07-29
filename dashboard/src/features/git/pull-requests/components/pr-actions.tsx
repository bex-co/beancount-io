import { Button } from "@/common/components/ui/button";
import { Check, X } from "lucide-react";
import { useTranslations } from "@/common/hooks/use-translations";

interface PRActionsProps {
  state: string;
  onApprove: () => void;
  onReject: () => void;
  approving: boolean;
  rejecting: boolean;
}

export function PRActions({
  state,
  onApprove,
  onReject,
  approving,
  rejecting,
}: PRActionsProps) {
  const { t } = useTranslations();

  if (state !== "open") {
    return null;
  }

  return (
    <div className="flex justify-end gap-4">
      <Button
        variant="outline"
        onClick={onReject}
        disabled={rejecting || approving}
      >
        <X className="mr-2 h-4 w-4" />
        {t("pullRequests.reject")}
      </Button>
      <Button onClick={onApprove} disabled={approving || rejecting}>
        <Check className="mr-2 h-4 w-4" />
        {t("pullRequests.approve")}
      </Button>
    </div>
  );
}
