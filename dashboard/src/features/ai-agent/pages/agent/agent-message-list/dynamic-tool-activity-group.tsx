import { useState, useEffect } from "react";
import { type DynamicToolUIPart } from "ai";
import { cn } from "@/common/lib/utils/utils";
import { Bot, ChevronDown, Loader2 } from "lucide-react";

function DynamicToolStep({ part }: { part: DynamicToolUIPart }) {
  const isDone =
    part.state === "output-available" ||
    part.state === "output-error" ||
    part.state === "output-denied";
  return (
    <div className="my-1 rounded-lg border border-border/60 bg-background px-3 py-2 font-mono text-xs text-muted-foreground">
      <div className="flex items-center gap-1.5">
        {!isDone ? (
          <Loader2 className="h-3 w-3 animate-spin shrink-0" />
        ) : (
          <Bot className="h-3 w-3 text-primary/60 shrink-0" />
        )}
        <code className="truncate">{part.toolName}</code>
      </div>
    </div>
  );
}

export function DynamicToolActivityGroup({
  parts,
}: {
  parts: DynamicToolUIPart[];
}) {
  const hasPending = parts.some(
    (p) =>
      p.state !== "output-available" &&
      p.state !== "output-error" &&
      p.state !== "output-denied",
  );
  const [isOpen, setIsOpen] = useState(hasPending);

  useEffect(() => {
    if (hasPending) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsOpen(true);
    }
  }, [hasPending]);

  const summaryLabel = hasPending
    ? "Running tool"
    : `Used ${parts.length} tool${parts.length > 1 ? "s" : ""}`;

  const preview = parts
    .map((p) => p.toolName)
    .slice(0, 3)
    .join(" • ");

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
          {preview && (
            <div className="truncate text-xs text-muted-foreground">
              {preview}
            </div>
          )}
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
          {parts.map((part, i) => (
            <DynamicToolStep key={i} part={part} />
          ))}
        </div>
      )}
    </div>
  );
}
