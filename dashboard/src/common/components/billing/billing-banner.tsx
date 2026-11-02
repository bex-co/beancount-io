import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

/** The strip a billing problem shows across the top of every page. */
export function BillingBanner({
  testId,
  message,
  children,
}: {
  testId: string;
  message: ReactNode;
  /** Its actions, after the message. */
  children: ReactNode;
}) {
  return (
    <div
      role="status"
      data-testid={testId}
      className="flex flex-wrap items-center gap-3 border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm"
    >
      <AlertTriangle
        aria-hidden
        className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400"
      />
      <p className="flex-1">{message}</p>
      {children}
    </div>
  );
}
