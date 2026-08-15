import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { CheckCircle2, Loader2, Receipt, XCircle } from "lucide-react";
import type { ToolUIPart } from "ai";
import type { AgentUITools } from "../../types/agent-tool-types";
import { useTranslations } from "@/common/hooks/use-translations";

type ReceiptInsertToolPart = Extract<
  ToolUIPart<AgentUITools>,
  { type: "tool-insertReceiptTransaction" }
>;

interface ReceiptInsertApprovalProps {
  part: ReceiptInsertToolPart;
  onApprove: (approvalId: string) => void;
  onDeny: (approvalId: string) => void;
}

export function ReceiptInsertApproval({
  part,
  onApprove,
  onDeny,
}: ReceiptInsertApprovalProps) {
  const { t } = useTranslations();
  const isRequested = part.state === "approval-requested";
  const isResponded = part.state === "approval-responded";
  const isDone = part.state === "output-available";
  const isDenied =
    part.state === "output-denied" ||
    (isResponded && "approval" in part && !part.approval.approved);
  const isError = part.state === "output-error";
  const isPending =
    part.state === "input-streaming" || part.state === "input-available";

  if (isPending) {
    return (
      <div className="my-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>{t("aiAgent.receiptApproval.preparing")}</span>
      </div>
    );
  }

  if (isDone) {
    return (
      <div className="my-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
        <CheckCircle2 className="h-3 w-3 text-green-600" />
        <span>{t("aiAgent.receiptApproval.recorded")}</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="my-1.5 flex items-center gap-1.5 text-xs text-red-600">
        <XCircle className="h-3 w-3" />
        <span>
          {"errorText" in part
            ? String(part.errorText)
            : t("aiAgent.receiptApproval.failed")}
        </span>
      </div>
    );
  }

  const input = part.input;
  const approvalId =
    "approval" in part && part.approval ? part.approval.id : "";
  const isApproved =
    isResponded && "approval" in part && part.approval.approved;

  return (
    <div className="my-3 space-y-3 rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 shadow-xs dark:border-amber-800/80 dark:bg-amber-950/20">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Receipt className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span>{t("aiAgent.receiptApproval.title")}</span>
        {(isDenied || isApproved) && (
          <Badge
            variant={isApproved ? "default" : "outline"}
            className="ml-auto"
          >
            {isApproved
              ? t("aiAgent.editApproval.approved")
              : t("aiAgent.editApproval.denied")}
          </Badge>
        )}
        {isApproved && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
      </div>

      {input && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm leading-5">
          <dt className="text-muted-foreground">
            {t("aiAgent.receiptApproval.date")}
          </dt>
          <dd>{input.date ?? new Date().toISOString().slice(0, 10)}</dd>
          <dt className="text-muted-foreground">
            {t("aiAgent.receiptApproval.payee")}
          </dt>
          <dd>{input.payee}</dd>
          <dt className="text-muted-foreground">
            {t("aiAgent.receiptApproval.amount")}
          </dt>
          <dd>
            {input.amount} {input.currency}
          </dd>
          <dt className="text-muted-foreground">
            {t("aiAgent.receiptApproval.expense")}
          </dt>
          <dd className="font-mono">{input.expenseAccount}</dd>
          <dt className="text-muted-foreground">
            {t("aiAgent.receiptApproval.payment")}
          </dt>
          <dd className="font-mono">{input.paymentAccount}</dd>
        </dl>
      )}

      {isDenied && !isResponded && (
        <Badge variant="outline">{t("aiAgent.editApproval.denied")}</Badge>
      )}

      {isRequested && approvalId && (
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={() => onApprove(approvalId)}>
            {t("aiAgent.editApproval.approve")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDeny(approvalId)}
          >
            {t("aiAgent.editApproval.deny")}
          </Button>
        </div>
      )}
    </div>
  );
}
