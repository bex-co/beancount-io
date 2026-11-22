import type { ReactNode } from "react";
import { cn } from "@/common/lib/utils/utils";

/**
 * The column every ledger page sits in: the full width up to a reading
 * width, then centred, so moving between pages never shifts the title or
 * the edge of the content. The shell gives it the same gutter everywhere.
 * Workspace pages (Monaco editor, commit split-view) opt into `workspace`
 * to claim the full viewport width and internal pane scrolling.
 */
export function LedgerPage({
  variant = "standard",
  className,
  children,
}: {
  variant?: "standard" | "workspace";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        variant === "workspace"
          ? "flex h-full min-h-0 w-full flex-1 flex-col"
          : "mx-auto w-full max-w-[85rem] pb-8",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * How a ledger page opens: its name, then either the ledger context + live
 * metadata ("sample-book · 63 accounts") or a concise description. Actions
 * sit at the end of those two lines on wider screens and wrap cleanly onto
 * their own row on phones so neither the title nor subtitle is squeezed.
 */
export function LedgerPageHeading({
  title,
  context,
  meta,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  /** The ledger's name, as the ledger gives it. */
  context?: string;
  /** What the page holds, once known; left out while it loads. */
  meta?: ReactNode;
  /** Concise subtitle when the page does not use `context · meta`. */
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h1>
        {context ? (
          <p className="mt-0.5 truncate text-sm text-muted-foreground tabular-nums">
            <span dir="auto">{context}</span>
            {meta && <span> · {meta}</span>}
          </p>
        ) : description ? (
          <p className="mt-0.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions}
    </div>
  );
}
