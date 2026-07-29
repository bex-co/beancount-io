import { useState } from "react";
import { type ToolUIPart } from "ai";
import { cn } from "@/common/lib/utils/utils";
import {
  Bot,
  ChevronDown,
  Database,
  FileText,
  FolderOpen,
  Loader2,
} from "lucide-react";
import type { AgentUITools } from "../../../types/agent-tool-types";

type AgentToolPart = ToolUIPart<AgentUITools>;

function FileToolStep({ part }: { part: AgentToolPart }) {
  const isPending = part.state !== "output-available";
  const isListing = part.type === "tool-listLedgerFiles";
  const label = isListing
    ? part.state !== "input-streaming"
      ? String(part.input?.dir_path ?? "/")
      : "/"
    : part.type === "tool-readLedgerFiles" && part.state !== "input-streaming"
      ? String(part.input?.files?.[0]?.path ?? "")
      : "";
  const Icon = isListing ? FolderOpen : FileText;

  return (
    <div className="my-1 rounded-lg border border-border/60 bg-background px-3 py-2 font-mono text-xs text-muted-foreground">
      <div className="flex items-center gap-1.5">
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin shrink-0" />
        ) : (
          <Icon className="h-3 w-3 text-primary/60 shrink-0" />
        )}
        <span className="font-semibold">{isListing ? "List" : "Read"}</span>
        <code className="truncate">{label}</code>
      </div>
    </div>
  );
}

function BqlToolStep({ part }: { part: AgentToolPart }) {
  const isPending = part.state !== "output-available";
  const query =
    part.type === "tool-runBqlQuery" && part.state !== "input-streaming"
      ? String(part.input?.query ?? "")
      : "";

  return (
    <div className="my-1 rounded-lg border border-border/60 bg-background px-3 py-2 font-mono text-xs text-muted-foreground">
      <div className="flex items-center gap-1.5">
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin shrink-0" />
        ) : (
          <Database className="h-3 w-3 text-primary/60 shrink-0" />
        )}
        <span className="font-semibold">BQL</span>
        {query && <code className="truncate">{query}</code>}
      </div>
    </div>
  );
}

export function ToolActivityGroup({ parts }: { parts: AgentToolPart[] }) {
  const hasPending = parts.some((part) => part.state !== "output-available");
  const [isOpen, setIsOpen] = useState(false);

  const listCount = parts.filter(
    (p) => p.type === "tool-listLedgerFiles",
  ).length;
  const readCount = parts.filter(
    (p) => p.type === "tool-readLedgerFiles",
  ).length;
  const queryCount = parts.filter((p) => p.type === "tool-runBqlQuery").length;

  const summaryLabel = hasPending
    ? "Checking ledger context"
    : readCount > 0 || listCount > 0
      ? `Checked ${readCount + listCount} file${readCount + listCount > 1 ? "s" : ""}`
      : queryCount > 0
        ? `Ran ${queryCount} quer${queryCount > 1 ? "ies" : "y"}`
        : `Used ${parts.length} tool${parts.length > 1 ? "s" : ""}`;

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-border/70 bg-muted/20">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
      >
        {hasPending ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <Bot className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-foreground/90">
            {summaryLabel}
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <div className="border-t border-border/50 px-3 py-2">
          {parts.map((part, partIndex) => {
            if (
              part.type === "tool-readLedgerFiles" ||
              part.type === "tool-listLedgerFiles"
            ) {
              return <FileToolStep key={partIndex} part={part} />;
            }

            return <BqlToolStep key={partIndex} part={part} />;
          })}
        </div>
      )}
    </div>
  );
}
