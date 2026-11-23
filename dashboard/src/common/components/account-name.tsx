import { Fragment } from "react";
import { hasRtlLetters } from "@/common/lib/bidi/rtl-source";
import { cn } from "@/common/lib/utils/utils";

/** A root-first account path whose segments each read in their own direction. */
export function AccountPath({
  account,
  className,
}: {
  account: string;
  className?: string;
}) {
  const isolateSegments = hasRtlLetters(account);
  return (
    <span dir="ltr" className={cn("[unicode-bidi:isolate]", className)}>
      {account.split(":").map((segment, index) => (
        <Fragment key={index}>
          {index > 0 && (
            <>
              :<wbr />
            </>
          )}
          {isolateSegments ? (
            <span dir="auto" className="[unicode-bidi:isolate]">
              {segment}
            </span>
          ) : (
            segment
          )}
        </Fragment>
      ))}
    </span>
  );
}

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
    <span
      title={title}
      className={cn("block min-w-0 text-start text-sm", className)}
    >
      {/* Read as one name: the split is only typographic. */}
      <span className="sr-only">{account}</span>
      {/* An inline box stays at the surrounding cell's reading edge. */}
      <span
        aria-hidden="true"
        dir="ltr"
        className="inline-flex max-w-full min-w-0 align-top [unicode-bidi:isolate]"
      >
        {path && (
          <AccountPath
            account={path}
            className="min-w-0 truncate text-muted-foreground"
          />
        )}
        <span className="max-w-full shrink-0 truncate">
          {path && <span className="text-muted-foreground">:</span>}
          <span
            dir="auto"
            className="font-medium text-foreground [unicode-bidi:isolate]"
          >
            {leaf}
          </span>
        </span>
      </span>
    </span>
  );
}
