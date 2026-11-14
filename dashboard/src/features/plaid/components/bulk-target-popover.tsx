import { useId, useState } from "react";
import { ListChecks } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Checkbox } from "@/common/components/ui/checkbox";
import { Label } from "@/common/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/common/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/common/components/ui/tooltip";
import { AccountCombobox } from "@/common/components/ledger-comboboxes";
import { useToast } from "@/common/hooks/use-toast";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  applyTargetAccount,
  countSelectedWithTarget,
} from "../utils/apply-target-account";

interface BulkTargetPopoverProps {
  ledgerId: string;
  /** Every selected row, including rows the current filters hide: Submit acts
   * on all of them, so this does too. */
  selectedIds: ReadonlySet<string>;
  targetAccounts: ReadonlyMap<string, string>;
  /** How many selected rows the filters hide, so the panel can say they are
   * set too. */
  hiddenSelectedCount: number;
  onApply: (targets: Map<string, string>) => void;
}

/**
 * "Set for selected": gives every selected Bank Sync row the same target
 * account. The per-row pickers stay editable afterwards.
 */
export function BulkTargetPopover({
  ledgerId,
  selectedIds,
  targetAccounts,
  hiddenSelectedCount,
  onApply,
}: BulkTargetPopoverProps) {
  const { t } = useTranslations();
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const reasonId = useId();
  const nothingSelected = selectedIds.size === 0;
  const reason = t("plaid.transactionReview.setForSelectedNoSelection");

  const trigger = (
    <PopoverTrigger asChild>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        disabled={nothingSelected}
        aria-describedby={nothingSelected ? reasonId : undefined}
      >
        <ListChecks className="me-1 h-3 w-3" />
        {t("plaid.transactionReview.setForSelected")}
      </Button>
    </PopoverTrigger>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {nothingSelected ? (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              {/* A disabled button takes no pointer events, so the wrapper is
                  what keeps the tooltip reachable. */}
              <span className="inline-flex">{trigger}</span>
            </TooltipTrigger>
            <TooltipContent>{reason}</TooltipContent>
          </Tooltip>
          {/* `hidden`, not `sr-only`: aria-describedby still reads it, and it
              stays out of the column header's own text. */}
          <span id={reasonId} hidden>
            {reason}
          </span>
        </>
      ) : (
        trigger
      )}
      {/* Closed content is unmounted, so the form starts fresh on every open. */}
      <PopoverContent
        align="end"
        className="w-80 space-y-3"
        aria-labelledby={titleId}
      >
        <BulkTargetForm
          ledgerId={ledgerId}
          selectedIds={selectedIds}
          targetAccounts={targetAccounts}
          hiddenSelectedCount={hiddenSelectedCount}
          titleId={titleId}
          onApply={onApply}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}

interface BulkTargetFormProps extends BulkTargetPopoverProps {
  titleId: string;
  onClose: () => void;
}

function BulkTargetForm({
  ledgerId,
  selectedIds,
  targetAccounts,
  hiddenSelectedCount,
  titleId,
  onApply,
  onClose,
}: BulkTargetFormProps) {
  const { t } = useTranslations();
  const { toast } = useToast();
  const replaceId = useId();
  const [account, setAccount] = useState("");
  const [replace, setReplace] = useState(false);

  // What the panel promises and what Apply does come from this one call, so
  // the two cannot disagree.
  const preview = applyTargetAccount(
    selectedIds,
    targetAccounts,
    account,
    replace ? "overwrite" : "fill-blank",
  );
  const selectedWithTarget = countSelectedWithTarget(
    selectedIds,
    targetAccounts,
  );

  const apply = () => {
    onApply(preview.targets);
    onClose();
    toast({
      title: t("plaid.transactionReview.toast.targetAccountSet"),
      description: t(
        "plaid.transactionReview.toast.targetAccountSetDescription",
        { count: preview.applied, account },
      ),
    });
  };

  return (
    <>
      <p id={titleId} className="text-sm font-medium">
        {t("plaid.transactionReview.bulkTitle", { count: selectedIds.size })}
      </p>
      {hiddenSelectedCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("plaid.transactionReview.bulkHiddenNote", {
            count: hiddenSelectedCount,
          })}
        </p>
      )}
      <AccountCombobox
        ledgerId={ledgerId}
        value={account}
        onValueChange={setAccount}
        placeholder={t("plaid.transactionReview.selectAccountPlaceholder")}
      />
      <div className="flex items-center gap-2">
        <Checkbox
          id={replaceId}
          checked={replace}
          onCheckedChange={(checked) => setReplace(checked === true)}
          disabled={selectedWithTarget === 0}
        />
        <Label htmlFor={replaceId}>
          {t("plaid.transactionReview.bulkReplaceExisting", {
            count: selectedWithTarget,
          })}
        </Label>
      </div>
      {account !== "" && (
        <p className="text-xs text-muted-foreground" role="status">
          {t("plaid.transactionReview.bulkWillSet", {
            count: preview.applied,
          })}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button size="sm" onClick={apply} disabled={preview.applied === 0}>
          {t("plaid.transactionReview.bulkApply")}
        </Button>
      </div>
    </>
  );
}
