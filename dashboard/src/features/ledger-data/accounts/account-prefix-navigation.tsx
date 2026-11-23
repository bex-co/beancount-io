import { Fragment, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/common/lib/utils/utils";

interface AccountPrefixNavigationProps {
  accountName: string;
  isClosed: boolean;
  ledgerOwner: string;
  ledgerName: string;
}

export function AccountPrefixNavigation({
  accountName,
  isClosed,
  ledgerOwner,
  ledgerName,
}: AccountPrefixNavigationProps) {
  const segments = accountName.split(":");
  const [hoveredPrefixIndex, setHoveredPrefixIndex] = useState<number | null>(
    null,
  );
  const [focusedPrefixIndex, setFocusedPrefixIndex] = useState<number | null>(
    null,
  );
  const activePrefixIndex = focusedPrefixIndex ?? hoveredPrefixIndex;

  return (
    // The whole name, always: its last part is what tells two accounts
    // apart, so the name wraps after a colon rather than losing its end.
    // The parent path is quiet and the last part carries the weight; in a
    // narrow list only the last part shows here, the row setting the parent
    // path under it.
    <div
      className="grid max-w-full grid-cols-[minmax(0,1fr)] text-start outline-none"
      title={accountName}
    >
      <div className="flex items-baseline gap-1.5">
        <span
          dir="ltr"
          className="flex min-w-0 flex-wrap items-baseline text-base leading-snug [overflow-wrap:break-word] [unicode-bidi:isolate] sm:text-sm sm:leading-6"
          onMouseLeave={() => setHoveredPrefixIndex(null)}
        >
          {segments.map((segment, index) => {
            const accountPrefix = segments.slice(0, index + 1).join(":");
            const isInActivePrefix =
              activePrefixIndex !== null && index <= activePrefixIndex;
            const isLeaf = index === segments.length - 1;

            return (
              <Fragment key={accountPrefix}>
                <Link
                  to="/ledger/$ledgerOwner/$ledgerName/account/$accountName"
                  params={{
                    ledgerOwner,
                    ledgerName,
                    accountName: accountPrefix,
                  }}
                  className={cn(
                    "min-w-6 cursor-pointer py-0.5 outline-none sm:py-0 transition-colors duration-150 motion-reduce:transition-none focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/50",
                    index === 0 && isInActivePrefix && "rounded-s-sm",
                    index === activePrefixIndex && "rounded-e-sm",
                    isLeaf
                      ? "text-start font-medium @max-lg:basis-full @max-lg:text-base rtl:text-right"
                      : "text-center @max-lg:hidden",
                    // The part a click opens, highlighted in the neutral
                    // hover of every row: green marks choices and money.
                    isInActivePrefix
                      ? "bg-muted text-foreground"
                      : isClosed || !isLeaf
                        ? "text-muted-foreground hover:text-foreground"
                        : "text-foreground hover:text-primary",
                  )}
                  aria-label={accountPrefix}
                  title={accountPrefix}
                  onMouseEnter={() => setHoveredPrefixIndex(index)}
                  onFocus={() => setFocusedPrefixIndex(index)}
                  onBlur={() => setFocusedPrefixIndex(null)}
                  onClick={(event) => event.stopPropagation()}
                >
                  <span dir="auto" className="[unicode-bidi:isolate]">
                    {segment}
                  </span>
                  {!isLeaf && ":"}
                </Link>
                {/* A line may break after each colon, never inside a part. */}
                {!isLeaf && <wbr />}
              </Fragment>
            );
          })}
        </span>
        <ChevronRight className="size-3.5 shrink-0 self-center opacity-0 transition-opacity group-hover:opacity-60 group-focus-within:opacity-60 motion-reduce:transition-none rtl:rotate-180" />
      </div>
    </div>
  );
}
