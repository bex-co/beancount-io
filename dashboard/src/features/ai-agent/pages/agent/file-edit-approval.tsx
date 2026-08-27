import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { useTranslations } from "@/common/hooks/use-translations";
import { CheckCircle2, FileEdit, Loader2, XCircle } from "lucide-react";
import type { ToolUIPart } from "ai";
import type {
  AgentUITools,
  AgentToolInputs,
} from "../../types/agent-tool-types";

type EditFilesToolPart = Extract<
  ToolUIPart<AgentUITools>,
  { type: "tool-editLedgerFiles" }
>;

type FileOp = AgentToolInputs["editLedgerFiles"]["files"][number];

function EditDiffBlock({ op }: { op: FileOp }) {
  const { t } = useTranslations();

  let headerLabel: React.ReactNode;
  if (op.operation === "create") {
    headerLabel = (
      <span className="text-green-700 dark:text-green-400">
        {t("aiAgent.editApproval.newFile")}: {op.path}
      </span>
    );
  } else if (op.operation === "replace") {
    headerLabel = (
      <span className="text-amber-700 dark:text-amber-400">
        {t("aiAgent.editApproval.replaceFile")}: {op.path}
      </span>
    );
  } else if (op.operation === "delete") {
    headerLabel = (
      <span className="text-red-700 dark:text-red-400">
        {t("aiAgent.editApproval.deleteFile")}: {op.path}
      </span>
    );
  } else {
    headerLabel = op.path;
  }

  let rows: React.ReactNode = null;
  if (op.operation === "update") {
    const oldLines = op.old_string.split("\n");
    const newLines = op.new_string.split("\n");
    rows = (
      <>
        {oldLines.map((line, i) => (
          <div
            key={`old-${i}`}
            className="px-3 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300 whitespace-pre"
          >
            {"− " + line}
          </div>
        ))}
        {newLines.map((line, i) => (
          <div
            key={`new-${i}`}
            className="px-3 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300 whitespace-pre"
          >
            {"+ " + line}
          </div>
        ))}
      </>
    );
  } else if (op.operation === "create" || op.operation === "replace") {
    rows = op.content.split("\n").map((line, i) => (
      <div
        key={i}
        className="px-3 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300 whitespace-pre"
      >
        {"+ " + line}
      </div>
    ));
  }

  return (
    <div className="max-h-56 overflow-auto rounded-lg border border-border font-mono text-xs">
      <div className="truncate border-b bg-muted/60 px-3 py-1.5 text-muted-foreground">
        {headerLabel}
      </div>
      {rows}
    </div>
  );
}

interface FileEditApprovalProps {
  part: EditFilesToolPart;
  onApprove: (approvalId: string) => void;
  onDeny: (approvalId: string) => void;
}

export function FileEditApproval({
  part,
  onApprove,
  onDeny,
}: FileEditApprovalProps) {
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
        <span>{t("aiAgent.editApproval.preparingChanges")}</span>
      </div>
    );
  }

  if (isDone) {
    return (
      <div className="my-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
        <CheckCircle2 className="h-3 w-3 text-green-600" />
        <span>
          {part.output != null
            ? part.output.ok
              ? t("aiAgent.editApproval.appliedOperations", {
                  count: part.output.result.count,
                })
              : part.output.error
            : t("aiAgent.editApproval.approved")}
        </span>
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
            : t("aiAgent.editApproval.failed")}
        </span>
      </div>
    );
  }

  const input = part.input;
  const approvalId =
    "approval" in part && part.approval ? part.approval.id : "";

  return (
    <div className="my-3 space-y-3 rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 shadow-xs dark:border-amber-800/80 dark:bg-amber-950/20">
      <div className="flex items-center gap-2 text-sm font-medium">
        <FileEdit className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span>{t("aiAgent.editApproval.title")}</span>
        {(isDenied ||
          (isResponded && "approval" in part && part.approval.approved)) && (
          <Badge
            variant={
              isResponded && "approval" in part && part.approval.approved
                ? "default"
                : "outline"
            }
            className="ml-auto"
          >
            {isResponded && "approval" in part && part.approval.approved
              ? t("aiAgent.editApproval.approved")
              : t("aiAgent.editApproval.denied")}
          </Badge>
        )}
        {isResponded && "approval" in part && part.approval.approved && (
          <Loader2 className="h-3 w-3 animate-spin ml-1" />
        )}
      </div>

      {input && (
        <>
          <p className="text-sm leading-5 text-muted-foreground">
            {input.description}
          </p>
          <div className="space-y-2">
            {input.files.map((op, i) => (
              <EditDiffBlock key={i} op={op} />
            ))}
          </div>
        </>
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
