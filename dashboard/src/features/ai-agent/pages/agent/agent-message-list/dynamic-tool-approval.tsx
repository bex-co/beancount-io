import { type DynamicToolUIPart } from "ai";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { Bot, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useTranslations } from "@/common/hooks/use-translations";

export function DynamicToolApproval({
  part,
  onApprove,
  onDeny,
}: {
  part: DynamicToolUIPart;
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
}) {
  const { t } = useTranslations();
  if (part.state === "input-streaming" || part.state === "input-available") {
    return (
      <div className="my-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>{t("aiAgent.preparing")}</span>
      </div>
    );
  }

  if (part.state === "output-available") {
    return (
      <div className="my-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
        <CheckCircle2 className="h-3 w-3 text-green-600" />
        <span>{part.toolName}</span>
      </div>
    );
  }

  if (part.state === "output-error") {
    return (
      <div className="my-1.5 flex items-center gap-1.5 text-xs text-red-600">
        <XCircle className="h-3 w-3" />
        <span>
          {part.errorText || t("aiAgent.toolFailed", { tool: part.toolName })}
        </span>
      </div>
    );
  }

  // Remaining states: approval-requested, approval-responded, output-denied
  const approvalId = part.approval.id;
  const isApproved =
    part.state === "approval-responded" && part.approval.approved;
  const isDenied =
    part.state === "output-denied" ||
    (part.state === "approval-responded" && !part.approval.approved);

  return (
    <div className="my-3 space-y-3 rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 shadow-xs dark:border-amber-800/80 dark:bg-amber-950/20">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Bot className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="font-mono text-xs">{part.toolName}</span>
        {(isApproved || isDenied) && (
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

      {part.state === "output-denied" && (
        <Badge variant="outline">{t("aiAgent.editApproval.denied")}</Badge>
      )}

      {part.state === "approval-requested" && (
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
