import { cn } from "@/common/lib/utils/utils";

/**
 * An account on one line, as the ledger names it: the path muted, the last
 * segment — the one that tells two rows apart — in the foreground. Every
 * ledger page writes an account this way (Overview, Journal, Accounts). It is the
 * name a reader types into the Account filter and searches the journal for,
 * and its root says whether a row is owed (Liabilities:…). Where the line is
 * too narrow the path gives way first (`Expenses:Taxes:Y20…:Federal`); the
 * last segment stays whole.
 */
export function AccountName({
  account,
  className,
  title,
}: {
  account: string;
  className?: string;
  /** The whole name on hover, where nothing around it already says it. */
  title?: string;
}) {
  const cut = account.lastIndexOf(":");
  const path = cut > 0 ? account.slice(0, cut) : "";
  const leaf = account.slice(cut + 1);
  return (
    <span title={title} className={cn("block min-w-0 text-sm", className)}>
      {/* Read as one name: the split is only typographic. */}
      <span className="sr-only">{account}</span>
      <span aria-hidden="true" className="flex min-w-0">
        {path && (
          <span className="min-w-0 truncate text-muted-foreground">{path}</span>
        )}
        <span className="max-w-full shrink-0 truncate">
          {path && <span className="text-muted-foreground">:</span>}
          <span className="font-medium text-foreground">{leaf}</span>
        </span>
      </span>
    </span>
  );
}
