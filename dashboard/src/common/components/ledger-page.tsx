import type { ReactNode } from "react";
import { cn } from "@/common/lib/utils/utils";

/**
 * The column every ledger page sits in: the full width up to a reading
 * width, then centred, so moving between pages never shifts the title or
 * the edge of the content. The shell gives it the same gutter everywhere.
 */
export function LedgerPage({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[85rem]", className)}>
      {children}
    </div>
  );
}

/**
 * How a ledger page opens: its name, then the ledger it belongs to and what
 * it holds ("public-demo · 63 accounts"). The actions sit at the end of
 * those two lines; on a phone they take a row of their own under them, so
 * neither the title nor the subtitle is squeezed beside them.
 */
export function LedgerPageHeading({
  title,
  context,
  meta,
  actions,
}: {
  title: ReactNode;
  /** The ledger's name, as the ledger gives it. */
  context: string;
  /** What the page holds, once known; left out while it loads. */
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-0.5 truncate text-sm text-muted-foreground tabular-nums">
          <span dir="auto">{context}</span>
          {meta && <span> · {meta}</span>}
        </p>
      </div>
      {actions}
    </div>
  );
}
